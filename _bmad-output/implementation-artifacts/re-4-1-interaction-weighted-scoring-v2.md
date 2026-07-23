# Story RE-4.1: Interaction-Weighted Scoring (v2)

Status: ready-for-dev

## Story

As the System,
I want to adjust future recommendation scores based on the learner's interaction patterns,
So that content similar to liked items is boosted and content similar to dismissed items is suppressed.

## Acceptance Criteria

1. **Given** a learner likes a content item about "travel"
   **When** future recommendations are computed
   **Then** content tagged with "travel" or semantically similar receives a +0.3 score boost

2. **Given** a learner dismisses a content item about "business"
   **When** future recommendations are computed
   **Then** content tagged with "business" or semantically similar receives a -0.2 score penalty

3. **Given** a learner completes a content item
   **When** future recommendations are computed
   **Then** similar content receives a +0.1 score boost
   **And** this is weaker than the like boost because completion does not imply enjoyment

4. **Given** a learner bookmarks a content item
   **When** future recommendations are computed
   **Then** similar content receives a +0.2 score boost

5. **Given** a learner has multiple liked items about "food" and multiple dismissed items about "politics"
   **When** the hybrid score is computed for a candidate pool
   **Then** the "food" boost and "politics" suppression are both applied
   **And** the total score is still capped at 1.0

6. **Given** the feedback loop is active
   **When** a learner's preferences change
   **Then** the feedback loop weights are recalculated from the full interaction history
   **And** the recommendation cache is invalidated

7. **Given** a learner has no interaction history
   **When** recommendations are computed
   **Then** the feedback loop component is skipped
   **And** the base hybrid score (embedding + CEFR + tags + type) is used

## Tasks / Subtasks

