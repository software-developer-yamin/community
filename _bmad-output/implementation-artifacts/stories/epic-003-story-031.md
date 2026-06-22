---
baseline_commit: cdfd6e2
---

# Story 3.1: Gender Filter Enforcement

Status: in-progress

## Story

As a Premium_Plus Learner,
I want to set a gender preference for my matches,
So that I only match with partners whose gender aligns with my preference.

## Acceptance Criteria

1. **Gender filter set** — Given I have a premium_plus subscription, When I set a gender preference (male, female, nonbinary, undisclosed), Then the system only matches me with partners matching that preference.

2. **Filter respected in queue** — Given no valid match exists for my gender preference, When I wait in the queue, Then the system does NOT bypass my filter And no match is forced.

3. **Mutual preference respected** — Given both partners have gender preferences set, When the system evaluates a potential match, Then both preferences must be simultaneously satisfied for the match to proceed.

4. **Non-premium users cannot set filter** — Given I am on a free or premium tier, When I attempt to set a gender preference, Then the API rejects the request with a "premium_plus_required" error.

5. **Gender identity settable by all tiers** — Given any user, When I set my own gender identity on my profile, Then the system accepts it regardless of tier.

6. **Pool health logging** — Given the system rejects a potential match due to gender filter mismatch, When this happens, Then the event is logged with the rejected partner ID and reason for pool health analysis.

7. **Subscription expiry — filter inactive** — Given my premium_plus subscription expires, When I had a gender preference set, Then the system treats my preference as inactive (no filtering applied) until I re-subscribe.

## Tasks / Subtasks

- [ ] Task 1: Schema — Add genderPreference to userProfile
  - [ ] 1.1 Add `genderPreference` column to `userProfile` table in `packages/db/src/schema/rebuild.ts` — nullable `genderEnum` (reuse existing enum: male | female | nonbinary | undisclosed)
  - [ ] 1.2 Generate and apply DB migration (`pnpm run db:generate` + `pnpm run db:push`)

- [ ] Task 2: API — Extend updateProfile with genderPreference + tier gate
  - [ ] 2.1 Add `genderPreference: z.enum(["male", "female", "nonbinary", "undisclosed"]).optional()` to updateProfile input schema in `packages/api/src/routers/rebuild.ts`
  - [ ] 2.2 In the handler, if `genderPreference` is provided, check `userProfile.tier === "premium_plus"` — if not, throw `new TRPCError({ code: "FORBIDDEN", message: "premium_plus_required" })`
  - [ ] 2.3 Pass `genderPreference` into the upsert values so it persists

- [ ] Task 3: API — Extend matchPartners with gender filter
  - [ ] 3.1 In the self query, add a `.leftJoin(userProfile, eq(userProfile.userId, userProfileEmbedding.userId))` to load `gender`, `genderPreference`, and `tier`
  - [ ] 3.2 In the select fields, add `gender: userProfile.gender` to the nearby query (need to join userProfile there too)
  - [ ] 3.3 After the CEFR JS filter, apply the mutual gender filter:
        ```
        // User's own filter: if premium_plus + genderPreference set, partner gender must match
        // Partner's filter: if premium_plus + genderPreference set, user's gender must match partner's preference
        ```
  - [ ] 3.4 Log filter rejections: for each partner filtered out by gender, insert to `modelInferenceLog` with `callKind: "gender-filter"` and metadata `{ rejectedUserId, reason: "gender_mismatch" }`
  - [ ] 3.5 Return the filtered partners with the same shape

- [ ] Task 4: Native UI — Gender identity + preference in profile settings
  - [ ] 4.1 Locate the native profile settings screen (likely `apps/native/app/settings/index.tsx` or similar) — add "Gender" picker (male | female | nonbinary | undisclosed) available to all tiers
  - [ ] 4.2 Add "Gender Preference" picker (same options + explanatory text) — **only visible when user tier is premium_plus**
  - [ ] 4.3 Wire both pickers to call `updateProfile` with the selected values
  - [ ] 4.4 Show a premium upsell prompt if non-premium user taps the disabled gender preference area

- [ ] Task 5: Web UI — Gender identity + preference in profile settings (web parity)
  - [ ] 5.1 Locate the web profile settings page (likely `apps/web/app/settings/page.tsx`) — add "Gender" dropdown (all tiers)
  - [ ] 5.2 Add "Gender Preference" dropdown — **only visible when user tier is premium_plus**
  - [ ] 5.3 Wire both dropdowns to call `updateProfile`
  - [ ] 5.4 Show premium upsell for non-premium users

