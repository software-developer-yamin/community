# Story RE-2.1: Compute Content Embedding on Creation

Status: ready-for-dev

## Story

As the System,
I want to compute a real semantic embedding for every new content item using the BGE-small-en-v1.5 model,
so that the 40% weighted similarity component of the hybrid score is signal, not noise.

**GH Issue:** #46

## Acceptance Criteria

1. **AC1 — Happy path:** When an admin creates a content item with title, description, and tags, the system calls `POST ${EMBED_URL}/embed` with `title + " " + description + " " + tags.join(", ")` and stores the resulting 384-dimensional vector in `content_embedding` with `modelVersion: "bge-small-en-v1.5-int8@1:f8.2"`.

2. **AC2 — Embed service unavailable (500/timeout):** The item is still created successfully. The item is implicitly flagged as "embedding pending" (no row in `content_embedding`). The item is excluded from cosine-similarity scoring until embedding is computed.

3. **AC3 — Background retry:** A `retryPendingEmbeddings` admin procedure queries items with no `content_embedding` row and calls the embed service for each, inserting/upserting the result.

4. **AC4 — Hybrid score uses real embedding:** When `getRecommendations` runs, cosine similarity uses the stored `content_embedding.embedding` vector (not a zero/fallback vector).

5. **AC5 — Feature flag:** A feature flag (`RECOMMENDATIONS_ENABLED` env var, default `false`) gates the user-facing `getRecommendations` endpoint. When `false`, the endpoint returns an empty array or HTTP 403. Feed must not be enabled until real embeddings are confirmed for all content.

6. **AC6 — Empty catch fix:** The current `catch {}` block in `createContent` must log the error and not silently swallow it (at minimum `console.error` for debugging; ideally structured log).

## Tasks / Subtasks

- [ ] Task 1 — Fix modelVersion string (AC1)
  - [ ] Change `"bge-small-en-v1.5-int8@1"` → `"bge-small-en-v1.5-int8@1:f8.2"` in both the `insert` and `onConflictDoUpdate` in `createContent`
  - [ ] Apply same fix in `retryPendingEmbeddings` upsert (AC3)

- [ ] Task 2 — Fix silent catch block (AC6)
  - [ ] In `createContent`, replace empty `catch {}` with `catch (err) { console.error("[embed] createContent embedding failed", err); }`

- [ ] Task 3 — Implement `retryPendingEmbeddings` admin procedure (AC3)
  - [ ] Already partially done: `listPendingEmbeddings` exists in worktree
  - [ ] Add `retryPendingEmbeddings` procedure that calls embed service for each pending item and upserts result

- [ ] Task 4 — Feature flag for `getRecommendations` (AC5)
  - [ ] Read `process.env.RECOMMENDATIONS_ENABLED` (string `"true"` enables; anything else or absent = disabled)
  - [ ] In `getRecommendations`, if disabled, return `[]` (no 403 needed — graceful empty is acceptable)
  - [ ] Document flag in `.env.example` (server app)

- [ ] Task 5 — Write unit tests (test design T-2.1-01 through T-2.1-08)
  - [ ] Test file: `packages/api/src/routers/__tests__/content-embedding.test.ts`
  - [ ] Mock `fetch` for embed service calls
  - [ ] T-2.1-01: happy path — embed returns 384-dim → stored
  - [ ] T-2.1-02: embed returns 500 → item still created, no row in content_embedding
  - [ ] T-2.1-03: embed throws (timeout) → item still created, no row in content_embedding
  - [ ] T-2.1-04: embed returns 256-dim → Zod rejects, item still created, no row
  - [ ] T-2.1-07: modelVersion stored as `"bge-small-en-v1.5-int8@1:f8.2"` exactly
  - [ ] T-2.1-08: content with no tags → text = `"title description "` (no trailing comma)

- [ ] Task 6 — Update sprint-status.yaml in repo root
  - [ ] Set `re-2-1-compute-content-embedding-on-creation: ready-for-dev`
  - [ ] Set `epic-re-2: in-progress`

## Dev Notes

### Current State of Worktree (story-re-2-1-content-embedding branch)

The worktree at `.worktrees/story-re-2-1-content-embedding` already has **partial implementation** committed:

**`packages/api/src/routers/models.ts`** — 2 changes:
- `EMBED_URL` exported (was private)
- `embedSchema` exported (was private)

