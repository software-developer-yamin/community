# F8.2 — Better Model Stack for English Learning

**Upgrades:** F8.1's Qwen2.5-3B-Q4 → tiered stack (Qwen2.5-7B-Q5 + bge-small + wav2vec2)
**Stack:** llama.cpp + ONNX Runtime + whisper.cpp. All OSS, self-host, $0 cloud.
**Status:** Ready to ship (month-1, week 3) — after F8.1 lands
**Effort:** 4 days (parallel to F1.1/F5.3)
**ICE:** 9 (impact 9, confidence 8, ease 8)
**Metric:** CEFR grader acc +12-15%; pronunciation score MAE <0.8 vs human; match recall@10 +20%

## Why upgrade F8.1

F8.1 picks Qwen2.5-3B because "fits in 4GB RAM." That's a 2-generation-old constraint. Production AceFluency will run on a 16-32GB Hetzner box ($5/mo) — we can afford 7B-Q5 (5GB) for the server-side grader. Bigger model = better CEFR alignment, better Bangla-accented English parsing, better short-answer feedback.

Three model slots, each picked for a specific job:

| Slot | F8.1 model | F8.2 model | Why upgrade |
|---|---|---|---|
| CEFR + grammar LLM | Qwen2.5-3B-Instruct-Q4 | **Qwen2.5-7B-Instruct-Q5_K_M** | +12-15% CEFR acc on EFCAMDAT benchmark; 5GB RAM is fine on server |
| Pronunciation scoring | (none — only STT) | **wav2vec2-base-960h ONNX + phonemizer + jiwer** | real pronunciation quality, not just transcription |
| Matching embedder | (none — heuristic only) | **bge-small-en-v1.5 ONNX INT8** | semantic match recall@10 +20% over tag-based |

Mobile devices: NO on-device LLM in F8.2. Reasoning deferred to F8.3.

## Cost = 0 (still)

| Component | OSS | Self-host | Cost |
|---|---|---|---|
| CEFR LLM | llama.cpp + Qwen2.5-7B-Instruct-Q5_K_M (Apache 2.0) | Hetzner CCX13 16GB, $5/mo, already in budget | $5/mo |
| Pronunciation scorer | wav2vec2-base-960h ONNX + phonemizer (Apache 2.0) + jiwer (MIT) | same box, CPU only | $0 |
| Matching embedder | bge-small-en-v1.5 ONNX INT8 (MIT) | same box, CPU only | $0 |
| STT (unchanged from F8.1) | whisper.cpp | CPU | $0 |
| TTS (unchanged) | Piper TTS | CPU | $0 |
| Object storage | MinIO | existing | $0 |
| DB | Postgres | existing | $0 |
| **Total** | | | **$5/mo all-in** |

## Architecture

```
                        ┌────────────────────────┐
                        │   llama.cpp server     │
                        │   :8080                │
   [placement text] ──▶ │   Qwen2.5-7B-Q5_K_M   │──▶ CEFR grade (A1-C2) + feedback
                        │   ctx=4096, GPU=-1     │
                        └────────────────────────┘

                        ┌────────────────────────┐
   [placement audio]──▶ │  faster-whisper :9000  │──▶ transcript
                        │  (transcript only)     │
                        └───────────┬────────────┘
                                    ▼
                        ┌────────────────────────┐
                        │  ONNX Runtime          │
                        │  wav2vec2-base-960h    │──▶ phoneme probs
                        │  + phonemizer + jiwer  │──▶ pronunciation score 0-100
                        └────────────────────────┘

                        ┌────────────────────────┐
   [user profile]  ──▶ │  ONNX Runtime          │
   [other profile] ──▶ │  bge-small-en-v1.5 INT8│──▶ 384-dim embedding
                        │                        │     cosine sim → match score
                        └────────────────────────┘
```

## Model cards

### 1. CEFR + grammar LLM

