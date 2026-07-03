# Story RE-2.2: Recompute Content Embedding on Update

Status: done

<!-- Note: Implementation was completed prior to story file creation. Story created retrospectively by BAD coordinator. -->

## Story

As the System,
I want to recompute a content item's embedding when its title, description, or tags change,
so that the semantic representation stays accurate and recommendation quality is maintained.

## Acceptance Criteria

1. **Given** an admin updates a content item's title or description  
   **When** the update is saved  
   **Then** the embedding is recomputed automatically  
   **And** the old embedding is replaced by the new one

2. **Given** an admin updates only the thumbnail_url or source_url  
   **When** the update is saved  
   **Then** the embedding is NOT recomputed  
   **And** the existing embedding remains active

3. **Given** an embedding recomputation is triggered  
   **When** the embedding service is unavailable  
   **Then** the update is still saved  
   **And** the item is flagged as "embedding pending"  
   **And** the old embedding continues to be used until the new one is available

## Tasks / Subtasks

- [x] Detect semantic field changes (title, description, tags) in `updateContent` handler (AC: #1, #2)
  - [x] Set `semanticChanged` flag based on diff against current DB values
- [x] Inline embed call on semantic change: `POST ${EMBED_URL}/embed` (AC: #1)
  - [x] Upsert result into `content_embedding` with `modelVersion: "bge-small-en-v1.5-int8@1:f8.2"`
- [x] Graceful fallback when embed service unavailable (AC: #3)
  - [x] Retain old embedding (do not delete)
  - [x] Flag item as `modelVersion: "pending"` in content_embedding upsert
- [x] No re-embed for non-semantic fields (thumbnail_url, source_url) (AC: #2)

## Dev Notes

### Implementation Summary

The implementation is in `packages/api/src/routers/recommendations.ts`, procedure `updateContent` (line ~935).

**Semantic change detection (lines ~978–983):**
```typescript
const semanticChanged =
  (data.title != null && data.title !== existing.title) ||
  (data.description != null && data.description !== existing.description) ||
  (data.tags != null);
```

**Embed call pattern (lines ~983–1028):**
- If `semanticChanged`: calls `fetch(${EMBED_URL}/embed, ...)` using `buildContentEmbedText()`
- On success: upserts `content_embedding` with real vector + `modelVersion: "bge-small-en-v1.5-int8@1:f8.2"`
- On embed service failure (any exception): upserts `content_embedding` with `modelVersion: "pending"` (old embedding preserved by upsert conflict behavior)

**Key files touched:**
- `packages/api/src/routers/recommendations.ts` — `updateContent` procedure

**Helpers reused from RE-2.1:**
- `buildContentEmbedText()` — constructs embed text string
- `EMBED_URL`, `embedSchema` — imported from `./models`

### Project Structure Notes

- Pattern matches RE-2.1's `createContent` embed flow exactly
- Uses `onConflictDoUpdate` upsert on `contentEmbedding` table (keyed on `contentId`)
- `modelVersion: "pending"` is the existing sentinel value for background retry jobs

### References

- Epic spec: [Source: _bmad-output/planning-artifacts/epics-recommendation-engine.md#Story RE-2.2]
- Test plan: [Source: _bmad-output/implementation-artifacts/epic-re-2-test-design.md#RE-2.2]
- Implementation: [Source: packages/api/src/routers/recommendations.ts#updateContent]
- RE-2.1 story (pattern reference): [Source: _bmad-output/implementation-artifacts/re-2-1-compute-content-embedding-on-creation.md]

## Dev Agent Record

### Agent Model Used

BAD coordinator (claude-sonnet-4-6) — retrospective story file creation

### Debug Log References

None — implementation committed prior to story file: commit `88b079f`

### Completion Notes List

- Implementation completed in commit `88b079f feat(re-2.2): updateContent recomputes embedding on semantic field changes`
- Commit message: "Replaces the old 'set modelVersion=pending always' approach with inline embed service call. On success: upserts real embedding. On failure: flags pending for background retry."
- All 3 ACs satisfied by implementation
- GH Issue: [#47](https://github.com/software-developer-yamin/community/issues/47)

### File List

- `packages/api/src/routers/recommendations.ts` (modified — updateContent procedure)
