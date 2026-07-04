# Story RE-2.3: Real Profile Embeddings from User Data

Status: ready-for-dev

## Story

As the System,
I want to compute each learner's profile embedding from their actual user data (CEFR, interests, goals, native language, age, learning style),
so that the recommendation engine and partner matching use real personalization signals instead of hardcoded defaults.

## Acceptance Criteria

1. **Given** a user has a completed CEFR placement, set interests, and set native language  
   **When** the profile embedding is computed  
   **Then** the embedding uses the user's actual data, not hardcoded values

2. **Given** a user updates their interests or goals in preferences  
   **When** the update is saved  
   **Then** the profile embedding is recomputed automatically  
   **And** the recommendation cache is invalidated for that user

3. **Given** a user's CEFR placement improves (e.g., A2 → B1)  
   **When** the new placement is recorded  
   **Then** the profile embedding is recomputed  
   **And** the recommendation cache is invalidated immediately

4. **Given** a user has no interests or goals set  
   **When** the profile embedding is computed  
   **Then** it uses the CEFR, native language, and age only  
   **And** the embedding is still valid for similarity scoring

5. **Given** a user signs up for the first time  
   **When** their profile embedding is first computed  
   **Then** it uses available data from onboarding (CEFR, native language)  
   **And** interests/goals are empty arrays (not hardcoded "Bangla/food/travel")

## Tasks / Subtasks

- [ ] Fix `computeProfileEmbedding` in `packages/api/src/routers/models.ts` to remove hardcoded defaults (AC: #1, #4, #5)
  - [ ] Replace hardcoded `nativeLanguage` fallback `"Bangla"` with `"unknown"` or language code
  - [ ] Remove/replace hardcoded `age: 25` — use `"unknown"` since no age field exists in DB
  - [ ] Remove/replace hardcoded `style: "gentle correction, slow pace"` — omit or use generic default
- [ ] Trigger `computeProfileEmbedding` from `updatePreferences` when interests/goals change (AC: #2)
  - [ ] Call `computeProfileEmbedding(userId).catch(...)` asynchronously after preferences update
  - [ ] Invalidate recommendation cache (delete `recommendationScore` rows for userId)
- [ ] Verify CEFR trigger already wired (AC: #3)
  - [ ] Confirm `gradeCEFR` in `models.ts` line ~243 calls `computeProfileEmbedding` async ✅
  - [ ] Add cache invalidation there too
- [ ] Update sprint-status.yaml to `review`

## Dev Notes

### Current State (what exists)

`computeProfileEmbedding(userId)` in `packages/api/src/routers/models.ts` (line 104):
- Fetches `user`, `userProfile.nativeLanguage`, latest `cefrPlacement.level`, `userPreference.interests/goals`
- **Problem:** Falls back to hardcoded `"Bangla"` for native language (line 141-144)
- **Problem:** Uses hardcoded `age: 25` (line 151)
- **Problem:** Uses hardcoded `style: "gentle correction, slow pace"` (line 152)
- AC5 violation: falls back to "Bangla" instead of using empty/unknown

`PROFILE_TEMPLATE` (line 61-69):
```typescript
`CEFR: ${p.cefr}. Interests: ${p.interests.join(", ")}. Goals: ${p.goals.join(", ")}. Native: ${p.native}. Age: ${p.age}. Style: ${p.style}.`
```

`updatePreferences` in `packages/api/src/routers/recommendations.ts` (line 767):
- **Missing:** no `computeProfileEmbedding` call after update
- **Missing:** no cache invalidation

`gradeCEFR` in `packages/api/src/routers/models.ts` (line ~243):
- Already calls `computeProfileEmbedding` async ✅
- **Missing:** no cache invalidation (recommendation scores for user)

### DB Schema Facts

- **No `age` field** in any schema — `user.createdAt` exists but is not age. Use `"unknown"` or omit from template.
- **No `learningStyle` field** — hardcoded `style` should be removed or set to generic "self-paced"
- `userProfile.nativeLanguage` — stored as language code e.g. `"bn"`, `"en"` — `"bn"` means Bangla
- `recommendationScore` table — rows per userId, delete on cache invalidation
- `userProfileEmbedding` table — userId (unique), embedding, modelVersion

### Architecture

- Recommendation cache = `recommendationScore` rows for a user. Delete them → next `getRecommendations` call recomputes.
- `computeProfileEmbedding` is called fire-and-forget (`.catch(err => console.error(...))`) to not block responses
- Pattern from `gradeCEFR` line 243: `computeProfileEmbedding(userId).catch(err => console.error(...))`

### Fix Plan

1. **`models.ts` `computeProfileEmbedding`:**
   ```typescript
   const nativeDisplay = profileRow?.nativeLanguage ?? "unknown";
   const profileText = PROFILE_TEMPLATE({
     cefr: cefrRow?.level ?? "A2",
     interests: prefRow?.interests ?? [],
     goals: prefRow?.goals ?? [],
     native: nativeDisplay,
     // age and style omitted — no DB fields
   });
   ```
   Simplify PROFILE_TEMPLATE to not include age/style (or pass empty strings).

2. **`recommendations.ts` `updatePreferences`:** After upsert, fire async:
   ```typescript
   computeProfileEmbedding(userId).catch(err => 
     console.error("profile-embed recompute after updatePreferences failed", err)
   );
   // Invalidate recommendation cache
   db.delete(recommendationScore)
     .where(eq(recommendationScore.userId, userId))
     .catch(err => console.error("cache-invalidate failed", err));
   ```

3. **`models.ts` `gradeCEFR`:** Add cache invalidation after existing embed recompute call.

### References

- Epic spec: [Source: _bmad-output/planning-artifacts/epics-recommendation-engine.md#Story RE-2.3]
- Test plan: [Source: _bmad-output/implementation-artifacts/epic-re-2-test-design.md#RE-2.3]
- Implementation target: `packages/api/src/routers/models.ts` (computeProfileEmbedding, gradeCEFR)
- Implementation target: `packages/api/src/routers/recommendations.ts` (updatePreferences)

## Dev Agent Record

### Agent Model Used

BAD coordinator (claude-sonnet-4-6)

### Debug Log References

### Completion Notes List

### File List

- `packages/api/src/routers/models.ts` (modify — computeProfileEmbedding, gradeCEFR)
- `packages/api/src/routers/recommendations.ts` (modify — updatePreferences)