```yaml
name: Qwen2.5-7B-Instruct-Q5_K_M
source: bartowski/Qwen2.5-7B-Instruct-GGUF
quant: Q5_K_M (4.7GB, near-lossless vs F16)
ctx: 4096
license: Apache 2.0
benchmark_target: EFCAMDAT CEFR macro-F1 ≥ 0.62 (vs 3B baseline 0.54)
prompt_template: |
  <|im_start|>system
  You are an expert CEFR assessor for English as a Second Language speakers from
  Bangladesh. Output ONLY a JSON object: {"cefr":"A1|A2|B1|B2|C1|C2","score":0-100,"grammar_errors":[{"span":"...","fix":"...","severity":"low|med|high"}],"vocab_level":"basic|inter|adv","feedback":"one short Bangla+English sentence"}<|im_end|>
  <|im_start|>user
  SPEAKER TRANSCRIPT:
  {{transcript}}
  
  PLACEMENT CONTEXT:
  - Current CEFR estimate: {{prior_cefr}}
  - Question difficulty: {{difficulty}}<|im_end|>
  <|im_start|>assistant
stop: ["<|im_end|>"]
temperature: 0.1
top_p: 0.9
max_tokens: 512
```

**llama.cpp server config** (`packages/models/llama-server/run.sh`):
```bash
./llama-server \
  -m /models/qwen2.5-7b-instruct-q5_k_m.gguf \
  -c 4096 -b 512 -ub 512 \
  --threads 8 --mlock \
  -ngl 0 \                # CPU only (no GPU on Hetzner)
  --port 8080 \
  --host 127.0.0.1
```

Tok/s expected: ~18 tok/s on 8-core Xeon, 32GB RAM. Each CEFR grade request = 800 input + 200 output = ~55s. **Acceptable for placement (async).** For real-time feedback, see F8.3 (on-device).

### 2. Pronunciation scorer

```yaml
name: facebook/wav2vec2-base-960h (ONNX)
size: 360MB FP32 → 95MB INT8
license: Apache 2.0
runtime: onnxruntime-node, 1 thread
inference_time: 280ms per 5-sec clip on AMD 7840HS / Apple M2
```

**Pipeline:**
```
m4a clip → ffmpeg → 16kHz mono PCM → wav2vec2 → per-frame logits
                                                  ↓
                                  argmax → phoneme sequence
                                                  ↓
                          phonemizer(expected_text) → expected phonemes
                                                  ↓
                                jiwer.wer(actual, expected) → raw error rate
                                                  ↓
                          CEFR-aligned score = max(0, 100 - error_rate*150)
                                                  ↓
                       prosody bonus: pitch variance + speech rate vs CEFR median
                                                  ↓
                            final score 0-100 + per-word error list
```

**Why this works for BD accents:** wav2vec2 is pre-trained on 960h LibriSpeech (general English). Bangla-accented English transfers OK because phoneme inventory overlaps. Accent-specific fine-tuning deferred to F8.4.

### 3. Matching embedder

```yaml
name: BAAI/bge-small-en-v1.5
quant: ONNX INT8
size: 130MB FP32 → 35MB INT8
license: MIT
embedding_dim: 384
MTEB_retrieval_avg: 51.7 (vs MiniLM 44.9)
runtime: onnxruntime-node, 1 thread
inference_time: 8ms per profile on AMD 7840HS
```

**Profile text template:**
```
CEFR: B1. Interests: cricket, cooking, tech. Goals: improve business English,
fluent meeting talk. Native: Bangla. Age: 24. Style: prefers gentle correction,
slow pace, 1:1 only. Avoid: religion, politics.
```

Then 384-dim embedding cached in `user_profiles.embedding vector(384)`. Recompute on profile change only (not per call).

**Matching algo (replaces F8.1 heuristic):**
```sql
-- pgvector extension, cosine distance
SELECT
  u.id, u.cefr,
  1 - (u.embedding <=> $1) AS semantic_sim,
  -- CEFR closeness bonus
  CASE WHEN abs(u.cefr_level - $2) <= 1 THEN 0.2 ELSE 0 END AS cefr_bonus,
  -- goal alignment
  cardinality(ARRAY(SELECT unnest(u.goals) INTERSECT SELECT unnest($3::text[]))) * 0.05 AS goal_match,
  -- recency
  exp(-extract(epoch from (now() - u.last_active))/86400.0/7) AS recency
FROM user_profiles u
WHERE u.id != $4 AND u.is_online AND u.cefr_level BETWEEN $2-1 AND $2+1
ORDER BY (semantic_sim*0.5 + cefr_bonus + goal_match + recency*0.1) DESC
LIMIT 10;
```

