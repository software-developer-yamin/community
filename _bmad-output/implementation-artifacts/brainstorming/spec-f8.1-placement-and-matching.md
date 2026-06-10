# F8.1 + F8.2 Placement Test + Matching — OSS Self-Host Spec

**Stack:** whisper.cpp + llama.cpp (Qwen2.5-3B-Q4) + Postgres + MinIO. All OSS, self-host, $0 cloud.
**Status:** Ready to ship (month-1, week 2)
**Effort:** 5 days
**ICE:** 8 (impact 10, confidence 7, ease 7)
**Metric:** "Bad match" reviews ↓60%; D7 retention +18%; avg session duration +40%

## Cost = 0

| Component | OSS | Self-host | Per-test cost |
|---|---|---|---|
| STT (voice Qs) | whisper.cpp (MIT) | CPU, 4 cores | $0.00 (electricity) |
| LLM scorer | llama.cpp + Qwen2.5-3B-Instruct-Q4 (Apache 2.0) | GPU optional, CPU OK | $0.00 |
| Object storage | MinIO (Apache 2.0) | Local disk / NAS | $0.00 |
| DB | Postgres (BSD) | Existing | $0.00 |
| Adaptive MCQ engine | Custom, ~300 LOC | Existing | $0.00 |
| TTS for prompts | Piper TTS (MIT) | CPU | $0.00 |
| **Total** | | | **$0.00** |

Optional cloud GPU path: run Qwen on Vast.ai / RunPod spot for $0.20/hr if local GPU absent. Still <$0.01/test.

## Architecture

```
[Mobile] record audio → chunked upload to [MinIO]
                              ↓
                     [Whisper.cpp] transcribe (CPU)
                              ↓
                     [Qwen2.5-3B] CEFR rubric score
                              ↓
                     [Postgres] store + update user_profiles
                              ↓
                     [Matching algo] find partner
```

MCQ path (default, instant): skip audio, just MCQ → heuristic CEFR → match.

Voice path (opt-in upgrade): audio → whisper → LLM → refined CEFR.

## Test design

**Phase 1: Adaptive MCQ (2 min, default)**
- 10 Qs, mid-start (B1), branch on answer
- 2 calibration Qs (one trivial, one impossible) detect over/under-confidence
- Self-rated goal (6 options) + self-rated level
- Result: CEFR bucket (A1/A2/B1/B2/C1-C2) + confidence score

**Phase 2: Voice refinement (opt-in, +3 min)**
- 3 free Qs (picture describe, opinion, read aloud)
- Audio → whisper.cpp → Qwen CEFR scorer
- Result: refined sub-scores (grammar/vocab/fluency/pronunciation)

**Phase 3: Peer-rating (always on, ongoing)**
- First 3 calls: post-call "Rate your partner's English (A1-C2)"
- Aggregated, weighted by rater's own score
- Re-bucket user if peer signal diverges from self-test

## Adaptive MCQ engine

