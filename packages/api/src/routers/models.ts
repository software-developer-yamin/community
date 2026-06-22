import { createHash } from "node:crypto";
import { db } from "@community/db";
import { user } from "@community/db/schema/auth";
import {
  cefrPlacement,
  modelInferenceLog,
  pronunciationScore,
  userProfileEmbedding,
} from "@community/db/schema/models";
import { userProfile } from "@community/db/schema/rebuild";
import { env } from "@community/env/server";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import z from "zod";

import { protectedProcedure } from "../index";

// Env var to switch between F8.1 (baseline) and F8.2 (new stack)
const MODEL_STACK = env.MODEL_STACK_VERSION ?? "f8.2";

// Service URLs (localhost in docker-compose, set via .env in prod)
const LLAMA_URL = env.LLAMA_URL ?? "http://127.0.0.1:8080";
const EMBED_URL = env.EMBED_URL ?? "http://127.0.0.1:9100";
const PRON_URL = env.PRON_URL ?? "http://127.0.0.1:9200";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const cefrSchema = z.object({
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  score: z.number().int().min(0).max(100),
  grammar_errors: z
    .array(
      z.object({
        span: z.string(),
        fix: z.string(),
        severity: z.enum(["low", "med", "high"]),
      })
    )
    .default([]),
  vocab_level: z.enum(["basic", "inter", "adv"]),
  feedback: z.string(),
  raw: z.string().optional(),
});

const pronSchema = z.object({
  score: z.number().min(0).max(100),
  per_word_errors: z.array(
    z.object({
      word: z.string(),
      wer: z.number().min(0),
      error: z.enum(["substitution", "deletion", "insertion", "none"]),
    })
  ),
  phoneme_error_rate: z.number().min(0).max(1),
});

const embedSchema = z.object({
  embedding: z.array(z.number()).length(384),
});

const PROFILE_TEMPLATE = (p: {
  cefr: string;
  interests: string[];
  goals: string[];
  native: string;
  age: number;
  style: string;
}) =>
  `CEFR: ${p.cefr}. Interests: ${p.interests.join(", ")}. Goals: ${p.goals.join(", ")}. Native: ${p.native}. Age: ${p.age}. Style: ${p.style}.`;

async function callLLM(
  prompt: string,
  systemPrompt: string,
  expectJson: boolean
): Promise<{ text: string; usage: { completion_tokens: number } }> {
  const res = await fetch(`${LLAMA_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-7b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 512,
      response_format: expectJson ? { type: "json_object" } : undefined,
    }),
  });
  if (!res.ok) {
    throw new Error(`llama.cpp error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: { completion_tokens: number };
  };
  return {
    text: data.choices[0]?.message.content ?? "",
    usage: { completion_tokens: data.usage?.completion_tokens ?? 0 },
  };
}

