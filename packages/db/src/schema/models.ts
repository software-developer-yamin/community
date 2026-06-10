import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Eval runs for any model. Used by `packages/models/eval/run.ts` to track
 * benchmark performance on each deployment / dataset version.
 */
export const modelEvalRuns = pgTable("model_eval_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  modelName: text("model_name").notNull(),
  evalSet: text("eval_set").notNull(),
  metrics: jsonb("metrics").notNull(),
  sampleSize: integer("sample_size").notNull(),
  ranAt: timestamp("ran_at").defaultNow().notNull(),
  ranBy: text("ran_by").notNull(),
});

/**
 * Append-only log of every model inference. Used for:
 *  - Latency tracking
 *  - Cost/usage estimation
 *  - Shadow-mode comparison (F8.2 vs F8.1 results)
 *  - Deduplication via input hash
 */
export const modelInferenceLog = pgTable(
  "model_inference_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    modelName: text("model_name").notNull(),
    inputHash: text("input_hash").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    callKind: text("call_kind").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("model_inference_log_model_idx").on(table.modelName, table.createdAt),
    index("model_inference_log_user_idx").on(table.userId, table.createdAt),
    index("model_inference_log_kind_idx").on(table.callKind, table.createdAt),
  ]
);

/**
 * Cached 384-dim profile embedding for semantic matching.
 * Recomputed on profile change only (not per call).
 * Model version tracked so we can re-embed on upgrade.
 */
export const userProfileEmbedding = pgTable("user_profile_embedding", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // pgvector: `vector(384)` would be ideal, but we use real[] for zero-extension compatibility
  // Switch to pgvector + sql`vector(384)` later if recall improves
  embedding: real("embedding").array().notNull(),
  modelVersion: text("model_version").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Pronunciation scores per clip. Stored for analytics + peer comparison
 * + per-user progress tracking.
 */
export const pronunciationScore = pgTable(
  "pronunciation_score",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    audioPath: text("audio_path").notNull(),
    expectedText: text("expected_text").notNull(),
    score: integer("score").notNull(),
    perWordErrors: jsonb("per_word_errors"),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pronunciation_score_user_idx").on(table.userId, table.createdAt),
  ]
);

/**
 * CEFR placements over time. Re-graded by server when network sync
 * from on-device (F8.3) shows server-side score > mobile + 1 level.
 */
export const cefrPlacement = pgTable(
  "cefr_placement",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    level: text("level").notNull(), // A1 | A2 | B1 | B2 | C1 | C2
    score: integer("score").notNull(),
    source: text("source").notNull(), // "mcq" | "voice" | "voice-sync"
    modelVersion: text("model_version").notNull(),
    transcript: text("transcript"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cefr_placement_user_idx").on(table.userId, table.createdAt),
  ]
);