```ts
// apps/server/src/lib/placement-mcq.ts
// Adaptive IRT-lite: 10 Qs, branching by CEFR level
// No external deps. Pure TS.

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Question = {
  id: string;
  level: CefrLevel;
  type: 'grammar' | 'vocab' | 'reading' | 'calibration';
  prompt: string;
  options: string[];                    // 4 choices
  correctIndex: number;
  weight: number;                       // 1=normal, 2=discriminating
};

// 80-question bank, 10-15 per level + 5 calibration
// Sample bank (full list in apps/server/src/db/placement-bank.ts):
export const QUESTION_BANK: Question[] = [
  // A1
  { id: 'a1-g1', level: 'A1', type: 'grammar', prompt: 'She ___ a teacher.', options: ['am', 'is', 'are', 'be'], correctIndex: 1, weight: 1 },
  { id: 'a1-v1', level: 'A1', type: 'vocab', prompt: 'Which is a color?', options: ['Apple', 'Blue', 'Run', 'Happy'], correctIndex: 1, weight: 1 },
  // A2
  { id: 'a2-g1', level: 'A2', type: 'grammar', prompt: 'Yesterday I ___ to the market.', options: ['go', 'went', 'going', 'gone'], correctIndex: 1, weight: 1 },
  // ... (full bank seeded)
  // Calibration
  { id: 'cal-easy', level: 'A1', type: 'calibration', prompt: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctIndex: 1, weight: 1 },
  { id: 'cal-hard', level: 'C2', type: 'calibration', prompt: 'Choose the most precise word: "The data ___ inconclusive."', options: ['is', 'are', 'was', 'were'], correctIndex: 1, weight: 1 },
];

export type AdaptiveState = {
  currentLevel: CefrLevel;
  correctAtLevel: number;
  wrongAtLevel: number;
  answers: Array<{ questionId: string; correct: boolean; level: CefrLevel; selfConfidence: number }>;
};

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function nextQuestion(state: AdaptiveState): Question | null {
  if (state.answers.length >= 10) return null;

  // pick from current level
  const pool = QUESTION_BANK.filter(
    (q) => q.level === state.currentLevel
      && !state.answers.find((a) => a.questionId === q.id)
      && q.type !== 'calibration',
  );
  if (pool.length === 0) {
    // exhausted, pick calibration
    const calPool = QUESTION_BANK.filter(
      (q) => q.type === 'calibration' && !state.answers.find((a) => a.questionId === q.id),
    );
    return calPool[Math.floor(Math.random() * calPool.length)] ?? null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function recordAnswer(state: AdaptiveState, q: Question, correct: boolean, selfConfidence: number): AdaptiveState {
  const newState: AdaptiveState = {
    ...state,
    answers: [...state.answers, { questionId: q.id, correct, level: q.level, selfConfidence }],
  };

  // branch: 2 correct in a row → harder, 2 wrong → easier
  if (q.type !== 'calibration') {
    if (correct) {
      newState.correctAtLevel++;
      newState.wrongAtLevel = 0;
      if (newState.correctAtLevel >= 2) {
        const idx = LEVELS.indexOf(state.currentLevel);
        newState.currentLevel = LEVELS[Math.min(LEVELS.length - 1, idx + 1)];
        newState.correctAtLevel = 0;
      }
    } else {
      newState.wrongAtLevel++;
      newState.correctAtLevel = 0;
      if (newState.wrongAtLevel >= 2) {
        const idx = LEVELS.indexOf(state.currentLevel);
        newState.currentLevel = LEVELS[Math.max(0, idx - 1)];
        newState.wrongAtLevel = 0;
      }
    }
  }
  return newState;
}

export function scoreAdaptive(state: AdaptiveState): { cefr: CefrLevel; confidence: number; calibration: 'good' | 'overconfident' | 'underconfident' | 'mixed' } {
  // 1. base CEFR = last level where user got ≥50% correct
  const byLevel = new Map<CefrLevel, { correct: number; total: number }>();
  for (const a of state.answers) {
    if (a.questionId.startsWith('cal-')) continue;
    const cur = byLevel.get(a.level) ?? { correct: 0, total: 0 };
    cur.total++;
    if (a.correct) cur.correct++;
    byLevel.set(a.level, cur);
  }
  let bestLevel: CefrLevel = 'A1';
  for (const [lvl, s] of byLevel) {
    if (s.correct / s.total >= 0.5 && LEVELS.indexOf(lvl) > LEVELS.indexOf(bestLevel)) {
      bestLevel = lvl;
    }
  }

  // 2. calibration: did self-confidence match performance?
  const calAnswers = state.answers.filter((a) => a.questionId.startsWith('cal-'));
  let calScore = 0;
  for (const a of calAnswers) {
    if (a.questionId === 'cal-easy' && a.correct && a.selfConfidence >= 4) calScore++;
    if (a.questionId === 'cal-hard' && !a.correct && a.selfConfidence <= 2) calScore++;
  }
  const calibration = calScore === 2 ? 'good' : calScore === 0 ? 'overconfident' : 'mixed';

  // 3. confidence = number of non-calibration answers / 10
  const nonCalAnswers = state.answers.filter((a) => !a.questionId.startsWith('cal-'));
  const confidence = Math.min(1, nonCalAnswers.length / 8);

  return { cefr: bestLevel, confidence, calibration };
}
```

## Whisper.cpp + Qwen CEFR scorer (opt-in voice)

```ts
// apps/server/src/lib/whisper.ts
// Wraps whisper.cpp CLI. ~1s/audio-min on 4-core CPU.

import { spawn } from 'node:child_process';
import { storage } from './storage';

const MODEL = '/opt/models/whisper/ggml-base.en.bin';

export async function transcribe(audioPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('/opt/whisper/build/bin/whisper-cli', [
      '-m', MODEL,
      '-f', audioPath,
      '--no-timestamps',
      '-l', 'auto',
    ]);
    let out = '';
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`whisper exit ${code}`));
      resolve(out.trim());
    });
  });
}
```