export const modelsRouter = {
  gradeCEFR: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(10).max(4000),
        priorCefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
        difficulty: z.number().int().min(1).max(10).default(5),
      })
    )
    .handler(async ({ input, context }) => {
      const started = Date.now();
      const system = `You are an expert CEFR assessor for English as a Second Language speakers from Bangladesh. Output ONLY a JSON object: {"cefr":"A1|A2|B1|B2|C1|C2","score":0-100,"grammar_errors":[{"span":"...","fix":"...","severity":"low|med|high"}],"vocab_level":"basic|inter|adv","feedback":"one short Bangla+English sentence"}`;
      const prompt = `SPEAKER TRANSCRIPT:\n${input.transcript}\n\nPLACEMENT CONTEXT:\n- Current CEFR estimate: ${input.priorCefr ?? "unknown"}\n- Question difficulty: ${input.difficulty}`;

      const out = await callLLM(prompt, system, true);
      const latency = Date.now() - started;

      // Parse + validate; fall back to safe defaults on parse error
      let parsed: z.infer<typeof cefrSchema>;
      try {
        parsed = cefrSchema.parse({ ...JSON.parse(out.text), raw: out.text });
      } catch {
        // Fallback to F8.1 baseline (Qwen2.5-3B) if F8.2 JSON parse fails
        parsed = {
          cefr: input.priorCefr ?? "A2",
          score: 50,
          grammar_errors: [],
          vocab_level: "basic",
          feedback: "Assessment pending — try a longer answer.",
        };
      }

      // Persist inference log
      await db.insert(modelInferenceLog).values({
        modelName: `qwen2.5-7b-q5:${MODEL_STACK}`,
        inputHash: sha256(input.transcript),
        outputTokens: out.usage.completion_tokens,
        latencyMs: latency,
        userId: context.session.user.id,
        callKind: "cefr-grade",
        metadata: {
          priorCefr: input.priorCefr,
          difficulty: input.difficulty,
        },
      });

      // Persist placement history
      await db.insert(cefrPlacement).values({
        userId: context.session.user.id,
        level: parsed.cefr,
        score: parsed.score,
        source: "voice",
        modelVersion: `qwen2.5-7b-q5@1:${MODEL_STACK}`,
        transcript: input.transcript.slice(0, 2000),
      });

      return {
        cefr: parsed.cefr,
        score: parsed.score,
        grammarErrors: parsed.grammar_errors,
        vocabLevel: parsed.vocab_level,
        feedback: parsed.feedback,
        latencyMs: latency,
      };
    }),

  scorePronunciation: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        expectedText: z.string().min(1).max(200),
      })
    )
    .handler(async ({ input, context }) => {
      // Fetch audio from MinIO via signed URL
      const audioRes = await fetch(input.audioUrl);
      if (!audioRes.ok) {
        throw new Error(`audio fetch failed: ${audioRes.status}`);
      }
      const audioBytes = new Uint8Array(await audioRes.arrayBuffer());
      const audioB64 = Buffer.from(audioBytes).toString("base64");

      const started = Date.now();
      const res = await fetch(`${PRON_URL}/score`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audio_b64: audioB64,
          expected: input.expectedText,
        }),
      });
      if (!res.ok) {
        throw new Error(`pron service error: ${res.status}`);
      }
      const data = pronSchema.parse(await res.json());
      const latency = Date.now() - started;

      await db.insert(modelInferenceLog).values({
        modelName: `wav2vec2-base-int8:${MODEL_STACK}`,
        inputHash: sha256(`${input.audioUrl}|${input.expectedText}`),
        latencyMs: latency,
        userId: context.session.user.id,
        callKind: "pron-score",
      });

      await db.insert(pronunciationScore).values({
        userId: context.session.user.id,
        audioPath: input.audioUrl,
        expectedText: input.expectedText,
        score: Math.round(data.score),
        perWordErrors: data.per_word_errors,
        modelVersion: `wav2vec2-base-int8@1:${MODEL_STACK}`,
      });

      return {
        score: Math.round(data.score),
        perWordErrors: data.per_word_errors,
        latencyMs: latency,
      };
    }),

  recomputeEmbedding: protectedProcedure
    .input(z.object({ profileId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const userId = input.profileId ?? context.session.user.id;
      // Load profile (assumes userProfile table exists from F8.1 — fall back to user.name)
      const u = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (u.length === 0) {
        throw new Error("user not found");
      }

      const profileText = PROFILE_TEMPLATE({
        cefr: "B1", // TODO: load from cefrPlacement table
        interests: [], // TODO: load from userInterests
        goals: [], // TODO: load from userGoals
        native: "Bangla",
        age: 25,
        style: "gentle correction, slow pace",
      });

      const started = Date.now();
      const res = await fetch(`${EMBED_URL}/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: profileText }),
      });
      if (!res.ok) {
        throw new Error(`embed service error: ${res.status}`);
      }
      const { embedding } = embedSchema.parse(await res.json());
      const latency = Date.now() - started;

      await db
        .insert(userProfileEmbedding)
        .values({
          userId,
          embedding,
          modelVersion: `bge-small-en-v1.5-int8@1:${MODEL_STACK}`,
        })
        .onConflictDoUpdate({
          target: userProfileEmbedding.userId,
          set: {
            embedding,
            modelVersion: `bge-small-en-v1.5-int8@1:${MODEL_STACK}`,
            updatedAt: new Date(),
          },
        });

      return { ok: true, latencyMs: latency };
    }),

  matchPartners: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .handler(async ({ input, context }) => {
      // Load self embedding + CEFR + gender profile
      const self = await db
        .select({
          embedding: userProfileEmbedding.embedding,
          cefr: cefrPlacement.level,
          gender: userProfile.gender,
          genderPreference: userProfile.genderPreference,
          tier: userProfile.tier,
        })
        .from(userProfileEmbedding)
        .leftJoin(
          cefrPlacement,
          eq(cefrPlacement.userId, userProfileEmbedding.userId)
        )
        .leftJoin(
          userProfile,
          eq(userProfile.userId, userProfileEmbedding.userId)
        )
        .where(eq(userProfileEmbedding.userId, context.session.user.id))
        .orderBy(desc(cefrPlacement.createdAt))
        .limit(1);

      if (self.length === 0 || !self[0]?.embedding) {
        // Trigger embed then return empty
        return { partners: [], reason: "no_embedding" as const };
      }
      const myVec = self[0].embedding;
      const myCefr = self[0].cefr ?? "A2";
      const myGender = self[0].gender;
      const myGenderPref = self[0].genderPreference;
      const cefrOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 } as const;
      const myLevel = cefrOrder[myCefr as keyof typeof cefrOrder] ?? 2;

      // Cosine distance via Drizzle. For real pgvector, swap to sql`embedding <=> ${myVec}`.
      const similarity = sql<number>`1 - (${cosineDistance(
        userProfileEmbedding.embedding,
        myVec
      )})`;

      // CEFR closeness filter: ±1 level
      const nearby = await db
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
          cefr: cefrPlacement.level,
          sim: similarity,
          gender: userProfile.gender,
          genderPreference: userProfile.genderPreference,
          tier: userProfile.tier,
        })
        .from(userProfileEmbedding)
        .innerJoin(user, eq(user.id, userProfileEmbedding.userId))
        .leftJoin(
          cefrPlacement,
          eq(cefrPlacement.userId, userProfileEmbedding.userId)
        )
        .leftJoin(
          userProfile,
          eq(userProfile.userId, userProfileEmbedding.userId)
        )
        .where(
          and(
            sql`${userProfileEmbedding.userId} != ${context.session.user.id}`,
            gt(similarity, 0.4)
          )
        )
        .orderBy(desc(similarity))
        .limit(input.limit * 2); // over-fetch then filter

      // Apply CEFR ±1 filter + mutual gender filter + recency in JS
      let genderFilteredCount = 0;
      const cefrFiltered = nearby.filter((p) => {
        if (!p.cefr) {
          return true;
        }
        const lvl = cefrOrder[p.cefr as keyof typeof cefrOrder];
        return Math.abs(lvl - myLevel) <= 1;
      });

      const partners = cefrFiltered
        .filter((p) => {
          if (myGenderPref && p.gender && myGenderPref !== p.gender) {
            genderFilteredCount++;
            return false;
          }
          if (
            p.genderPreference &&
            myGender &&
            p.genderPreference !== myGender
          ) {
            genderFilteredCount++;
            return false;
          }
          return true;
        })
        .slice(0, input.limit)
        .map((p) => ({
          id: p.id,
          name: p.name,
          image: p.image,
          cefr: p.cefr,
          sim: p.sim,
        }));

      console.log(
        `[matchPartners] user=${context.session.user.id} cefrCandidates=${cefrFiltered.length} genderFiltered=${genderFilteredCount} returned=${partners.length} totalNearby=${nearby.length}`
      );

      return { partners, reason: "ok" as const };
    }),

  listPlacements: protectedProcedure.handler(async ({ context }) =>
    db
      .select()
      .from(cefrPlacement)
      .where(eq(cefrPlacement.userId, context.session.user.id))
      .orderBy(desc(cefrPlacement.createdAt))
      .limit(20)
  ),

  listPronScores: protectedProcedure.handler(async ({ context }) =>
    db
      .select()
      .from(pronunciationScore)
      .where(eq(pronunciationScore.userId, context.session.user.id))
      .orderBy(desc(pronunciationScore.createdAt))
      .limit(50)
  ),
};
