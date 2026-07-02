import { randomUUID } from "node:crypto";
import { db } from "@community/db";
import { user } from "@community/db/schema/auth";
import {
  cefrPlacement,
  userProfileEmbedding,
} from "@community/db/schema/models";
import { userProfile } from "@community/db/schema/rebuild";
import {
  contentEmbedding,
  contentItem,
  recommendationScore,
  userInteraction,
  userPreference,
} from "@community/db/schema/recommendations";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import z from "zod";
import { adminProcedure, protectedProcedure, publicProcedure } from "../index";

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

const cefrOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 } as const;

function getCefrLevel(userId: string): Promise<string | null> {
  return db
    .select({ level: cefrPlacement.level })
    .from(cefrPlacement)
    .where(eq(cefrPlacement.userId, userId))
    .orderBy(desc(cefrPlacement.createdAt))
    .limit(1)
    .then((r) => r[0]?.level ?? null);
}

async function getUserEmbedding(userId: string) {
  const rows = await db
    .select({ embedding: userProfileEmbedding.embedding })
    .from(userProfileEmbedding)
    .where(eq(userProfileEmbedding.userId, userId))
    .limit(1);
  return rows[0]?.embedding ?? null;
}

async function computeHybridScores(
  userId: string,
  limit: number
): Promise<Array<{ contentId: string; score: number; reason: string }>> {
  // 1. Load user signals
  const [userVec, myCefr, prefs] = await Promise.all([
    getUserEmbedding(userId),
    getCefrLevel(userId),
    db
      .select()
      .from(userPreference)
      .where(eq(userPreference.userId, userId))
      .limit(1)
      .then((r) => r[0]),
  ]);

  const myLevel = cefrOrder[myCefr as keyof typeof cefrOrder] ?? 2;

  // 2. Load recently seen content IDs to exclude
  const seen = await db
    .select({ contentId: userInteraction.contentId })
    .from(userInteraction)
    .where(eq(userInteraction.userId, userId));
  const seenIds = seen.map((s) => s.contentId);

  // 3. Candidate pool: content matching CEFR ±1 + preferred types
  const typeFilter =
    prefs?.preferredTypes && prefs.preferredTypes.length > 0
      ? inArray(contentItem.type, prefs.preferredTypes)
      : undefined;

  const cefrLevels = Object.keys(cefrOrder).filter((lvl) => {
    const l = cefrOrder[lvl as keyof typeof cefrOrder];
    return Math.abs(l - myLevel) <= 1;
  });

  const candidates = await db
    .select({
      id: contentItem.id,
      embedding: contentEmbedding.embedding,
      type: contentItem.type,
      cefr: contentItem.cefrLevel,
      tags: contentItem.tags,
    })
    .from(contentItem)
    .leftJoin(contentEmbedding, eq(contentEmbedding.contentId, contentItem.id))
    .where(
      and(
        inArray(contentItem.cefrLevel, cefrLevels),
        seenIds.length > 0
          ? ne(contentItem.id, sql`ANY(${seenIds})`)
          : undefined,
        typeFilter
      )
    )
    .limit(200);

  // 4. Score candidates
  const scored = candidates
    .filter((c) => c.embedding != null)
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];

      // Content-based: embedding similarity
      if (userVec) {
        const sim = cosineSimilarity(userVec, c.embedding as number[]);
        score += sim * 0.4;
        if (sim > 0.7) {
          reasons.push("matches your interests");
        }
      }

      // CEFR closeness
      const cLevel = cefrOrder[c.cefr as keyof typeof cefrOrder] ?? 2;
      const cefrDiff = Math.abs(cLevel - myLevel);
      const cefrScore = 1 - cefrDiff / 3; // 0.33, 0.66, 1.0
      score += cefrScore * 0.3;
      reasons.push(`${c.cefr} level`);

      // Tag overlap with preferences
      if (prefs?.interests && c.tags) {
        const overlap = c.tags.filter((tag) =>
          prefs.interests.includes(tag)
        ).length;
        if (overlap > 0) {
          const tagScore = Math.min(overlap / 3, 1);
          score += tagScore * 0.2;
          reasons.push("topics you like");
        }
      }

      // Type preference
      if (prefs?.preferredTypes?.includes(c.type)) {
        score += 0.1;
      }

      return {
        contentId: c.id,
        score: Math.min(score, 1.0),
        reason: reasons.join(", ") || "recommended for you",
      };
    });

  // 5. Sort and return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    aMag += ai * ai;
    bMag += bi * bi;
  }
  const denom = Math.sqrt(aMag) * Math.sqrt(bMag);
  return denom === 0 ? 0 : dot / denom;
}