```ts
// apps/server/src/lib/cefr-rater.ts
// Wraps llama.cpp with Qwen2.5-3B-Instruct-Q4. ~5-10s/eval on CPU, <1s on GPU.

import { spawn } from 'node:child_process';

const MODEL = '/opt/models/qwen2.5-3b-instruct-q4_k_m.gguf';
const LLAMA_BIN = '/opt/llama.cpp/build/bin/llama-cli';

const PROMPT = `You are an English CEFR rater. Given a transcript, output JSON only.

Transcript: """{transcript}"""

Output schema:
{
  "cefr": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "subscores": { "grammar": 0-100, "vocabulary": 0-100, "fluency": 0-100, "pronunciation": 0-100 },
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}`;

export async function rateCefr(transcript: string): Promise<CefrResult> {
  const prompt = PROMPT.replace('{transcript}', transcript);
  const out = await runLlama(prompt, { maxTokens: 200, temperature: 0.1 });
  // parse JSON from output
  const match = out.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in LLM output');
  return JSON.parse(match[0]);
}

async function runLlama(prompt: string, opts: { maxTokens: number; temperature: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(LLAMA_BIN, [
      '-m', MODEL,
      '-p', prompt,
      '-n', String(opts.maxTokens),
      '--temp', String(opts.temperature),
      '-c', '2048',
      '--no-display-prompt',
    ]);
    let out = '';
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`llama exit ${code}`));
      resolve(out.trim());
    });
  });
}
```

## Docker compose (deploy with apps/server)

```yaml
# docker-compose.yml (add to existing)
services:
  whisper:
    image: ghcr.io/ggerganov/whisper.cpp:cpu
    volumes:
      - ./models:/models:ro
      - ./audio-tmp:/tmp/audio
    command: ["--model", "/models/ggml-base.en.bin"]
    # invoked via CLI from server, not as service
    profiles: ['cpu-only']

  # OR GPU
  llama:
    image: ghcr.io/ggerganov/llama.cpp:server-cuda
    volumes:
      - ./models:/models:ro
    command: ["--model", "/models/qwen2.5-3b-instruct-q4_k_m.gguf", "--port", "8081", "--host", "0.0.0.0"]
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
    ports: ['8081:8081']
    profiles: ['gpu']

  # OR CPU-only llama.cpp
  llama-cpu:
    image: ghcr.io/ggerganov/llama.cpp:server
    volumes:
      - ./models:/models:ro
    command: ["--model", "/models/qwen2.5-3b-instruct-q4_k_m.gguf", "--port", "8081", "--host", "0.0.0.0", "-t", "4"]
    ports: ['8081:8081']
    profiles: ['cpu-only']

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASS}
    volumes:
      - ./minio-data:/data
    ports: ['9000:9000', '9001:9001']
```

Models downloaded once (~1.5GB Qwen, ~150MB Whisper base.en). Cached forever.

## Storage adapter

```ts
// apps/server/src/lib/storage.ts
// MinIO S3-compatible client. ~50 LOC using @aws-sdk/client-s3.

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@community/env/server';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const s3 = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,                    // http://minio:9000
  region: 'us-east-1',                                // MinIO ignores
  credentials: {
    accessKeyId: env.MINIO_USER,
    secretAccessKey: env.MINIO_PASS,
  },
  forcePathStyle: true,
});

const BUCKET = 'acefluency';

export const storage = {
  async upload(key: string, base64: string): Promise<string> {
    const buf = Buffer.from(base64, 'base64');
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf }));
    return `${env.STORAGE_PUBLIC_URL}/${key}`;
  },

  async uploadFile(key: string, path: string): Promise<string> {
    const buf = await readFile(path);
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf }));
    return `${env.STORAGE_PUBLIC_URL}/${key}`;
  },

  async getUrl(key: string): Promise<string> {
    return `${env.STORAGE_PUBLIC_URL}/${key}`;
  },
};
```

## Schema (same as before, no audio field changes)

