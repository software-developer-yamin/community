---
baseline_commit: 30b18ea
---

# Story RE-2.1: Compute Content Embedding on Creation

**Epic:** Epic RE-2: Content Embeddings & Profile Intelligence
**GH Issue:** [#46](https://github.com/software-developer-yamin/community/issues/46)
**Status:** ready-for-dev

## Story

As the System,
I want to compute a real semantic embedding for every new content item using the BGE-small-en-v1.5 model,
So that the 40% weighted similarity component of the hybrid score is signal, not noise.

## Acceptance Criteria

1. **Embedding computed on creation** — Given an admin creates a content item with title, description, and tags, When the creation is confirmed, Then the system calls `POST ${EMBED_URL}/embed` with `title + " " + description + " " + tags.join(", ")`, And the resulting 384-dimensional vector is stored in `content_embedding` with `modelVersion: "bge-small-en-v1.5-int8@1:f8.2"`. (issue#46-L8-L14)

2. **Graceful failure on embed service down** — Given the embedding service is unavailable (returns 500 or timeout), When a content item is created, Then the item is still created successfully, And no `content_embedding` row is inserted (item is implicitly "embedding pending"), And it is excluded from similarity scoring until the embedding is computed. (issue#46-L16-L20)

3. **Background retry mechanism** — Given a content item has no embedding (pending), When the embedding service becomes available again, Then a `retryContentEmbedding` procedure computes the embedding, And the item becomes eligible for similarity scoring. (issue#46-L22-L25)

4. **Recommendation feed uses real embeddings** — Given a content item has a computed embedding, When the hybrid score is calculated for a user, Then the cosine similarity between the user's profile embedding and the content embedding is computed correctly. (issue#46-L27-L29)

5. **Feature gate for user-facing feed** — Given the recommendation feed is displayed, When real embeddings are available for all content, Then the feed is enabled for user-facing access, And a feature flag prevents user-facing feed access until real embeddings are confirmed. (issue#46-L31-L34)

6. **Bulk content import also computes embeddings** — Given content is created via the bulk import endpoint, When an import task completes, Then embeddings are computed for each imported content item, following the same pattern (success = insert, failure = pending).

## Tasks / Subtasks

- [ ] Task 1: Modify `createContent` to compute embedding after insert
  - [ ] 1.1 After `db.insert(contentItem)`, build text from `title + " " + description + " " + tags.join(", ")`
  - [ ] 1.2 Call `POST ${EMBED_URL}/embed` with the text, validate via `embedSchema`
  - [ ] 1.3 On success, insert into `contentEmbedding` table with `modelVersion: "bge-small-en-v1.5-int8@1:f8.2"`
  - [ ] 1.4 On failure (fetch error or parse error), log and continue — item still created, no `contentEmbedding` row
  - [ ] 1.5 Reuse `embeddSchema` or define inline (currently in `models.ts`, may need extraction)

- [ ] Task 2: Create `retryContentEmbedding` procedure
  - [ ] 2.1 Input: `contentId` (uuid)
  - [ ] 2.2 Fetch content item by ID
  - [ ] 2.3 Call embed service with same text composition, insert/update `contentEmbedding`
  - [ ] 2.4 Return success/failure status

- [ ] Task 3: Create `listPendingEmbeddings` procedure (admin)
  - [ ] 3.1 Query `contentItem` left join `contentEmbedding` where `contentEmbedding.contentId IS NULL`
  - [ ] 3.2 Return list of items without embeddings (for admin retry UI)

- [ ] Task 4: Update `getRecommendations` to exclude items without embeddings
  - [ ] 4.1 Inner join or filter where `contentEmbedding.contentId IS NOT NULL` in the hybrid scoring query
  - [ ] 4.2 If no content has embeddings, return empty set

- [ ] Task 5: Extract `embedSchema` and `EMBED_URL` for sharing
  - [ ] 5.1 Move `embedSchema` and `EMBED_URL` constant to a shared location (or just import from `models.ts`)
  - [ ] 5.2 Alternatively, keep separate — both files are in the same package and can import from each other

- [ ] Task 6: Bulk import embedding support
  - [ ] 6.1 Modify the bulk import router to also compute embeddings after insertion
  - [ ] 6.2 Handle batch embedding: compute per-item (serial, not parallel) to avoid overwhelming the embed service

- [ ] Task 7: Mark `getRecommendations` as stub/disabled until embeddings confirmed
  - [ ] 7.1 Add early return in `getRecommendations` that returns `{ items: [], reason: "embeddings_pending" }` when no content embeddings exist
  - [ ] 7.2 This prevents exposing a broken/unranked feed

- [ ] Task 8: Verification
  - [ ] 8.1 LSP diagnostics clean on changed files
  - [ ] 8.2 Build passes (`pnpm check-types`)
  - [ ] 8.3 `pnpm dlx ultracite fix` run
  - [ ] 8.4 No `console.log`, no `as any`

## Dev Notes

- **`createContent`** is at `packages/api/src/routers/recommendations.ts:390-413`. Already imports `contentEmbedding` from `@community/db/schema/recommendations` at line 14.
- **`EMBED_URL`** is defined in `models.ts:22` as `env.EMBED_URL ?? "http://127.0.0.1:9100"`. Either share via import or re-define.
- **Embed fetch pattern** from `models.ts:262-270`: `fetch(EMBED_URL + "/embed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) })` → validate with `embedSchema` (z.object({ embedding: z.array(z.number()).length(384) })).
- **`contentEmbedding` table** at `packages/db/schema/recommendations.ts:50-64`: `contentId` PK → FK to `contentItem.id` (cascade delete), `embedding real[]`, `modelVersion text`, `updatedAt timestamp`.
- **No `embedding_pending` column needed** — absence of a `contentEmbedding` row = pending.
- **`getRecommendations`** at `recommendations.ts` handles hybrid scoring. Need to add left join to `contentEmbedding` and filter.
- **Bulk import** is likely in `recommendations.ts` — check `importContent` or similar.
- The `getRecommendationsHandler` is imported — need to find and modify it to filter out items without embeddings.
- Use `pnpm dlx ultracite fix` before committing. No `console.log`, no `as any`.
- The embed schema could be shared between `models.ts` and `recommendations.ts` by extracting to a shared lib. Simplest: just copy the schema + URL constant.

### Architecture

```
createContent(title, description, tags, ...)
  → INSERT INTO content_item (...)
  → Build text: title + " " + description + " " + tags.join(", ")
  → POST /embed { text }  ────→  Embed service (BGE-small-en-v1.5)
    → SUCCESS: INSERT INTO content_embedding (contentId, embedding, modelVersion)
    → FAILURE: skip, item created without embedding (pending)

retryContentEmbedding(contentId)
  → SELECT FROM content_item WHERE id = contentId
  → Build text same way
  → POST /embed { text }
    → SUCCESS: UPSERT INTO content_embedding
    → FAILURE: return error status

getRecommendations(userId)
  → If no content_embedding rows exist → return { items: [], reason: "embeddings_pending" }
  → Otherwise: SELECT FROM content_item
      INNER JOIN content_embedding ON ...
      LEFT JOIN user_profile_embedding ON ...
      → Compute hybrid score (content-based 40% + collaborative 60%)
```

### Relevant Files

- `packages/api/src/routers/recommendations.ts` — Main target: `createContent`, `getRecommendations`, new procedures
- `packages/api/src/routers/models.ts:22,56-58,262-270` — `EMBED_URL`, `embedSchema`, embed fetch pattern
- `packages/db/src/schema/recommendations.ts:50-64` — `contentEmbedding` table definition
- `packages/api/src/routers/__tests__/` — Test files (follow re-1.3 test pattern)
- `packages/api/src/index.ts` — If procedures need registration