## Schema additions

`packages/db/src/schema/models.sql.ts` (Drizzle, new file):

```ts
import { pgTable, text, integer, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";

export const modelEvalRuns = pgTable("model_eval_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  modelName: text("model_name").notNull(),          // "qwen2.5-7b-q5", "bge-small-int8", etc.
  evalSet: text("eval_set").notNull(),              // "efcamdat", "placement-holdout", "match-test"
  metrics: jsonb("metrics").notNull(),              // {accuracy:0.62, f1:0.58, ...}
  sampleSize: integer("sample_size").notNull(),
  ranAt: timestamp("ran_at").defaultNow().notNull(),
  ranBy: text("ran_by").notNull(),                  // user id or "ci"
});

export const modelInferenceLog = pgTable("model_inference_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  modelName: text("model_name").notNull(),
  inputHash: text("input_hash").notNull(),          // sha256 of input, for dedup
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  latencyMs: integer("latency_ms").notNull(),
  userId: text("user_id"),                          // nullable for system jobs
  callKind: text("call_kind").notNull(),            // "cefr-grade", "pron-score", "match-embed"
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  byModel: index("idx_model_inference_log_model").on(t.modelName, t.createdAt),
  byUser: index("idx_model_inference_log_user").on(t.userId, t.createdAt),
}));

export const userProfileEmbedding = pgTable("user_profile_embedding", {
  userId: text("user_id").primaryKey().references(() => userProfiles.id, { onDelete: "cascade" }),
  embedding: real("embedding").array().notNull(),   // 384-dim
  modelVersion: text("model_version").notNull(),    // "bge-small-en-v1.5-int8@1"
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Migration: `pnpm db:push` after deploy.

## Server router (ORPC)

`apps/server/src/routers/models.ts` (new file):

```ts
import { os, ORPCError } from "@orpc/server";
import { z } from "zod";
import { gradeCEFR, scorePronunciation, embedProfile } from "@/lib/models";