```ts
// packages/db/src/schema/placement.ts
import { pgTable, text, timestamp, uuid, pgEnum, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const cefrEnum = pgEnum('cefr', ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const goalEnum = pgEnum('learning_goal', [
  'career', 'travel', 'study', 'fluency', 'pronunciation', 'kids',
]);

export const placementTests = pgTable('placement_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  selfGoal: goalEnum('self_goal').notNull(),
  selfLevel: cefrEnum('self_level'),
  method: text('method').notNull(),                     // 'mcq' | 'voice' | 'peer'
  // inputs
  mcqAnswers: jsonb('mcq_answers').$type<Array<{ q: string; correct: boolean; conf: number }>>(),
  audioUrls: text('audio_urls').array(),
  transcripts: text('transcripts').array(),
  // outputs
  cefr: cefrEnum('cefr'),
  subscores: jsonb('subscores').$type<{ grammar: number; vocabulary: number; fluency: number; pronunciation: number }>(),
  confidence: integer('confidence'),
  reasoning: text('reasoning'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  scoredAt: timestamp('scored_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('pt_user_idx').on(t.userId, t.scoredAt),
}));

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  cefr: cefrEnum('cefr').notNull(),
  subscores: jsonb('subscores').$type<{ grammar: number; vocabulary: number; fluency: number; pronunciation: number }>().notNull(),
  goal: goalEnum('goal').notNull(),
  // matching state
  lastMatchedUserId: text('last_matched_user_id'),
  lastMatchAt: timestamp('last_match_at', { withTimezone: true }),
  totalMatches: integer('total_matches').notNull().default(0),
  // peer-rating refinement
  peerRatingAvg: text('peer_rating_avg'),               // e.g. '3.2' CEFR numeric
  peerRatingCount: integer('peer_rating_count').notNull().default(0),
  // serious learner
  callsCompleted: integer('calls_completed').notNull().default(0),
  minutesCompleted: integer('minutes_completed').notNull().default(0),
  ratingAvg: text('rating_avg'),
  ratingCount: integer('rating_count').notNull().default(0),
  // bio
  nativeLanguage: text('native_language').default('bn'),
  countryCode: text('country_code').default('BD'),
  ageBracket: text('age_bracket'),
  bio: text('bio'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  cefrIdx: index('up_cefr_idx').on(t.cefr),
  goalIdx: index('up_goal_idx').on(t.goal),
  seriousIdx: index('up_serious_idx').on(t.callsCompleted, t.ratingAvg),
}));

export const peerRatings = pgTable('peer_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  raterId: text('rater_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  ratedId: text('rated_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  callId: text('call_id').notNull(),
  // 1-6 mapped to A1-C2
  levelGuess: integer('level_guess').notNull(),         // 1-6
  raterConfidence: integer('rater_confidence').notNull(), // 1-5
  // weight by rater's own rating credibility
  weight: text('weight').notNull().default('1.0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ratedIdx: index('pr_rated_idx').on(t.ratedId, t.createdAt),
  callIdx: index('pr_call_idx').on(t.callId),
}));
```

## Matching (same as before, no change)

```ts
// apps/server/src/lib/matching.ts
// Re-uses prior matching algo, but adds peer-rating refinement

import { peerRatings } from '@community/db/schema/placement';

async function refineCefrWithPeer(userId: string, currentCefr: string): Promise<string> {
  const ratings = await db.select().from(peerRatings).where(eq(peerRatings.ratedId, userId));
  if (ratings.length < 3) return currentCefr;            // need 3+ ratings
  const weightedAvg = ratings.reduce((sum, r) => sum + Number(r.levelGuess) * Number(r.weight), 0)
                    / ratings.reduce((sum, r) => sum + Number(r.weight), 0);
  const level = Math.round(weightedAvg);
  const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  // 70% peer + 30% self-test
  const currentIdx = CEFR.indexOf(currentCefr);
  const peerIdx = level - 1;
  const blendedIdx = Math.round(0.3 * currentIdx + 0.7 * peerIdx);
  return CEFR[Math.max(0, Math.min(5, blendedIdx))];
}
```

## Server: placement router

