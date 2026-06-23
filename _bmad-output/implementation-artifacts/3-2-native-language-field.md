# Story 3.2: Native Language Field

**GH Issue:** [#10](https://github.com/software-developer-yamin/community/issues/10)
**Epic:** 3 — Matchmaking
**Status:** ready-for-dev
**Created:** 2026-06-23T18:00:00+06:00

---

## Requirements

### User Story

As a Learner,
I want to set my native language during onboarding,
So that matching and AI features are informed by my actual background.

### Acceptance Criteria

1. **New user onboarding** — User selects native language from (bn, hi, ur, en, ta, te) during onboarding
2. **Default detection** — Defaults to `bn` (Bangla) for Bangladeshi users (+880 phone number prefix)
3. **Embedding integration** — Profile embedding uses actual native language, not hardcoded value
4. **Profile editing** — User can update native language in profile settings
5. **Recompute on change** — Embedding recomputes on next match when language changes

### Languages Supported

| Code | Display Name |
|------|-------------|
| bn | Bangla |
| hi | Hindi |
| ur | Urdu |
| en | English |
| ta | Tamil |
| te | Telugu |

---

## Architecture Context

### Schema — Already Exists

The `nativeLanguage` column already exists in `userProfile` table at `packages/db/src/schema/rebuild.ts` line 79:

```typescript
nativeLanguage: text("native_language").default("bn").notNull(), // bn | hi | ur | en | ta | te
```

No schema migration or DB push needed for this story.

### API — Already Exists

The `updateProfile` procedure in `packages/api/src/routers/rebuild.ts` (line 29) already accepts `nativeLanguage` as an optional string:

```typescript
nativeLanguage: z.string().max(30).optional(),
```

The `getProfile` procedure (line 20) already returns the full userProfile including `nativeLanguage`.

### Embedding — Already Native Language Aware

The `recomputeEmbedding` procedure in `packages/api/src/routers/models.ts` (line 233) already:
- Reads `nativeLanguage` from the user profile (line 248)
- Maps it via `NATIVE_LANG_MAP` (line 60-67) to display name
- Includes it in the profile text for embedding generation (line 260, via `PROFILE_TEMPLATE`)

### Matching Engine — No Native Language Filter Yet

The `matchPartners` procedure (line 296) does not currently filter by native language. It only applies CEFR ±1 and mutual gender preference filters. Adding a native language preference filter is a future enhancement (not in scope for this story unless we add optional filtering).

---

## Scope of Work

### What needs to be done

1. **Native onboarding UI** — Add native language picker to the native onboarding flow (S2 in EXPERIENCE.md)
2. **Web onboarding UI** — Add native language picker to web sign-up/onboarding
3. **Default detection** — Detect Bangladeshi users (+880) and default to `bn`
4. **Profile settings UI** — Add native language editor to settings (S7 in EXPERIENCE.md)
5. **Embedding recompute trigger** — Call `recomputeEmbedding` when native language changes in settings
6. **Web settings update** — Add native language field to web profile settings

### What already exists (no work needed)

- ✅ `nativeLanguage` column in `userProfile` table (`rebuild.ts` line 79)
- ✅ `updateProfile` API accepts `nativeLanguage` (`rebuild.ts` line 39)
- ✅ `getProfile` returns `nativeLanguage`
- ✅ `recomputeEmbedding` reads and uses `nativeLanguage` (`models.ts` line 248-260)
- ✅ `NATIVE_LANG_MAP` and `PROFILE_TEMPLATE` handle native language in embedding
- ✅ Auth schema (`auth.ts`) has `phoneNumber` for +880 detection

---

## Implementation Details

### 1. Native Onboarding — Language Picker (S2)

**File:** `apps/native/app/onboarding.tsx` (to be created) or integrate into existing onboarding flow

The onboarding flow (per EXPERIENCE.md) follows:
- S2: Phone OTP → profile → **native language** → CEFR assessment

Add a native language picker screen/step between phone verification and CEFR placement:
- Dropdown/select with 6 language options (bn, hi, ur, en, ta, te)
- Default: auto-detect from phone number (+880 → bn)
- Call `updateProfile({ nativeLanguage })` on selection
- Show display names (Bangla, Hindi, Urdu, English, Tamil, Telugu)

### 2. Web Onboarding — Language Picker

**File:** `apps/web/src/app/login/page.tsx` or `apps/web/src/app/dashboard/dashboard.tsx`

Check if there's a web onboarding flow. If the web app redirects to dashboard after sign-up, add the language selection there or as part of the sign-up form (`apps/web/src/components/sign-up-form.tsx`).

### 3. Default Detection Logic

In the onboarding flow, detect the user's country code from their phone number:

```typescript
function getDefaultLanguage(phoneNumber?: string): string {
  if (!phoneNumber) return "bn";
  // Bangladeshi numbers start with +880 or 880 or 0
  if (phoneNumber.startsWith("+880") || phoneNumber.startsWith("880")) return "bn";
  return "bn"; // default
}
```

**Location:** Shared utility — `packages/api/src/lib/native-lang.ts` or inline in onboarding component.

### 4. Native Profile Settings (S7)

**File:** `apps/native/app/(drawer)/settings.tsx` (to be created) or existing settings page

Add native language field to profile settings:
- Read current value from `getProfile`
- Show select/dropdown with language options
- On change: call `updateProfile({ nativeLanguage: "..." })`
- After successful update: call `recomputeEmbedding({})` to trigger embedding recompute

### 5. Embedding Recompute Integration

When user changes native language in settings:
1. Call `updateProfile({ nativeLanguage: newValue })`
2. Call `recomputeEmbedding({})` — this reads the profile and regenerates embedding
3. Show success feedback to user

The `recomputeEmbedding` procedure is idempotent and already handles this correctly.

### 6. Web Profile Settings

**File:** `apps/web/src/app/dashboard/dashboard.tsx` or separate settings page

Add native language select alongside other profile fields in the web dashboard.

---

## File Manifest

### Files to CREATE

| File | Purpose |
|------|---------|
| `apps/native/app/onboarding.tsx` | Native onboarding flow with native language picker, CEFR, profile setup |
| `apps/native/app/(drawer)/settings.tsx` | Native settings page with native language editor |
| `packages/api/src/lib/native-lang.ts` | Shared utility for default language detection from phone number |
| `apps/web/src/app/settings/page.tsx` | Web settings page (may already exist — verify) |

### Files to MODIFY

| File | Change |
|------|--------|
| `apps/native/components/sign-up.tsx` | Add native language step/field after phone verification |
| `apps/native/app/(drawer)/(tabs)/index.tsx` | Add link to settings page |
| `apps/web/src/app/dashboard/dashboard.tsx` | Add native language select field to profile section |
| `apps/web/src/components/sign-up-form.tsx` | Add native language dropdown (with +880 default) |
| `apps/web/src/app/layout.tsx` | Add settings page route if needed |
| `packages/api/src/routers/rebuild.ts` | Validate nativeLanguage is one of the 6 allowed values (optional improvement) |

### Files to VERIFY (already done)

| File | Status |
|------|--------|
| `packages/db/src/schema/rebuild.ts` (line 79) | ✅ Already has `nativeLanguage` column |
| `packages/db/src/schema/auth.ts` (line 11) | ✅ Has `phoneNumber` for country detection |
| `packages/api/src/routers/models.ts` (line 233-293) | ✅ `recomputeEmbedding` already uses native language |
| `packages/api/src/routers/models.ts` (line 60-67) | ✅ `NATIVE_LANG_MAP` exists |
| `packages/api/src/routers/rebuild.ts` (line 39) | ✅ `updateProfile` accepts `nativeLanguage` |

---

## Implementation Order

```
Step 1: Create shared default-detection utility (packages/api/src/lib/native-lang.ts)
Step 2: Add native language field to sign-up forms (web + native)
Step 3: Add native language field to profile settings (web + native)
Step 4: Wire embedding recompute on language change
Step 5: Run pnpm dlx ultracite fix
Step 6: Run pnpm run check-types
Step 7: Test onboarding flow end-to-end
```

---

## Dependencies

- **Required before:** Epic 1 (auth/session) — ✅ Done
- **Required after:** Story 3.3 (Match Timeout) depends on this story

---

## Verification

### Manual Testing

1. **Onboarding flow:** Sign up with +880 number → verify default is "Bangla" → change to Hindi → verify profile saves
2. **Settings edit:** Go to profile settings → change native language → verify embedding recompute is called
3. **Embedding:** Check `userProfileEmbedding` table contains new embedding after change
4. **Edge cases:** Sign up with non-Bangladeshi number → verify default is still "Bangla" (current product decision)

### Automated Tests

- Test `getDefaultLanguage()` utility with various phone prefixes
- Test `updateProfile` API with valid/invalid language codes
- Test that `recomputeEmbedding` is triggered after language change in settings
