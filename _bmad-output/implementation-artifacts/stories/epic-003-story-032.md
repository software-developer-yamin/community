---
baseline_commit: a4d7f97
---

# Story 3.2: Native Language Field

Status: new

## Story

As a Learner,
I want to set my native language during onboarding and have it used throughout the app,
So that profile matching recommendations are more accurate and the experience is personalized to my language background.

## Acceptance Criteria

1. **Native language selectable during onboarding** — Given I am a new user, When I go through onboarding, Then I see a native language picker with options (bn, hi, ur, en, ta, te) And my selection is saved to `userProfile.nativeLanguage`.

2. **Native language editable in profile settings** — Given I am a registered user, When I navigate to profile settings, Then I can change my native language from the picker And the change persists via `updateProfile`.

3. **Embedding uses actual native language** — Given a user has set their native language to Hindi (hi), When the system computes their profile embedding (`recomputeEmbedding`), Then the `PROFILE_TEMPLATE` uses `native: "Hindi"` instead of hardcoded `"Bangla"`.

4. **Default is Bengali (bn)** — Given a new user who has not set their native language, When their profile is created, Then `native_language` defaults to `"bn"`.

5. **Embedding recomputed on language change** — Given a user changes their native language in profile settings, When the update completes, Then the `recomputeEmbedding` procedure is called So the embedding reflects the new language.

6. **Supported languages validated** — Given a user tries to set an unsupported language code, When they call `updateProfile`, Then the API accepts any string up to 30 chars (flexible for regional variants) But the onboarding picker only shows the 6 supported options (bn, hi, ur, en, ta, te).

7. **Language code mapped to display name** — Given the PROFILE_TEMPLATE needs the native language value, When building the embedding text, Then the code maps `bn→"Bangla", hi→"Hindi", ur→"Urdu", en→"English", ta→"Tamil", te→"Telugu"` for embedding text, while the DB stores the 2-letter code.

## Tasks / Subtasks

- [ ] Task 1: API — Fix `recomputeEmbedding` to load nativeLanguage from userProfile
  - [ ] 1.1 Add a join/select to load `userProfile.nativeLanguage` alongside the existing user query in `recomputeEmbedding` handler (`packages/api/src/routers/models.ts`)
  - [ ] 1.2 Create a `NATIVE_LANG_MAP: Record<string, string>` constant mapping 2-letter codes to display names
  - [ ] 1.3 Replace hardcoded `native: "Bangla"` with `native: NATIVE_LANG_MAP[nativeLanguage] ?? "Bangla"`
  - [ ] 1.4 Handle the case where userProfile row doesn't exist yet (fall back to `"Bangla"`)

- [ ] Task 2: API — Recompute embedding on nativeLanguage update
  - [ ] 2.1 After the `updateProfile` upsert in `packages/api/src/routers/rebuild.ts`, if `input.nativeLanguage` was provided, call `recomputeEmbedding` internally (or trigger it from the caller)
  - [ ] 2.2 Ensure this doesn't block the `updateProfile` response (fire-and-forget or await with short timeout)

- [ ] Task 3: Web UI — Native language in onboarding
  - [ ] 3.1 Locate or create the onboarding page in `apps/web/` — add a native language step with a select/dropdown for the 6 supported languages
  - [ ] 3.2 Wire the selection to call `updateProfile({ nativeLanguage: "bn" })` on submit
  - [ ] 3.3 On next steps after onboarding, trigger `recomputeEmbedding`

- [ ] Task 4: Web UI — Native language in profile settings
  - [ ] 4.1 Locate or create the profile settings page in `apps/web/` — add a native language dropdown showing the current selection
  - [ ] 4.2 Wire changes to call `updateProfile({ nativeLanguage })` immediately or on save

- [ ] Task 5: Native UI — Native language in onboarding
  - [ ] 5.1 Locate or create the onboarding screen in `apps/native/` — add a native language picker
  - [ ] 5.2 Wire the selection to call `updateProfile({ nativeLanguage })`
  - [ ] 5.3 On next steps after onboarding, trigger `recomputeEmbedding`