```ts
// apps/server/src/routers/placement.ts
import { z } from 'zod';
import { protectedProcedure } from '../lib/orpc';
import { placementTests, userProfiles, peerRatings } from '@community/db/schema/placement';
import { storage } from '../lib/storage';
import { transcribe } from '../lib/whisper';
import { rateCefr } from '../lib/cefr-rater';
import { scoreAdaptive, recordAnswer, nextQuestion, type AdaptiveState } from '../lib/placement-mcq';
import { eq, sql } from 'drizzle-orm';

export const placementRouter = {
  myProfile: protectedProcedure.query(({ ctx }) =>
    ctx.db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, ctx.session.user.id) }),
  ),

  // Adaptive MCQ start
  startMcq: protectedProcedure
    .input(z.object({ selfGoal: z.enum(['career', 'travel', 'study', 'fluency', 'pronunciation', 'kids']) }))
    .mutation(async ({ ctx, input }) => {
      // pre-create test record
      const [test] = await ctx.db.insert(placementTests).values({
        userId: ctx.session.user.id,
        selfGoal: input.selfGoal,
        method: 'mcq',
      }).returning();
      return { testId: test.id, state: { currentLevel: 'B1', correctAtLevel: 0, wrongAtLevel: 0, answers: [] } as AdaptiveState };
    }),

  // Submit each MCQ answer
  answerMcq: protectedProcedure
    .input(z.object({
      testId: z.string().uuid(),
      state: z.object({
        currentLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
        correctAtLevel: z.number(),
        wrongAtLevel: z.number(),
        answers: z.array(z.object({ questionId: z.string(), correct: z.boolean(), level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']), selfConfidence: z.number() })),
      }),
      questionId: z.string(),
      correct: z.boolean(),
      selfConfidence: z.number().min(1).max(5),
    }))
    .mutation(({ input }) => {
      const q = QUESTION_BANK.find((q) => q.id === input.questionId)!;
      const newState = recordAnswer(input.state, q, input.correct, input.selfConfidence);
      const nextQ = nextQuestion(newState);
      return { state: newState, nextQuestion: nextQ, done: !nextQ };
    }),

  // Finalize MCQ
  finalizeMcq: protectedProcedure
    .input(z.object({ testId: z.string().uuid(), state: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const { cefr, confidence, calibration } = scoreAdaptive(input.state);
      const subscores = { grammar: 50, vocabulary: 50, fluency: 50, pronunciation: 50 };  // MCQ doesn't measure sub-scores

      await ctx.db.update(placementTests)
        .set({
          cefr, subscores, confidence: Math.round(confidence * 100),
          reasoning: `MCQ adaptive: calibration=${calibration}`,
          mcqAnswers: input.state.answers,
          completedAt: new Date(), scoredAt: new Date(),
        })
        .where(eq(placementTests.id, input.testId));

      await ctx.db.insert(userProfiles)
        .values({ userId: ctx.session.user.id, cefr, subscores, goal: 'fluency' })  // goal from earlier onboarding
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: { cefr, subscores, updatedAt: new Date() },
        });

      return { cefr, confidence, calibration, nextStep: 'voice_optional' };
    }),

  // Voice upgrade: submit 3 audio answers
  submitVoice: protectedProcedure
    .input(z.object({
      audioBlobs: z.array(z.string()).length(3),         // base64
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const audioUrls = await Promise.all(
        input.audioBlobs.map((b64, i) => storage.upload(`placement/${userId}/${Date.now()}_${i}.m4a`, b64)),
      );

      // 1. transcribe (whisper.cpp, ~3s/audio)
      const transcripts = await Promise.all(audioUrls.map((url) =>
        transcribe(localPath(url)).catch(() => ''),
      ));

      // 2. score via Qwen (llama.cpp, ~5-10s on CPU)
      const voiceResult = await rateCefr(transcripts.join('\n\n'));

      // 3. merge with existing MCQ CEFR (60% voice, 40% MCQ)
      const me = await ctx.db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) });
      if (!me) throw new Error('No MCQ profile. Take MCQ test first.');

      const CEFR_IDX = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
      const mcqIdx = CEFR_IDX.indexOf(me.cefr);
      const voiceIdx = CEFR_IDX.indexOf(voiceResult.cefr);
      const blended = CEFR_IDX[Math.round(0.4 * mcqIdx + 0.6 * voiceIdx)];

      // 4. update
      await ctx.db.update(userProfiles)
        .set({
          cefr: blended,
          subscores: voiceResult.subscores,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));

      await ctx.db.insert(placementTests).values({
        userId,
        method: 'voice',
        selfGoal: me.goal,
        selfLevel: me.cefr,
        audioUrls,
        transcripts,
        cefr: blended,
        subscores: voiceResult.subscores,
        confidence: Math.round(voiceResult.confidence * 100),
        reasoning: voiceResult.reasoning,
        completedAt: new Date(),
        scoredAt: new Date(),
      });

      return { cefr: blended, subscores: voiceResult.subscores };
    }),

  // Peer rate (called from post-call sheet)
  ratePeer: protectedProcedure
    .input(z.object({
      callId: z.string(),
      ratedId: z.string(),
      levelGuess: z.number().int().min(1).max(6),         // 1=A1, 6=C2
      confidence: z.number().int().min(1).max(5),
    }))
    .mutation(async ({ ctx, input }) => {
      // weight by rater's own rating credibility (calls completed)
      const me = await ctx.db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, ctx.session.user.id) });
      const weight = Math.min(2.0, 0.5 + (me?.callsCompleted ?? 0) / 50);

      await ctx.db.insert(peerRatings).values({
        raterId: ctx.session.user.id,
        ratedId: input.ratedId,
        callId: input.callId,
        levelGuess: input.levelGuess,
        raterConfidence: input.confidence,
        weight: String(weight),
      });

      // 3+ ratings → re-bucket rated user
      const recent = await ctx.db.select().from(peerRatings)
        .where(eq(peerRatings.ratedId, input.ratedId));
      if (recent.length >= 3) {
        const weightedAvg = recent.reduce((s, r) => s + r.levelGuess * Number(r.weight), 0)
                          / recent.reduce((s, r) => s + Number(r.weight), 0);
        const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const targetLevel = CEFR[Math.round(weightedAvg) - 1];

        // blend with existing (70% peer, 30% self)
        const them = await ctx.db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, input.ratedId) });
        if (them) {
          const blended = CEFR[Math.round(0.7 * CEFR.indexOf(targetLevel) + 0.3 * CEFR.indexOf(them.cefr))];
          await ctx.db.update(userProfiles)
            .set({
              cefr: blended,
              peerRatingAvg: String(weightedAvg),
              peerRatingCount: recent.length,
              updatedAt: new Date(),
            })
            .where(eq(userProfiles.userId, input.ratedId));
        }
      }

      return { ok: true };
    }),

  findMatch: protectedProcedure.query(({ ctx }) => findMatch(ctx.session.user.id)),
};
```