- [ ] Implement `applyFeedbackLoop` function in `packages/api/src/routers/recommendations.ts` (AC: #1–#5, #7)
  - [ ] Query `userInteraction` rows for the user, grouped by action type
  - [ ] Get the content items interacted with, extract their tags
  - [ ] For each action type, apply the interaction weight map:
    - `like` → +0.3 per matching tag
    - `bookmark` → +0.2 per matching tag
    - `complete` → +0.1 per matching tag
    - `dismiss` → -0.2 per matching tag
  - [ ] `view` and `share` → no weight (neutral)
  - [ ] Handle competing signals: sum all boosts/penalties, clamp final score to [0, 1.0] (AC: #5)
  - [ ] Skip entirely if no interaction history (AC: #7)
  - [ ] Update `computeHybridScores` to call `applyFeedbackLoop` after base scoring
- [ ] Wire cache invalidation into `trackInteraction` procedure (AC: #6)
  - [ ] After recording the interaction, delete `recommendationScore` rows for that `userId`
- [ ] Write ATDD tests in `packages/api/src/routers/__tests__/interaction-feedback.test.ts`
  - [ ] T-4.1-01: Like → +0.3 boost (P0)
  - [ ] T-4.1-02: Dismiss → -0.2 penalty (P0)
  - [ ] T-4.1-03: Complete → +0.1 boost (P1)
  - [ ] T-4.1-04: Bookmark → +0.2 boost (P1)
  - [ ] T-4.1-05: Combined like+dismiss → both applied, total ≤ 1.0 (P0)
  - [ ] T-4.1-06: No history → feedback component = 0, no crash (P0)
  - [ ] T-4.1-07: Score cap: boosted > 1.0 → clamped to 1.0 (P0)
  - [ ] T-4.1-08: Score cap: penalised < 0 → clamped to 0 (P1)
  - [ ] T-4.1-09: Tag match boosts same-tag content (P1)
  - [ ] T-4.1-10: Cache invalidated after new interaction (P2)
- [ ] Update sprint-status.yaml to `review`

## Dev Notes

### Current State (what exists)

`computeHybridScores(userId, limit)` in `packages/api/src/routers/recommendations.ts` (line 71):
- Loads user embedding, CEFR level, preferences
- Computes base score from: embedding similarity (×0.4), CEFR closeness (×0.3), tag overlap with interests (×0.2), type preference (+0.1)
- Capped at 1.0, sorted, returned
- **Missing:** no interaction-based feedback loop (this story)

`trackInteraction` procedure (line 485):
- Inserts into `userInteraction` table with userId, contentId, action
- Uses upsert on (userId, contentId, action) conflict target
- **Missing:** no cache invalidation after recording interaction

`userInteraction` DB table (in `packages/db/src/schema/recommendations.ts` line 77):
- Fields: id, userId, contentId, action, value, metadata, createdAt
- Unique constraint on (userId, contentId, action)
- Actions: "view" | "like" | "bookmark" | "complete" | "share" | "dismiss"

`recommendationScore` table (line 109):
- Cached per (userId, contentId, scoreType) with unique constraint
- Deleting rows forces next `getRecommendations` call to recompute

### Interaction Weight Map

| Action     | Weight | Rationale                                    |
|------------|--------|----------------------------------------------|
| `like`     | +0.3   | Strong positive signal                       |
| `bookmark`  | +0.2   | Intent to revisit                            |
| `complete` | +0.1   | Completion, but may not indicate enjoyment   |
| `dismiss`  | -0.2   | Explicit negative signal                     |
| `view`     | 0.0    | Neutral — just a look                        |
| `share`    | 0.0    | Ambiguous — could be for others, not self    |

### Algorithm Design

The `applyFeedbackLoop` function will:

1. Fetch all `userInteraction` rows for `userId` with `action IN ("like", "bookmark", "complete", "dismiss")` joined to `contentItem` to get tags
2. For each interaction, extract the content's tags and apply the corresponding weight to each tag
3. Aggregate: for each candidate content item being scored, check if it shares tags with interacted items
   - Sum all matching tag boosts/penalties per candidate
   - Apply the aggregate adjustment to the candidate's score
4. Clamp final score to [0, 1.0]

**Key consideration:** To avoid O(n·m) scaling (n = interactions, m = candidates), aggregate interaction tag weights into a map (`tag → netWeight`) first, then score candidates against that map. This gives O(n + m·k) where k is tags per candidate.

### Cache Invalidation

After `trackInteraction` records a new interaction:
```typescript
db.delete(recommendationScore)
  .where(eq(recommendationScore.userId, userId))
  .catch(err => console.error("cache-invalidate after interaction failed", err));
```
This forces the next `getRecommendations` call to recompute scores with fresh interaction weights.

### Edge Cases

- **No interactions** (AC7): Return 0 adjustment, use base hybrid score
- **Only neutral interactions** (view/share): Same as no interactions — 0 adjustment
- **Competing signals** (AC5): Like food (+0.3) + dismiss politics (-0.2) → +0.1 net if a candidate has both tags
- **Score cap** (AC5): Final score clamped to [0, 1.0] after adjustment
- **Tag overlap ambiguity**: A candidate matching both a liked tag and a dismissed tag gets both adjustments applied (summed)

### References

- Epic spec: [Source: _bmad-output/planning-artifacts/epics-recommendation-engine.md#Story RE-4.1]
- Test plan: [Source: _bmad-output/implementation-artifacts/epic-re-4-test-design.md]
- Implementation target: `packages/api/src/routers/recommendations.ts` (computeHybridScores, trackInteraction)
- DB schema: `packages/db/src/schema/recommendations.ts` (userInteraction, recommendationScore)
- Test file (new): `packages/api/src/routers/__tests__/interaction-feedback.test.ts`

## Dev Agent Record

### Agent Model Used

BAD coordinator (claude-sonnet-4-6)

### Debug Log References

### Completion Notes List

### File List

- `packages/api/src/routers/recommendations.ts` (modify — computeHybridScores + applyFeedbackLoop, trackInteraction cache invalidation)
- `packages/api/src/routers/__tests__/interaction-feedback.test.ts` (new — ATDD tests)