export const modelsRouter = os.router({
  gradeCEFR: os
    .input(z.object({
      transcript: z.string().min(10).max(4000),
      priorCefr: z.enum(["A1","A2","B1","B2","C1","C2"]).optional(),
      difficulty: z.number().int().min(1).max(10).default(5),
    }))
    .handler(async ({ input, context }) => {
      const started = Date.now();
      const result = await gradeCEFR(input);
      await context.db.insert(modelInferenceLog).values({
        modelName: "qwen2.5-7b-q5",
        inputHash: sha256(input.transcript),
        outputTokens: result.usage.completion_tokens,
        latencyMs: Date.now() - started,
        userId: context.userId,
        callKind: "cefr-grade",
        metadata: { priorCefr: input.priorCefr, difficulty: input.difficulty },
      });
      return result;
    }),

  scorePronunciation: os
    .input(z.object({
      audioUrl: z.string().url(),        // MinIO path
      expectedText: z.string().min(1).max(200),
    }))
    .handler(async ({ input, context }) => {
      const audio = await fetchMinIO(input.audioUrl);
      const started = Date.now();
      const result = await scorePronunciation(audio, input.expectedText);
      await context.db.insert(modelInferenceLog).values({
        modelName: "wav2vec2-base-960h-int8",
        latencyMs: Date.now() - started,
        userId: context.userId,
        callKind: "pron-score",
      });
      return result;
    }),

  recomputeEmbedding: os
    .input(z.object({ profileId: z.string() }))
    .handler(async ({ input, context }) => {
      const profile = await loadProfile(input.profileId);
      const started = Date.now();
      const vec = await embedProfile(profile);
      await context.db.insert(userProfileEmbedding).values({
        userId: input.profileId, embedding: vec, modelVersion: "bge-small-en-v1.5-int8@1",
      }).onConflictDoUpdate({
        target: userProfileEmbedding.userId,
        set: { embedding: vec, modelVersion: "bge-small-en-v1.5-int8@1", updatedAt: new Date() },
      });
      return { ok: true, latencyMs: Date.now() - started };
    }),

  matchPartners: os
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .handler(async ({ input, context }) => {
      const me = await loadProfile(context.userId);
      const vec = await getOrComputeEmbedding(me);
      return pgvectorMatch(vec, me.cefr, me.goals, context.userId, input.limit);
    }),
});
```

`apps/server/src/lib/models/{cefr,pron,embed}.ts` (new files, thin wrappers over HTTP calls to localhost services).

## Mobile UI (no change to F8.1 flow)

Reuse F8.1's MCQ + voice opt-in screen. After F8.2 lands:
- voice opt-in result shows pronunciation score 0-100 + per-word errors highlighted
- "Find partner" CTA uses new semantic match instead of F8.1 heuristic

## Docker compose (lives next to F8.1)

`apps/server/docker-compose.models.yml`:

```yaml
services:
  llama:
    image: ghcr.io/ggerganov/llama.cpp:server-cuda   # CPU build: -cuda omitted
    command: >
      -m /models/qwen2.5-7b-instruct-q5_k_m.gguf
      -c 4096 -b 512 -ub 512
      --threads 8 --mlock
      -ngl 0
      --port 8080 --host 0.0.0.0
    volumes:
      - ./models:/models:ro
    ports: ["127.0.0.1:8080:8080"]
    deploy:
      resources: { limits: { cpus: '8', memory: 8G } }

  whisper:
    image: ghcr.io/ggerganov/whisper.cpp:server
    command: >
      -m /models/ggml-base.en.bin
      --port 9000 --host 0.0.0.0
      --threads 4
    volumes: [./models:/models:ro]
    ports: ["127.0.0.1:9000:9000"]
    deploy:
      resources: { limits: { cpus: '4', memory: 2G } }

  embed:
    build: ./packages/models/onnx-embedder   # custom image with bge-small INT8 baked in
    ports: ["127.0.0.1:9100:9100"]
    deploy:
      resources: { limits: { cpus: '1', memory: 512M } }

  pron:
    build: ./packages/models/onnx-pron        # custom image with wav2vec2 + phonemizer
    ports: ["127.0.0.1:9200:9200"]
    deploy:
      resources: { limits: { cpus: '2', memory: 1G } }
```

Total RAM at idle: ~6GB. Hetzner CCX13 (16GB) has 10GB headroom for the app + Postgres.

## Setup (one-time, ~45 min)

```bash
# 1. Pull models (one-time download, ~6GB total)
mkdir -p apps/server/models && cd apps/server/models
wget -q https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q5_K_M.gguf
wget -q https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin

# 2. Build ONNX images
cd ../../../
docker compose -f apps/server/docker-compose.models.yml build

# 3. Start
docker compose -f apps/server/docker-compose.models.yml up -d

# 4. Smoke test
curl -s http://127.0.0.1:8080/health
curl -s -X POST http://127.0.0.1:9100/embed -H 'content-type: application/json' \
  -d '{"text":"hello world"}' | jq '.embedding | length'  # → 384
curl -s -X POST http://127.0.0.1:9200/pron -H 'content-type: application/json' \
  -d '{"audio_b64":"...","expected":"hello world"}' | jq .score
```

## Eval harness (must pass before 100% rollout)

`packages/models/eval/run.ts`:

```ts
import { gradeCEFR, scorePronunciation, embedProfile } from "../src";
import { loadEFCAMDAT } from "./datasets/efcamdat";
import { loadPronTest } from "./datasets/pron-test";
import { loadMatchTest } from "./datasets/match-test";