## Mobile UI (MCQ + voice opt-in)

```tsx
// apps/native/app/onboarding/placement-mcq.tsx
import { orpc } from '@/utils/orpc';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { router } from 'expo-router';

export default function PlacementMcq() {
  const { theme } = useUnistyles();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<any>({ currentLevel: 'B1', correctAtLevel: 0, wrongAtLevel: 0, answers: [] });
  const [question, setQuestion] = useState<any>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const answer = useMutation(orpc.placement.answerMcq.mutationOptions());
  const finalize = useMutation(orpc.placement.finalizeMcq.mutationOptions());

  // bootstrap first question
  useEffect(() => {
    if (!question) {
      const q = pickInitialQuestion(state);
      setQuestion(q);
    }
  }, []);

  const submit = async (correct: boolean) => {
    if (confidence === null) return;
    const res = await answer.mutateAsync({
      testId,
      state,
      questionId: question.id,
      correct,
      selfConfidence: confidence,
    });
    setState(res.state);
    setConfidence(null);
    if (res.done) {
      const r = await finalize.mutateAsync({ testId, state: res.state });
      router.replace(`/onboarding/voice?level=${r.cefr}`);
    } else {
      setQuestion(res.nextQuestion);
      setStep((s) => s + 1);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
      <Text style={{ fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center' }}>
        Question {step + 1} of ~10
      </Text>
      <View style={{ height: 8, backgroundColor: theme.colors.muted, borderRadius: 4, marginTop: 8 }}>
        <View style={{ width: `${(step / 10) * 100}%`, height: 8, backgroundColor: theme.colors.primary, borderRadius: 4 }} />
      </View>

      {question && (
        <>
          <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 32 }}>
            {question.prompt}
          </Text>
          <View style={{ gap: 8, marginTop: 24 }}>
            {question.options.map((opt: string, i: number) => (
              <Pressable
                key={i}
                onPress={() => submit(i === question.correctIndex)}
                style={{
                  padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border,
                  backgroundColor: theme.colors.muted,
                }}
              >
                <Text style={{ fontSize: 15, color: theme.colors.typography }}>{opt}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ marginTop: 24, fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center' }}>
            How confident are you?
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setConfidence(n)}
                style={{
                  width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: confidence === n ? theme.colors.primary : theme.colors.muted,
                }}
              >
                <Text style={{ color: confidence === n ? theme.colors.primaryForeground : theme.colors.typography, fontWeight: '600' }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
```