// ───────────────────────────────────────────────────────────────
// Recommendation Handler (extracted to avoid circular reference)
// ───────────────────────────────────────────────────────────────

async function getRecommendationsHandler(
  input: { limit: number; recalculate: boolean },
  context: { session: { user: { id: string } } }
): Promise<Record<string, unknown>[]> {
  const userId = context.session.user.id;

  if (input.recalculate) {
    // Recompute and store scores
    const scores = await computeHybridScores(userId, input.limit);
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

    // Upsert scores
    for (const s of scores) {
      await db
        .insert(recommendationScore)
        .values({
          userId,
          contentId: s.contentId,
          score: s.score,
          scoreType: "hybrid",
          reason: s.reason,
          expiresAt: expires,
        })
        .onConflictDoUpdate({
          target: [
            recommendationScore.userId,
            recommendationScore.contentId,
            recommendationScore.scoreType,
          ],
          set: {
            score: s.score,
            reason: s.reason,
            expiresAt: expires,
            createdAt: now,
          },
        });
    }

    // Fetch full content items
    const contentIds = scores.map((s) => s.contentId);
    if (contentIds.length === 0) {
      return [];
    }

    const items = await db
      .select()
      .from(contentItem)
      .where(inArray(contentItem.id, contentIds));

    // Merge score data
    const scoreMap = new Map(scores.map((s) => [s.contentId, s]));
    return items.map((item) => ({
      ...item,
      recommendationScore: scoreMap.get(item.id)?.score ?? 0,
      recommendationReason: scoreMap.get(item.id)?.reason ?? "",
    }));
  }

  // Read cached scores
  const cached = await db
    .select()
    .from(recommendationScore)
    .where(
      and(
        eq(recommendationScore.userId, userId),
        eq(recommendationScore.scoreType, "hybrid"),
        gt(recommendationScore.score, 0)
      )
    )
    .orderBy(desc(recommendationScore.score))
    .limit(input.limit);

  if (cached.length > 0) {
    const contentIds = cached.map((c) => c.contentId);
    const items = await db
      .select()
      .from(contentItem)
      .where(inArray(contentItem.id, contentIds));

    const scoreMap = new Map(cached.map((c) => [c.contentId, c]));
    return items.map((item) => ({
      ...item,
      recommendationScore: scoreMap.get(item.id)?.score ?? 0,
      recommendationReason: scoreMap.get(item.id)?.reason ?? "",
    }));
  }

  // Fallback: compute on-demand
  return getRecommendationsHandler({ ...input, recalculate: true }, context);
}

// ───────────────────────────────────────────────────────────────
// Router
// ───────────────────────────────────────────────────────────────