- [ ] Task 6: Verification
  - [ ] 6.1 LSP diagnostics clean on changed files (`pnpm check-types`)
  - [ ] 6.2 `pnpm dlx ultracite fix` run
  - [ ] 6.3 No `console.log`, no `as any`, no `@ts-expect-error`

## Dev Notes

### Key Design Decisions

- **genderPreference is a NEW field** — the existing `gender` field (user's own gender identity) already exists in the `userProfile` table and `updateProfile` procedure. Story 3.1 adds `genderPreference` (what gender the user wants to match with).

- **Mutual gender filter** — both parties must be satisfied for a match to proceed. If User A has `genderPreference: "female"` and User B has `genderPreference: "male"`, only matches where A's gender is "male" AND B's gender is "female" are valid. This prevents one-sided filtering.

- **Tier gating** — the `genderPreference` column on userProfile is always present (nullable), but the API only allows premium_plus users to SET it (write gate). The matchPartners logic checks `tier === "premium_plus"` before applying each user's preference. Non-premium users' preferences are treated as NULL (no filter).

- **Subscription expiry** — when premium_plus expires, the `tier` field on userProfile changes (handled by the subscription system). matchPartners checks tier, so the filter naturally becomes inactive without needing to clear data.

### MatchPartners Gender Filter Logic

The current matchPartners flow:
1. Load self embedding + CEFR (+ add userProfile join for gender data)
2. Cosine similarity matching (similarity > 0.4)
3. Over-fetch (limit * 2), then CEFR ±1 JS filter
4. Return top N partners

New step 3a: After CEFR filter, before `.slice()`, apply gender filter:

```typescript
const hasGenderFilter = userTier === "premium_plus" && userGenderPreference != null;
const partners = nearby
  .filter((p) => {
    if (!p.cefr) return true;
    const lvl = cefrOrder[p.cefr as keyof typeof cefrOrder];
    return Math.abs(lvl - myLevel) <= 1;
  })
  .filter((p) => {
    // Self gender filter: premium_plus + preference set → partner gender must match
    if (hasGenderFilter && p.gender !== userGenderPreference) {
      logFilterRejection(p.id); // pool health logging
      return false;
    }
    // Partner gender filter: partner has premium_plus + preference set → own gender must match
    if (p.tier === "premium_plus" && p.genderPreference != null && userGender !== p.genderPreference) {
      logFilterRejection(p.id);
      return false;
    }
    return true;
  })
  .slice(0, input.limit)
```

### Migration

- `ALTER TABLE user_profile ADD COLUMN gender_preference gender_enum;` — nullable, no default
- No backfill needed (nullable column, opt-in feature)

### Pool Health Logging

Use the existing `modelInferenceLog` table with:
- `callKind: "gender-filter"`
- `modelName: "rule-based"`
- `userId: current user's ID`
- `metadata: { rejectedUserId: string, reason: "gender_mismatch" }`

This avoids creating new tables while still having queryable data for analytics.

### Relevant Files

- `packages/db/src/schema/rebuild.ts` — userProfile table: add `genderPreference` column
- `packages/api/src/routers/rebuild.ts` — updateProfile: add `genderPreference` input + tier gate
- `packages/api/src/routers/models.ts` — matchPartners: add userProfile join + mutual gender filter + pool health logging
- `packages/db/drizzle/[migration]` — generated migration for new column
- `apps/native/app/settings/index.tsx` (or similar) — native profile settings UI
- `apps/web/app/settings/page.tsx` (or similar) — web profile settings UI
- `packages/db/src/schema/auth.ts` — user table (no changes needed)

### Story Dependencies

- Depends on: Epic 1 (profile infrastructure, authentication, tier system) — **done**
- Blocks: Story 3.3 (Match Timeout UX) — needs gender filter logic in place before timeout states can be designed for filtered queues
- Related: Story 3.2 (Native Language Filter) — follows the same pattern; gender preference filter provides the template

### What Must Be Preserved

- Existing gender field on userProfile must remain untouched
- Existing cefrPlacement, userProfileEmbedding, and similarity matching must remain untouched
- Existing updateProfile upsert logic must continue working for existing fields
- Non-gender users (no preference set) must continue matching as before (no behavior change)