**`packages/api/src/routers/recommendations.ts`** — changes (uncommitted):
- `isNull` imported from drizzle-orm
- `EMBED_URL`, `embedSchema` imported from `./models`
- `createContent` handler now calls embed service after insert
- `listPendingEmbeddings` admin procedure added (returns items with no embedding row)
- `retryPendingEmbeddings` admin procedure added (loops pending, calls embed, upserts)

**KNOWN BUGS IN PARTIAL IMPLEMENTATION (fix these):**
1. `modelVersion` is `"bge-small-en-v1.5-int8@1"` — missing `:f8.2` suffix. Must be `"bge-small-en-v1.5-int8@1:f8.2"` (AC1).
2. `catch {}` is empty — silently swallows embed errors (violates AC6, risk R3 from test design).

### Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/routers/recommendations.ts` | Fix modelVersion, fix catch block, add feature flag to getRecommendations |
| `packages/api/src/routers/__tests__/content-embedding.test.ts` | NEW — unit tests |
| `apps/server/.env.example` | Add `RECOMMENDATIONS_ENABLED=false` |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` (repo root) | Status update |

### Architecture: "Embedding Pending" Design

"Embedding pending" is tracked implicitly — a content item without a corresponding row in `content_embedding` is pending. No separate boolean column exists. This is intentional:

```sql
-- "pending" query:
SELECT ci.id FROM content_item ci
LEFT JOIN content_embedding ce ON ci.id = ce.content_id
WHERE ce.content_id IS NULL
```

The `listPendingEmbeddings` procedure already uses this pattern.

### Embedding Service Contract

- Endpoint: `POST ${EMBED_URL}/embed`  (default: `http://127.0.0.1:9100`)
- Request body: `{ text: string }`
- Response: `{ embedding: number[] }` — must be length 384
- Validation: `embedSchema` (Zod, `z.array(z.number()).length(384)`)
- Model version string stored: `"bge-small-en-v1.5-int8@1:f8.2"` (the `:f8.2` is the quantization tag from `MODEL_STACK_VERSION` env, hardcoded per AC)

### Feature Flag Implementation Pattern

```typescript
// In getRecommendations handler:
const recsEnabled = process.env.RECOMMENDATIONS_ENABLED === "true";
if (!recsEnabled) return [];
```

Add to `apps/server/.env.example`:
```
# Enable recommendation feed (requires real embeddings for all content)
RECOMMENDATIONS_ENABLED=false
```

### Testing Pattern (matches existing tests)

Look at `packages/api/src/routers/__tests__/bulk-import.test.ts` for test patterns used in this project:
- Uses `bun:test` (`describe`, `test`, `expect`)
- Mocks with `mock()` from bun
- Tests the procedure functions directly (not HTTP layer)

For embedding tests, mock `fetch` via `mock.module("node:fetch", ...)` or via global `fetch` spy depending on how the router imports it.

### Project Structure Notes

- All API procedures live in `packages/api/src/routers/recommendations.ts`
- Test files: `packages/api/src/routers/__tests__/*.test.ts`
- DB schema: `packages/db/src/schema/recommendations.ts` — `contentEmbedding` table already exists, no schema migration needed
- `EMBED_URL` and `embedSchema` are now exported from `packages/api/src/routers/models.ts`
- Sprint status file (repo root): `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Previous RE-1 Learnings

From RE-1.2 (bulk-import) and RE-1.3 (secure-content-creation):
- Use `adminProcedure` (not `protectedProcedure`) for admin-only operations
- Ultracite enforces `interface` over `type` for object types — use `interface` in test files
- Move regex literals to module scope (lint rule: `useTopLevelRegex`)
- Run `pnpm dlx ultracite fix` before commit to auto-fix most lint issues

### References

- Epic: `_bmad-output/planning-artifacts/epics-recommendation-engine.md#Story RE-2.1`
- Test design: `_bmad-output/implementation-artifacts/epic-re-2-test-design.md`
- DB schema: `packages/db/src/schema/recommendations.ts` — `contentEmbedding` table
- Embed model: `packages/api/src/routers/models.ts` — `EMBED_URL`, `embedSchema`
- Existing procedures: `packages/api/src/routers/recommendations.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (BAD solo mode, Step 1 — Create Story)

### Debug Log References

N/A

### Completion Notes List

- Story created from partial worktree implementation context
- modelVersion bug identified and documented (`:f8.2` suffix missing)
- Empty catch bug documented (R3 risk from test design)
- Feature flag (AC5) is NEW — not yet implemented in worktree

### File List

- `_bmad-output/implementation-artifacts/stories/epic-re-2-story-re-2-1.md` (this file)
