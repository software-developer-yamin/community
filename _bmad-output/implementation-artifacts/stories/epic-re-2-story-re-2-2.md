# Story RE-2.2: Recompute Content Embedding on Update

Status: completed

## Story

As the System,
I want to recompute a content item's embedding when its title, description, or tags change,
So that the semantic representation stays accurate and recommendation quality is maintained.

**GH Issue:** #47

## Acceptance Criteria

1. **AC1 — Title/description/tags change triggers recompute:** When an admin updates a content item's title, description, or tags, the system calls `POST ${EMBED_URL}/embed` with the updated text and upserts the new embedding into `content_embedding`. The old embedding is replaced.

2. **AC2 — Non-semantic fields skip recompute:** When an admin updates only `thumbnailUrl`, `sourceUrl`, `type`, `cefrLevel`, `duration`, or `metadata`, the embedding is NOT recomputed. The existing embedding remains active.

3. **AC3 — Embed service unavailable:** If the embed service returns an error or times out during update, the update to `content_item` fields is still saved. The existing embedding row is retained (not deleted, not set to "pending"). The item is flagged for retry by setting `modelVersion = 'pending'` on the embedding row so the background retry mechanism picks it up.

4. **AC4 — Mixed update (semantic + non-semantic fields):** When an admin updates both title and thumbnailUrl in the same request, the embedding IS recomputed (semantic fields take precedence).

## Tasks / Subtasks

- [ ] Task 1 — Modify `updateContent` handler to call embed service
  - [ ] Detect whether semantic fields (title, description, tags) changed in the patch
  - [ ] Build embed text from the updated values
  - [ ] Call embed service after the DB update succeeds
  - [ ] On success: upsert new embedding with correct modelVersion
  - [ ] On failure: set embedding row `modelVersion = 'pending'` (flag for retry)
  - [ ] Still save the content_item update regardless of embed success/failure

- [ ] Task 2 — Write unit tests (test design T-2.2-01 through T-2.2-06)
  - [ ] T-2.2-01: Update title → embedding recomputed with new text
  - [ ] T-2.2-02: Update description → embedding recomputed
  - [ ] T-2.2-03: Update thumbnail_url only → embedding NOT recomputed
  - [ ] T-2.2-04: Update source_url only → embedding NOT recomputed
  - [ ] T-2.2-05: Embed service down during update → old embedding retained → flagged pending
  - [ ] T-2.2-06: Recomputed embedding replaces old one (upsert semantics)

## Dev Notes

### Current State

The `updateContent` handler in `packages/api/src/routers/recommendations.ts` already exists (lines 935-986) with:
- Schema validation for all updatable fields
- Existence check before update
- DB update with `.returning()`
- Basic title/description detection that sets `modelVersion = 'pending'`
- No actual embed service call

### Approach

The handler already has the foundation. The changes needed are:

1. **Detect semantic fields**: Check if `title`, `description`, or `tags` are present in the `patch` (the input minus `id`). These three fields are the "semantic" ones — changes to these require re-embedding.

2. **Call embed after DB update**: After successfully updating `content_item` in the DB, call the embed service with the returned (updated) item values.

3. **Upsert pattern**: Use the same `.onConflictDoUpdate` pattern as `createContent` (line 453). The target is `contentEmbedding.contentId`.

4. **Failure handling**: If the embed call fails (throws or returns non-ok), set `modelVersion = 'pending'` on the existing embedding row instead of the happy-path upsert. If no row exists yet (unlikely for updates, but possible), insert one with `modelVersion = 'pending'`.

### Embed Call Pattern

Follow the same pattern as `createContent` (lines 435-464):

```typescript
try {
  const text = buildContentEmbedText(updated);
  const res = await fetch(`${EMBED_URL}/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (res.ok) {
    const { embedding } = embedSchema.parse(await res.json());
    await db
      .insert(contentEmbedding)
      .values({
        contentId: updated.id,
        embedding,
        modelVersion: "bge-small-en-v1.5-int8@1:f8.2",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: contentEmbedding.contentId,
        set: {
          embedding,
          modelVersion: "bge-small-en-v1.5-int8@1:f8.2",
          updatedAt: new Date(),
        },
      });
  } else {
    // Non-ok response → flag pending
    await flagEmbeddingPending(db, updated.id);
  }
} catch (err) {
  console.error("[embed] updateContent embedding failed", err);
  await flagEmbeddingPending(db, updated.id);
}
```

### Testing

Test file: `packages/api/src/routers/__tests__/content-embedding.test.ts` (same file as re-2.1 tests).

Mock `fetch` the same way as `createContent` tests. Use `mock.module` or spy on global `fetch`.

For T-2.2-03 and T-2.2-04, verify that `fetch` is NOT called (no embed request made).

### Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/routers/recommendations.ts` | Update `updateContent` handler |
| `packages/api/src/routers/__tests__/content-embedding.test.ts` | Add tests T-2.2-01 through T-2.2-06 |

### References

- Epic: `_bmad-output/planning-artifacts/epics-recommendation-engine.md#Story RE-2.2`
- Test design: `_bmad-output/implementation-artifacts/epic-re-2-test-design.md` (T-2.2-01 through T-2.2-06)
- DB schema: `packages/db/src/schema/recommendations.ts`
- Embed model: `packages/api/src/routers/models.ts` — `EMBED_URL`, `embedSchema`
- Existing procedures: `packages/api/src/routers/recommendations.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (BAD solo mode, Step 1 — Create Story)

### Debug Log References

N/A

### Completion Notes List

- Story created from epic document ACs and test design
- Update handler already has partial logic (detects title/desc changes, sets pending) — needs full embed call
- Non-semantic field guard already implicitly works because the handler only checks `patch.title` and `patch.description` — needs `tags` added
- Tags were missing from the existing detection logic
