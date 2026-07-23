# Story 7.2: Rating Integration with Matching

**Epic:** Epic 7: Post-Call Rating & Quality
**GH Issue:** [#38](https://github.com/software-developer-yamin/community/issues/38)
**Status:** 🚧 Planned

## User Story

> As a Learner,
> I want ratings to improve my future matches,
> So that I am paired with higher-quality partners.

## Acceptance Criteria

**AC1:** Given a partner has multiple ratings, when the matching service evaluates them, then the average rating is computed, and partners with average < 2.5 stars surface lower in the queue.

**AC2:** Given a partner has no ratings, when the matching service evaluates them, then they are treated neutrally, and they are not penalized for being new.

**AC3:** Given ratings are anonymized after 90 days, when the matching service uses them, then aggregate quality metrics are preserved, and individual ratings are no longer linked to users.

**AC4:** Given the matching service ranks partners, when ratings are integrated, then the quality signal is combined with CEFR and embedding similarity, and no single metric dominates the ranking.

## Context

### Current State
- `matchPartners` handler in `packages/api/src/routers/recommendations.ts` (line 422–447) returns `[]` — it is a stub that only checks cooldown
- `callRating` table already exists in `packages/db/src/schema/rebuild.ts` with: `id`, `userId`, `partnerId`, `callRoomId`, `stars` (1–5), `helpedPractice`, `comment`, `anonymizedAt`, `createdAt`
- `ratePartner` in `packages/api/src/routers/rating.ts` writes call ratings to `callRating`
- `computeHybridScores` in `recommendations.ts` (line 46–153) shows the blending pattern: embedding (0.4), CEFR (0.3), tags (0.2), type (0.1)
- `createCallRoom` in `livekit.ts` handles room creation from match results — NOT matching logic itself

### Constraints
- No single blended signal may exceed 50% of total score (AC4)
- Partners with no ratings must score neutrally for the rating component (AC2)
- Partners with avg rating < 2.5 must receive a score penalty (AC1)
- `anonymizedAt` column already exists — no schema migration needed
- Anonymization sets `anonymizedAt` on rows older than 90 days; aggregate scoring uses all ratings (anonymized + not) since stars remain valid

## Technical Approach

### 1. Anonymization Procedure
Create a function that marks `callRating` rows with `anonymizedAt = now()` where `createdAt < now() - interval '90 days'` and `anonymizedAt IS NULL`.

Call this at the start of `matchPartners` (inline) or as a standalone scheduled job.

### 2. Rating Query
In `matchPartners`, after the cooldown check, query partner ratings:
```sql
SELECT partner_id, AVG(stars) as avg_rating, COUNT(*) as rating_count
FROM call_rating
GROUP BY partner_id
```
Normalize to 0–1 range: `ratingScore = avgRating / 5`.

### 3. Blended Scoring
For each candidate partner, compute:
- `embeddingScore` (cosine similarity of user embedding vs partner embedding) × weight
- `cefrScore` (CEFR closeness) × weight
- `ratingScore` (normalized avg rating) × weight — neutral 0.5 if no ratings, penalty if < 2.5

Weights must keep each component ≤ 50% of total.

### 4. matchPartners Implementation
Replace the stub in `recommendations.ts`:
1. Run anonymization sweep
2. Load current user's embedding + CEFR level
3. Query potential partners (online, same CEFR ±1, not self, not blocked)
4. For each candidate, compute `getPartnerRatingAggregate`
5. Compute blended score per candidate
6. Sort by score descending, return top N

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/routers/recommendations.ts` | Implement `matchPartners` logic, add rating scoring, add anonymization sweep |
| `packages/api/src/routers/recommendations.ts` | Optionally add `getPartnerRatingAggregate` helper |

## Files NOT to Modify

- `packages/db/src/schema/rebuild.ts` — `callRating` schema already has `anonymizedAt`
- `packages/api/src/routers/rating.ts` — rating write path is complete
- `packages/api/src/routers/livekit.ts` — room creation is separate

## Testing Approach

- Unit test: `computePartnerRatingScore` returns correct values for avg < 2.5, avg ≥ 2.5, no ratings
- Unit test: blended score weights sum to 1.0 and no component exceeds 50%
- Unit test: anonymization sweep correctly marks old records
- Integration test: `matchPartners` returns ranked candidates (when DB has data)