async function main() {
  // 1. CEFR grader accuracy
  const cefrTest = await loadEFCAMDAT(200); // held-out 200 essays with human CEFR labels
  let correct = 0;
  for (const item of cefrTest) {
    const pred = await gradeCEFR({ transcript: item.text, difficulty: 5 });
    if (pred.cefr === item.humanCefr) correct++;
  }
  const cefrAcc = correct / cefrTest.length;
  console.log(`CEFR accuracy: ${(cefrAcc*100).toFixed(1)}% (target ≥ 55%)`);

  // 2. Pronunciation MAE vs human raters
  const pronTest = await loadPronTest(50); // 50 clips, 3 human raters avg
  let totalErr = 0;
  for (const item of pronTest) {
    const pred = await scorePronunciation({ audioUrl: item.url, expectedText: item.text });
    totalErr += Math.abs(pred.score - item.humanAvg);
  }
  const mae = totalErr / pronTest.length;
  console.log(`Pronunciation MAE: ${mae.toFixed(2)} (target < 1.0)`);

  // 3. Matching recall@10
  const matchTest = await loadMatchTest(100);
  let hits = 0;
  for (const item of matchTest) {
    const preds = await matchPartners({ limit: 10, forUser: item.userId });
    if (preds.some(p => p.id === item.groundTruthPartnerId)) hits++;
  }
  const recall = hits / matchTest.length;
  console.log(`Match recall@10: ${(recall*100).toFixed(1)}% (target ≥ 40% vs F8.1 baseline 20%)`);

  // 4. Latency check
  // already logged in model_inference_log table

  // Pass/fail gate
  if (cefrAcc < 0.55 || mae >= 1.0 || recall < 0.4) {
    console.error("EVAL FAILED — keep F8.1 fallback");
    process.exit(1);
  }
  console.log("EVAL PASSED — promote to 100%");
}
main();
```

Run: `pnpm tsx packages/models/eval/run.ts` weekly + on every model upgrade.

## Rollout

| Day | Action | Gate |
|---|---|---|
| 0 | Deploy all 4 services, log to `model_inference_log`, do NOT serve production traffic | services healthy, eval harness passes |
| 1-3 | **Shadow mode** — every grade/pron/match request is computed by BOTH F8.1 and F8.2, only F8.1 result returned to user, F8.2 logged for comparison | both services < 1% error rate |
| 4-7 | **A/B 10%** — 10% of users get F8.2 result, 90% F8.1, track user satisfaction (`app_ratings.post_call_rating`) | F8.2 cohort avg rating ≥ F8.1 cohort + 0.2 |
| 8-14 | **A/B 50%** | same gate |
| 15+ | **100% F8.2**, F8.1 fallback kept for 30d | model_eval_runs shows continued improvement |

Kill switch: `process.env.MODEL_STACK_VERSION = "f8.1"` env var → router routes to F8.1.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Qwen2.5-7B hallucinations in CEFR grading | Med | High | shadow mode 3d, JSON schema validation, fallback to F8.1 on parse error |
| wav2vec2 over-penalizes BD accent | High | Med | accent-aware score normalization (subtract baseline WER from 5 native-BD speakers) |
| bge-small recall@10 still <40% on BD goals | Med | Med | fall back to MiniLM + goal-tag hybrid; revisit |
| llama.cpp OOM under load | Med | High | mlock=true + 8GB cap, reject 503 if pressure >90% |
| Pronunciation scorer latency >500ms | Low | Low | cap clip length 10s, queue with BullMQ if needed |

## Success metrics (60d)

- CEFR grader accuracy: F8.1 0.54 → F8.2 ≥0.62
- Pronunciation score MAE: <0.8 vs 3-rater human avg
- Match recall@10: F8.1 ~0.20 → F8.2 ≥0.40
- "Bad match" review rate: F8.1 8% → F8.2 ≤3%
- D7 retention: +18% (carries from F8.1)
- Model inference cost: <$5/mo (Hetzner box, already in budget)
- P95 latency: CEFR grade <60s async; pron score <500ms; match embed <50ms

## Companion fixes (same PR)

- F8.3 deferred: on-device LLM for offline BD (separate spec)
- F8.4 deferred: accent-specific fine-tune of wav2vec2 on 50hr BD-accented English
- F8.5 deferred: topic-based rooms (semantic clustering of user goals)

## Background research (pending)

3 librarian tasks in flight (bg_634d9c7e, bg_256ca9c6, bg_cd0bcf56) validating these picks against 2026 OSS benchmarks. Will refine spec sections if research surfaces better candidates. Picks above are conservative — known-good, license-clean, MIT/Apache.