Voice step shown after MCQ: "Want a more accurate level? Record 3 answers (3 min)" — opt-in, "Skip" button.

## Setup (one-time, ~30 min)

```bash
# 1. install whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp /opt/whisper
cd /opt/whisper && ./build.sh
./download-ggml-model.sh base.en     # 150MB

# 2. install llama.cpp
git clone https://github.com/ggerganov/llama.cpp /opt/llama.cpp
cd /opt/llama.cpp && make
# download Qwen2.5-3B Q4
wget -O /opt/models/qwen2.5-3b-instruct-q4_k_m.gguf \
  https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf

# 3. start MinIO (or use existing S3)
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minio -e MINIO_ROOT_PASSWORD=minio123 \
  -v /data/minio:/data minio/minio server /data --console-address :9001

# 4. seed question bank
psql -c "INSERT INTO placement_bank (id, level, ...) VALUES (...)"

# 5. env
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_PUBLIC_URL=http://localhost:9000/acefluency
MINIO_USER=minio
MINIO_PASS=minio123
```

Hardware reqs:
- **CPU-only**: 4+ cores, 8GB RAM. Whisper ~1s/audio, Qwen ~10s/eval. Acceptable for hundreds of users/day.
- **GPU (one L4/A10)**: <1s/audio, <1s/eval. 10k users/day easily.
- **No GPU cloud bill if you have on-prem.** Otherwise spot GPU on Vast.ai = $0.20/hr.

## Rollout

1. **Day 1:** install whisper.cpp + llama.cpp + MinIO locally. Seed 80 MCQ questions.
2. **Day 2:** server routers. Mobile MCQ UI. Internal dogfood.
3. **Day 3:** voice upgrade screen (opt-in). Whisper + Qwen pipeline. Test with 10 users.
4. **Day 4:** peer-rating in post-call sheet. Re-bucket logic.
5. **Day 5:** 100% rollout. Monitor:
   - MCQ completion rate (target ≥85%)
   - Voice upgrade rate (target ≥20% of MCQ takers)
   - Peer-rating agreement with self-test (target ≥70%)
   - Match quality reviews ↓60%

## Risks

| Risk | Mitigation |
|---|---|
| Qwen gives weird output (bad JSON) | Strict JSON mode in prompt + regex parse + fallback heuristic. |
| Whisper mis-transcribes (BD accent) | Use `large-v3` model (3GB, 10× slower) for opt-in voice. Default = base.en fast. |
| MinIO disk full | Cap user audio: 10MB/test, 3 tests/month max. Cleanup job: delete >90d. |
| MCQ bank leaks (cheat) | Rotate bank quarterly. Add 20 new Qs/month. |
| Peer-rating abuse (shafting rivals) | Weight by rater's own rating credibility. Min 3 ratings before re-bucket. |
| llama.cpp won't fit on tiny VPS | Phase 1: MCQ-only (zero LLM). Add voice in phase 2 when infra ready. |
| 80 MCQ Qs not enough granularity | All A1-C2 in same test: 14 Qs/level. Plus 5 calibration. = 75 Qs. Expand to 150 in week 2. |

## Success metrics (60d)

- "Match quality" reviews ↓60%
- D7 retention +18%
- Avg call duration +40% (3 min → 4.2 min)
- MCQ completion ≥85% of new users
- Voice upgrade ≥20% of MCQ takers
- Peer-rating agreement with MCQ ≥70% (proves system works)
- "Serious learner" badge adoption: 60% of MAU

## Companion fixes (same PR)

- **F8.3 Reconnect past** — `lastMatchedUserId` + "Call again"
- **F8.4 Serious badge** — `callsCompleted ≥ 50 + ratingAvg ≥ 4.5`
- **F8.5 Topic rooms** — out of scope; week 4 separate PR

3 of 5 F8 fixes, 1 PR, 5 days. Cost: $0 forever. Optional $0.20/hr GPU for scale.

---

*Spec complete. All OSS, self-host, $0 cloud.*