- [ ] Task 6: Native UI — Native language in profile settings
  - [ ] 6.1 Locate or create the profile settings screen in `apps/native/` — add a native language picker showing current selection
  - [ ] 6.2 Wire changes to call `updateProfile({ nativeLanguage })`

- [ ] Task 7: Verification
  - [ ] 7.1 LSP diagnostics clean on all changed files (`pnpm check-types`)
  - [ ] 7.2 `pnpm dlx ultracite fix` run
  - [ ] 7.3 No `console.log`, no `as any`, no `@ts-expect-error`
  - [ ] 7.4 Verify embedding text includes correct native language via API test/curl

## Dev Notes

### Key Design Decisions

- **DB & API already exist** — the `nativeLanguage` field is already in the `userProfile` schema (`packages/db/src/schema/rebuild.ts:79`) and `updateProfile` already accepts it (`packages/api/src/routers/rebuild.ts:39`). The primary work is:
  1. Fix the embedding computation to use the actual value
  2. Build the UI for onboarding and profile settings

- **Language code → display name mapping** — the DB stores 2-letter codes (`bn`, `hi`, `ur`, etc.) but the embedding text model expects human-readable names ("Bangla", "Hindi"). A static map is the simplest approach since this is a known finite set.

- **Embedding recompute is fire-and-forget** — calling the embedding service adds ~200ms latency. The `updateProfile` handler should not block on it. A simple `void callRecompute()` or an async fire-and-forget is appropriate here.

- **Default is "bn"** — the existing DB default of `"bn"` matches the Bangladesh user base. No migration needed.

- **No gender-preference-style tier gate** — unlike Story 3.1's gender filter, native language is available to ALL tiers. No premium gate needed.

### Current Embedding Code (needs fix)

```typescript
// In packages/api/src/routers/models.ts, recomputeEmbedding handler:
const u = await db.select().from(user).where(eq(user.id, userId)).limit(1);
// ^ Only loads from `user` table, not `userProfile`

const profileText = PROFILE_TEMPLATE({
  // ...
  native: "Bangla",  // ❌ HARDCODED — should load from userProfile.nativeLanguage
  // ...
});
```

### Native Language Map

```typescript
const NATIVE_LANG_MAP: Record<string, string> = {
  bn: "Bangla",
  hi: "Hindi",
  ur: "Urdu",
  en: "English",
  ta: "Tamil",
  te: "Telugu",
};
```

### Relevant Files

- `packages/db/src/schema/rebuild.ts` — userProfile table: `nativeLanguage` column already exists (line 79)
- `packages/api/src/routers/rebuild.ts` — updateProfile: already accepts `nativeLanguage` (line 39), need to add embed trigger
- `packages/api/src/routers/models.ts` — recomputeEmbedding: fix hardcoded `"Bangla"` to load from userProfile (line 242)
- `apps/web/app/page.tsx` or `apps/web/app/onboarding/` — web onboarding flow (create or extend)
- `apps/web/app/settings/page.tsx` or similar — web profile settings (create or extend)
- `apps/native/app/` — native onboarding and profile screens (create or extend)

### Story Dependencies

- Depends on: Epic 1 (profile infrastructure, database schema, API) — **done**
- Depends on: F8.1 (userProfile table creation) — **done**
- Related: Story 3.1 (Gender Filter) — follows similar pattern for profile field + UI but without tier gating
- Related: Story 3.3 (Match Timeout UX) — may benefit from accurate embeddings for better matching

### What Must Be Preserved

- Existing `nativeLanguage` default of `"bn"` must remain unchanged
- Existing `updateProfile` handler must continue working for all existing fields
- Existing `PROFILE_TEMPLATE` signature must remain the same (just the runtime value changes)
- Existing `onConflictDoUpdate` upsert logic must continue working