export const recommendationsRouter = {
  // ── Content Management ──────────────────────────────────────
  listContent: publicProcedure
    .input(
      z.object({
        type: z.string().optional(),
        cefr: z.string().optional(),
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [];
      if (input.type) {
        conditions.push(eq(contentItem.type, input.type));
      }
      if (input.cefr) {
        conditions.push(eq(contentItem.cefrLevel, input.cefr));
      }
      if (input.tag) {
        conditions.push(sql`${input.tag} = ANY(${contentItem.tags})`);
      }

      const items = await db
        .select()
        .from(contentItem)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(contentItem.createdAt));

      return items;
    }),

  getContent: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input }) => {
      const items = await db
        .select()
        .from(contentItem)
        .where(eq(contentItem.id, input.id))
        .limit(1);
      if (items.length === 0) {
        throw new Error("content not found");
      }
      return items[0];
    }),

  createContent: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(2000),
        type: z.enum(["video", "article", "exercise", "dialogue"]),
        cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
        sourceUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        duration: z.number().int().min(1).optional(),
        tags: z.array(z.string().min(1).max(50)).max(10).default([]),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .handler(async ({ input }) => {
      const items = await db
        .insert(contentItem)
        .values({
          ...input,
          metadata: input.metadata ?? null,
        })
        .returning();
      return items[0];
    }),

  // ── Recommendations ─────────────────────────────────────────
  getRecommendations: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(20).default(10),
        recalculate: z.boolean().default(false),
      })
    )
    .handler(async ({ input, context }) =>
      getRecommendationsHandler(input, context)
    ),

  // ── Interactions ────────────────────────────────────────────
  trackInteraction: protectedProcedure
    .input(
      z.object({
        contentId: z.string().uuid(),
        action: z.enum([
          "view",
          "like",
          "bookmark",
          "complete",
          "share",
          "dismiss",
        ]),
        value: z.number().int().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const rows = await db
        .insert(userInteraction)
        .values({
          userId,
          contentId: input.contentId,
          action: input.action,
          value: input.value ?? null,
          metadata: input.metadata ?? null,
        })
        .onConflictDoUpdate({
          target: [
            userInteraction.userId,
            userInteraction.contentId,
            userInteraction.action,
          ],
          set: {
            value: input.value ?? null,
            metadata: input.metadata ?? null,
            createdAt: new Date(),
          },
        })
        .returning();
      return rows[0];
    }),

  getInteractions: protectedProcedure
    .input(
      z.object({
        action: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .handler(({ input, context }) => {
      const userId = context.session.user.id;
      const conditions = [eq(userInteraction.userId, userId)];
      if (input.action) {
        conditions.push(eq(userInteraction.action, input.action));
      }

      return db
        .select()
        .from(userInteraction)
        .where(and(...conditions))
        .orderBy(desc(userInteraction.createdAt))
        .limit(input.limit);
    }),

  // ── Match Partners ─────────────────────────────────────────────
  matchPartners: protectedProcedure
    .input(z.void())
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      // Check cooldown guard
      const profile = await db
        .select({ cooldownUntil: userProfile.cooldownUntil })
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (profile?.cooldownUntil && profile.cooldownUntil > new Date()) {
        const remainingMs = profile.cooldownUntil.getTime() - Date.now();
        throw new ORPCError("COOLDOWN", {
          status: 403,
          message: `Cooldown active for ${Math.ceil(remainingMs / 1000 / 60)} more minutes`,
          data: { remainingMs },
        });
      }

      // Stub: return empty list until partner matching logic is implemented
      return [];
    }),

  // ── User Preferences ──────────────────────────────────────────
  getPreferences: protectedProcedure.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(userPreference)
      .where(eq(userPreference.userId, context.session.user.id))
      .limit(1);
    return (
      rows[0] ?? {
        userId: context.session.user.id,
        interests: [],
        goals: [],
        preferredTypes: [],
        preferredCefr: null,
        dailyGoal: 15,
        notifications: {
          dailyReminder: true,
          newContent: true,
          progressUpdates: true,
        },
      }
    );
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        interests: z.array(z.string().min(1).max(50)).max(20).optional(),
        goals: z.array(z.string().min(1).max(100)).max(10).optional(),
        preferredTypes: z
          .array(z.enum(["video", "article", "exercise", "dialogue"]))
          .max(4)
          .optional(),
        preferredCefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
        dailyGoal: z.number().int().min(1).max(120).optional(),
        notifications: z
          .object({
            dailyReminder: z.boolean().optional(),
            newContent: z.boolean().optional(),
            progressUpdates: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const existing = await db
        .select()
        .from(userPreference)
        .where(eq(userPreference.userId, userId))
        .limit(1);

      const data = {
        ...input,
        notifications: input.notifications
          ? JSON.stringify(input.notifications)
          : undefined,
      };

      if (existing.length === 0) {
        const rows = await db
          .insert(userPreference)
          .values({
            userId,
            interests: input.interests ?? [],
            goals: input.goals ?? [],
            preferredTypes: input.preferredTypes ?? [],
            preferredCefr: input.preferredCefr ?? null,
            dailyGoal: input.dailyGoal ?? 15,
            notifications: input.notifications ?? {
              dailyReminder: true,
              newContent: true,
              progressUpdates: true,
            },
          })
          .returning();
        return rows[0];
      }

      const rows = await db
        .update(userPreference)
        .set(data)
        .where(eq(userPreference.userId, userId))
        .returning();
      return rows[0];
    }),

  // ── Admin ─────────────────────────────────────────────────────
  adminStats: adminProcedure.handler(async () => {
    const [userCount, contentCount, interactionCount, scoreCount] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(user),
        db.select({ count: sql<number>`count(*)` }).from(contentItem),
        db.select({ count: sql<number>`count(*)` }).from(userInteraction),
        db.select({ count: sql<number>`count(*)` }).from(recommendationScore),
      ]);

    const recentInteractions = await db
      .select()
      .from(userInteraction)
      .orderBy(desc(userInteraction.createdAt))
      .limit(10);

    const popularContent = await db
      .select({
        contentId: userInteraction.contentId,
        count: sql<number>`count(*)`,
      })
      .from(userInteraction)
      .where(eq(userInteraction.action, "like"))
      .groupBy(userInteraction.contentId)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(10);

    const contentDetails =
      popularContent.length > 0
        ? await db
            .select()
            .from(contentItem)
            .where(
              inArray(
                contentItem.id,
                popularContent.map((p) => p.contentId)
              )
            )
        : [];

    const contentMap = new Map(contentDetails.map((c) => [c.id, c]));

    return {
      counts: {
        users: userCount[0]?.count ?? 0,
        content: contentCount[0]?.count ?? 0,
        interactions: interactionCount[0]?.count ?? 0,
        scores: scoreCount[0]?.count ?? 0,
      },
      recentInteractions,
      popularContent: popularContent.map((p) => ({
        ...p,
        content: contentMap.get(p.contentId),
      })),
    };
  }),

  adminListUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const users = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const userIds = users.map((u) => u.id);
      const cefrLevels =
        userIds.length > 0
          ? await db
              .select()
              .from(cefrPlacement)
              .where(inArray(cefrPlacement.userId, userIds))
          : [];

      const preferences =
        userIds.length > 0
          ? await db
              .select()
              .from(userPreference)
              .where(inArray(userPreference.userId, userIds))
          : [];

      const cefrMap = new Map(cefrLevels.map((c) => [c.userId, c]));
      const prefMap = new Map(preferences.map((p) => [p.userId, p]));

      return users.map((u) => ({
        ...u,
        cefr: cefrMap.get(u.id) ?? null,
        preferences: prefMap.get(u.id) ?? null,
      }));
    }),

  updateContent: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().min(1).max(2000).optional(),
        type: z.enum(["video", "article", "exercise", "dialogue"]).optional(),
        cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
        sourceUrl: z.string().url().optional().nullable(),
        thumbnailUrl: z.string().url().optional().nullable(),
        duration: z.number().int().min(1).optional().nullable(),
        tags: z.array(z.string().min(1).max(50)).max(10).optional(),
        metadata: z.record(z.string(), z.unknown()).optional().nullable(),
      })
    )
    .handler(async ({ input }) => {
      const { id, ...patch } = input;

      const existing = await db
        .select({ id: contentItem.id })
        .from(contentItem)
        .where(eq(contentItem.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw new ORPCError("NOT_FOUND", {
          message: "Content item not found",
        });
      }

      const rows = await db
        .update(contentItem)
        .set(patch)
        .where(eq(contentItem.id, id))
        .returning();

      if (patch.title !== undefined || patch.description !== undefined) {
        await db
          .update(contentEmbedding)
          .set({ modelVersion: "pending" })
          .where(eq(contentEmbedding.contentId, id));
      }

      const updated = rows[0];
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Content item not found after update",
        });
      }

      return updated;
    }),

  adminDeleteContent: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input }) => {
      await db.delete(contentItem).where(eq(contentItem.id, input.id));
      return { success: true };
    }),

  // ── Seed ──────────────────────────────────────────────────────
  seed: publicProcedure.handler(async () => {
    const demoUserId = randomUUID();
    await db
      .insert(user)
      .values({
        id: demoUserId,
        email: "demo@example.com",
        name: "Demo Learner",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: user.email });

    const demoUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, "demo@example.com"))
      .limit(1);
    const userId = demoUser[0]?.id ?? demoUserId;

    await db
      .insert(cefrPlacement)
      .values({
        userId,
        level: "B1",
        score: 72,
        source: "mcq",
        modelVersion: "v1",
        createdAt: new Date(),
      })
      .onConflictDoNothing();

    await db
      .insert(userProfileEmbedding)
      .values({
        userId,
        embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1),
        modelVersion: "v1",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userProfileEmbedding.userId,
        set: {
          embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1),
          modelVersion: "v1",
          updatedAt: new Date(),
        },
      });

    await db
      .insert(userPreference)
      .values({
        userId,
        interests: ["travel", "food", "daily-life"],
        goals: ["improve-conversation", "expand-vocabulary"],
        preferredTypes: ["video", "dialogue"],
        preferredCefr: "B1",
        dailyGoal: 20,
        notifications: {
          dailyReminder: true,
          newContent: true,
          progressUpdates: true,
        },
      })
      .onConflictDoUpdate({
        target: userPreference.userId,
        set: {
          interests: ["travel", "food", "daily-life"],
          goals: ["improve-conversation", "expand-vocabulary"],
          preferredTypes: ["video", "dialogue"],
          preferredCefr: "B1",
          dailyGoal: 20,
        },
      });

    const demoContent = [
      {
        title: "Basic English Greetings",
        description:
          "Learn how to say hello, goodbye, and introduce yourself in English.",
        type: "video",
        cefrLevel: "A1",
        duration: 180,
        tags: ["greetings", "basics", "conversation"],
      },
      {
        title: "Ordering Food at a Restaurant",
        description:
          "Practice ordering meals, asking about ingredients, and paying the bill.",
        type: "dialogue",
        cefrLevel: "A1",
        duration: 240,
        tags: ["food", "restaurant", "daily-life"],
      },
      {
        title: "Describing Your Daily Routine",
        description:
          "Talk about your morning, work, and evening activities using simple present tense.",
        type: "exercise",
        cefrLevel: "A2",
        duration: 300,
        tags: ["routine", "daily-life", "grammar"],
      },
      {
        title: "Talking About Hobbies and Interests",
        description:
          "Express what you enjoy doing in your free time with expanded vocabulary.",
        type: "video",
        cefrLevel: "A2",
        duration: 360,
        tags: ["hobbies", "interests", "conversation"],
      },
      {
        title: "Giving Directions in a City",
        description:
          "Learn to ask for and give directions using prepositions and landmarks.",
        type: "dialogue",
        cefrLevel: "B1",
        duration: 420,
        tags: ["directions", "travel", "city"],
      },
      {
        title: "Discussing News and Current Events",
        description:
          "Practice expressing opinions on news topics with appropriate vocabulary.",
        type: "article",
        cefrLevel: "B1",
        duration: 600,
        tags: ["news", "opinion", "current-events"],
      },
      {
        title: "Debating Environmental Issues",
        description:
          "Engage in structured debates about climate change, pollution, and sustainability.",
        type: "exercise",
        cefrLevel: "B2",
        duration: 900,
        tags: ["environment", "debate", "advanced"],
      },
      {
        title: "Understanding Idioms and Cultural References",
        description:
          "Master common English idioms and cultural expressions used in media.",
        type: "video",
        cefrLevel: "B2",
        duration: 480,
        tags: ["idioms", "culture", "media"],
      },
      {
        title: "Academic Writing and Research Presentation",
        description:
          "Learn to structure arguments, cite sources, and present findings formally.",
        type: "article",
        cefrLevel: "C1",
        duration: 1200,
        tags: ["academic", "writing", "research"],
      },
      {
        title: "Negotiating in Business Settings",
        description:
          "Practice formal negotiation language, compromise strategies, and professional etiquette.",
        type: "dialogue",
        cefrLevel: "C1",
        duration: 720,
        tags: ["business", "negotiation", "professional"],
      },
      {
        title: "Analyzing Literary Texts and Poetry",
        description:
          "Deep dive into metaphor, symbolism, and thematic analysis of English literature.",
        type: "article",
        cefrLevel: "C2",
        duration: 1800,
        tags: ["literature", "poetry", "analysis"],
      },
      {
        title: "Simultaneous Interpretation Practice",
        description:
          "Advanced exercises in real-time translation and interpretation skills.",
        type: "exercise",
        cefrLevel: "C2",
        duration: 1500,
        tags: ["interpretation", "advanced", "translation"],
      },
    ];

    await db
      .insert(contentItem)
      .values(
        demoContent.map((c) => ({
          ...c,
          sourceUrl: null,
          thumbnailUrl: null,
          metadata: null,
        }))
      )
      .onConflictDoNothing();

    const allContent = await db
      .select({ id: contentItem.id })
      .from(contentItem);

    for (const item of allContent) {
      await db
        .insert(contentEmbedding)
        .values({
          contentId: item.id,
          embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1),
          modelVersion: "v1",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: contentEmbedding.contentId,
          set: {
            embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1),
            modelVersion: "v1",
            updatedAt: new Date(),
          },
        });
    }

    const likedItems = allContent.slice(0, 2);
    for (const item of likedItems) {
      await db
        .insert(userInteraction)
        .values({
          userId,
          contentId: item.id,
          action: "like",
          value: null,
          metadata: null,
        })
        .onConflictDoNothing();
    }

    return { userId, contentCount: allContent.length };
  }),
};
