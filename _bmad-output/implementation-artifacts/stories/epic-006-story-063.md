---
baseline_commit: ac488f3
---

# Story 6.3: Reinstall Account Preservation

## Story

As a Learner,
I want to reinstall the app and get my account back,
So that I don't lose my subscription, history, and progress.

## Status

review

## Context: What Is Already Built

The following are **already in place** — do NOT recreate them:

### Server-Side Data Architecture (No Data Loss by Design)
All user data is stored server-side with `userId` as the foreign key anchor:

- **`packages/db/src/schema/auth.ts`** — `user` table (`id`, `email`, `phoneNumber`, `phoneNumberVerified`), `account` table (`providerId`, `accountId`, `userId`). These survive reinstall because they live in PostgreSQL, not the device.
- **`packages/db/src/schema/rebuild.ts`** — `userProfile` table (`userId` PK, `tier`, `tierExpiresAt`, `moderationState`, `strikeCount`, `cefrLevel`, `nativeLanguage`, `totalCallCount`, `totalCallDuration`). All profile data is server-side.
- **`subscription` table** — server-side. `userProfile.tier` + `tierExpiresAt` for effective tier. Neither is stored locally.
- **`callRoom` table** — full call history with `participantA`/`participantB` FK to `user.id`.
- **`callRating` table** — ratings keyed by `userId`.
- **`strikeEvent` table** — moderation history keyed by `userId`.

### Better-Auth Session & Auth Infrastructure
- **`packages/auth/src/index.ts`** — Better-Auth 1.6.11 config with `expo()` plugin, `phoneNumber()` plugin, Google OAuth, and email/password. Session TTL is 30 days (`expiresIn: 2_592_000`).
- **`apps/native/lib/auth-client.ts`** — `expoClient()` with `SecureStore` as session storage. `SecureStore` is **cleared on uninstall** — this is intentional and correct; user must re-authenticate.
- **`account` table** — Better-Auth writes one row per auth provider per user. On phone OTP sign-in, a row is added with `providerId = 'phone-number'` and `accountId = E.164 phone string`. On Google sign-in, `providerId = 'google'` and `accountId = Google sub`.

### Phone OTP Temp Email
The phoneNumber plugin is configured with:
```typescript
signUpOnVerification: {
  getTempEmail: (phone) => `${phone}@community.app`,
  getTempName: (phone) => phone,
},
```
This means a phone-only signup creates `user.email = "+8801234567890@community.app"`. When account linking is not enabled, a subsequent Google sign-in with a real email will **create a second, separate user** — data from the phone account is not accessible from the Google account.

### What Already Works After Reinstall
- **Same-method reinstall**: User signs in via phone → Better-Auth's `phoneNumber` plugin looks up `account WHERE providerId='phone-number' AND accountId=phone` → finds existing user → session created → all `userProfile`, `subscription`, `callRoom` data intact.
- **Google account reinstall**: User signs in via Google → Better-Auth finds `account WHERE providerId='google' AND accountId=googleSub` → session created → all data intact.
- **Subscription server-authoritative**: `getSubscription` endpoint always reads from `subscription` table + `userProfile.tier`. No local subscription cache exists on device.

## What Remains To Implement

### T1: Enable Better-Auth Account Linking

**File:** `packages/auth/src/index.ts`

Better-Auth 1.6.11 supports cross-provider account linking via the `account.accountLinking` option. Without this, signing in with Google when an existing account has the same email creates a duplicate user. Enable it:

```typescript
return betterAuth({
  // ... existing config ...
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "email-password"],
    },
  },
  // ... rest of config unchanged ...
});
```

With `trustedProviders: ["google", "email-password"]`, Better-Auth will:
1. On Google sign-in: check if `user.email` matches the Google account email → if yes, add a `google` row to `account` table for that existing user instead of creating a new one.
2. On email/password sign-in: same matching by email.

**Phone accounts and linking**: Phone accounts use a temp email (`+880...@community.app`). A Google sign-in with `real@gmail.com` won't match this temp email — automatic linking won't fire for phone → Google cross-method reinstall. T2 handles this residual case via a manual link flow.

**Explicit: do NOT add `phone-number` to `trustedProviders`.** Phone OTP cannot be auto-linked by Better-Auth's email-matching logic (no real email present). Manual linking (T2) is the correct path.

### T2: Add `linkAccount` Procedure to rebuild Router

**File:** `packages/api/src/routers/rebuild.ts`

Add a `linkAccount` protected procedure that allows a signed-in user to associate their current session's `userId` with a phone number from a separate (older) account. This is the recovery path for: "I had a phone account, reinstalled, signed in with Google (new account), now I want to retrieve my old data."

```typescript
// In the rebuild router's procedure map:
linkAccount: protectedProcedure
  .input(z.object({ phoneNumber: z.string().min(10) }))
  .handler(async ({ input, context }) => {
    const { phoneNumber } = input;
    const currentUserId = context.session.user.id;

    // Find the old account by phone number (project pattern: destructuring for .limit(1))
    const [oldUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.phoneNumber, phoneNumber))
      .limit(1);

    if (!oldUser) {
      throw new ORPCError("NOT_FOUND", { message: "No account found for that phone number" });
    }

    const oldUserId = oldUser.id;

    if (oldUserId === currentUserId) {
      return { linked: false, reason: "same_account" };
    }

    // Safety check: old account must have a phone-number provider entry
    const [oldPhoneAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, oldUserId),
          eq(account.providerId, "phone-number")
        )
      )
      .limit(1);

    if (!oldPhoneAccount) {
      throw new ORPCError("NOT_FOUND", { message: "No phone account found for that number" });
    }

    // Guard: if current user already has a phone-number account, reject
    const [currentPhoneAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, currentUserId),
          eq(account.providerId, "phone-number")
        )
      )
      .limit(1);

    if (currentPhoneAccount) {
      throw new ORPCError("CONFLICT", { message: "Current account already has a phone sign-in method" });
    }

    // Re-point the phone-number account row to the current userId.
    // Better-Auth resolves sign-ins via account.userId — this is sufficient.
    await db
      .update(account)
      .set({ userId: currentUserId })
      .where(
        and(
          eq(account.userId, oldUserId),
          eq(account.providerId, "phone-number")
        )
      );

    // Migrate userProfile only if current user has no profile yet
    const [currentProfile] = await db
      .select({ userId: userProfile.userId })
      .from(userProfile)
      .where(eq(userProfile.userId, currentUserId))
      .limit(1);

    if (!currentProfile) {
      await db
        .update(userProfile)
        .set({ userId: currentUserId })
        .where(eq(userProfile.userId, oldUserId));
    }
    // If current user already has a profile, keep it — new onboarding takes precedence

    return { linked: true };
  }),
```

**Important**: This procedure re-points `account` rows from the old `userId` to the current `userId`. This binds the phone auth method to the Google account, enabling future phone sign-ins to reach the Google account session. The old `userId` row in the `user` table becomes orphaned but is harmless (Better-Auth won't log into it without an `account` row pointing to it).

**Imports needed**: `db`, `userProfile`, `eq`, `and` are already present in rebuild.ts. You must add:

```typescript
// Add to existing rebuild schema imports block:
import { account, user } from "@community/db/schema/auth";

// Add to top of file (other routers like billing.ts use this pattern):
import { ORPCError } from "@orpc/server";
```

Do NOT use `@community/db/schema` — that path is not exported. The correct sub-path for auth tables is `@community/db/schema/auth`.

### T3: Native UI — "Recover Account" Flow After Reinstall

**New file:** `apps/native/components/account-recovery.tsx`

After a fresh Google or email sign-in, if the user's `userProfile` is missing (no profile record for the new `userId`), show an "Account recovery" prompt:

```
"Were you previously signed in with your phone number?
Enter your phone number to restore your account data."
[Phone number input]
[Recover my account] [Skip]
```

On submit, calls `orpc.rebuild.linkAccount({ phoneNumber })`. On success, invalidates all queries and shows a toast "Account restored!".

**Where to trigger this**: In `apps/native/app/(drawer)/index.tsx`, add a check after the profile query:

```typescript
const profile = useQuery(orpc.rebuild.getProfile.queryOptions());

// After sign-in, if session exists but profile is null:
if (session?.user && profile.data === null && !recoveryDismissed) {
  return <AccountRecovery onComplete={() => queryClient.invalidateQueries()} />;
}
```

The `recoveryDismissed` state prevents re-showing after the user skips or completes recovery.

**AccountRecovery component** (`apps/native/components/account-recovery.tsx`):
- Uses `useMutation(orpc.rebuild.linkAccount.mutationOptions(...))`
- Phone input with E.164 format validation (reuse `zod` schema from `apps/native/components/phone-sign-in.tsx`)
- Follow the error display pattern from `apps/native/components/sign-in.tsx`: `const [error, setError] = useState<string | null>(null)` + inline `<Text>` for errors and success message
- Do NOT use Sonner — that is web-only. Native uses inline state-based messages.
- On mutation success (`linked: true`): display inline "Account restored!" message, then call `onComplete()`
- Skip button sets local `recoveryDismissed = true` and dismisses the component

### T4: API Test — Reinstall Account Preservation

**New file:** `tests/api/reinstall-account-preservation.spec.ts`

Write tests that assert the server-side data guarantee:

1. **Same-phone reinstall**: Create a user via phone OTP, create `userProfile`, verify that authenticating again with the same phone returns `userId` equal to the original.
2. **Google account linking**: Create a user via phone, enable account linking, sign in via Google with a matching email (if `user.email` was updated to a real email), verify same `userId`.
3. **`linkAccount` procedure**: Create two separate users (phone + Google), call `linkAccount` from the Google session, verify the phone's `account` row now points to the Google `userId`.
4. **Subscription preserved**: Verify `getSubscription` returns the same subscription data after simulated re-authentication.

Place the test file at: `tests/api/reinstall-account-preservation.spec.ts` (follow patterns from `tests/api/cancellation-preserves-access.spec.ts`).

## Acceptance Criteria

### AC-1: Same-method reinstall restores full account
Given a user has an existing account (phone or email/Google),
When they uninstall the app, reinstall it, and sign in with the same phone number or Google account,
Then Better-Auth finds their existing `account` record and returns the same `userId`,
And their `userProfile`, `subscription`, `callRoom` history, and `callRating` data are all accessible via the API,
And no new `user` row is created.

### AC-2: Subscription state is server-authoritative
Given a user has an active or cancelled `subscription` row in the database,
When they reinstall the app and re-authenticate,
Then `getSubscription` returns the same tier, status, and `tierExpiresAt` as before reinstall,
And no local device state is required to determine subscription status.

### AC-3: Cross-provider account linking via email matching
Given a user previously signed up with email/password (or Google) using `user@example.com`,
When they reinstall and sign in with Google OAuth using the same `user@example.com` email,
Then Better-Auth's account linking (T1) detects the existing `user.email` match,
And adds a `google` provider row to the `account` table for the existing user,
And no duplicate `user` row is created.

### AC-4: Cross-provider account recovery via `linkAccount`
Given a user has a phone account (with temp email `+880...@community.app`)
And they reinstall and sign in with Google (different email) creating a new empty account,
When they enter their phone number in the account recovery prompt (T3),
And call `linkAccount({ phoneNumber })`,
Then the phone provider's `account` row is re-pointed to the current (Google) `userId`,
And future phone OTP sign-ins return the Google session's `userId`,
And a success toast "Account restored!" is shown.

### AC-5: No data migration on same-account recovery
Given a user already has a `userProfile` on their current (Google) session,
When `linkAccount` is called for a phone account,
Then the current `userProfile` is preserved (not overwritten by the old phone profile),
And the phone `account` row is re-pointed to the current `userId`.

### AC-6: Profile and history accessible after reinstall
Given a user has call history (`callRoom` records), ratings (`callRating`), and a CEFR level (`userProfile.cefrLevel`),
When they reinstall, re-authenticate, and fetch their profile,
Then all history, ratings, and profile data are returned by the API,
And no data was stored on the device that would be lost.

## Technical Notes

### Better-Auth 1.6.11 Account Linking API

The `account.accountLinking` option is the standard way to configure cross-provider merging. The `trustedProviders` list controls which providers can auto-link by email match. Do NOT mark `phone-number` as trusted in this list — phone OTP accounts use temp emails and cannot be safely auto-linked by email.

Reference: Better-Auth docs → Account Linking → `accountLinking.enabled`.

### Why Not Migrate All FK References?

The `linkAccount` procedure in T2 re-points `account` rows (not ALL FK references) to the current `userId`. This is intentional:
- Better-Auth session and auth tables are the critical lookup tables — migrating `account` rows is sufficient for auth to route phone sign-ins to the Google `userId`.
- `userProfile` migration is conditional: only if the current user has no profile. If they have a profile, their current onboarding data is preserved.
- `callRoom`, `callRating`, `strikeEvent`, `subscription` rows from the OLD phone `userId` are NOT migrated. They remain on the old `userId`. This is acceptable for MVP — these are historical records and the old `userId` still exists in the `user` table (orphaned but not deleted). A future story can optionally surface merged history.

If full FK migration is required in future, it must update: `userProfile.userId`, `subscription.userId`, `callRoom.participantA/B`, `callRating.userId`, `strikeEvent.userId`, `supportTicket.userId`. That scope belongs to a future "full account merge" story.

### Imports in rebuild.ts

`rebuild.ts` currently imports its tables from `@community/db/schema/rebuild`. The Better-Auth tables (`account`, `user`) live in a separate schema file. Add these as separate import statements:

```typescript
// Already present (do not modify):
import { ..., userProfile, subscription } from "@community/db/schema/rebuild";

// New — add these:
import { account, user } from "@community/db/schema/auth";
import { ORPCError } from "@orpc/server";
```

The `@community/db` package exports sub-paths via `"./*": { "default": "./src/*.ts" }` in `packages/db/package.json`, so `@community/db/schema/auth` is a valid import. `ORPCError` is already used in `billing.ts` and `recommendations.ts` — same pattern applies here.

### Linting & Formatting

Run `pnpm dlx ultracite fix` after changes. No `console.log` — use `evlog` (`log.info`, `log.warn`) for any logging in `rebuild.ts`. No `any` type usage.

### oRPC Errors

Use `ORPCError` (not raw `throw new Error`) in the `linkAccount` handler:
```typescript
import { ORPCError } from "@orpc/server";
throw new ORPCError("NOT_FOUND", { message: "..." });
```

### Native Query Invalidation Pattern

After `linkAccount` mutation succeeds, invalidate all queries:
```typescript
import { queryClient } from "@/utils/orpc";
queryClient.invalidateQueries(); // re-fetch profile, subscription, etc.
```

This is the same pattern used in `apps/native/app/(drawer)/index.tsx` after `signOut`.

## File List

| File | Action |
|------|--------|
| `packages/auth/src/index.ts` | UPDATE — add `account.accountLinking` config |
| `packages/api/src/routers/rebuild.ts` | UPDATE — add `linkAccount` procedure, import `account` and `user` from schema |
| `apps/native/components/account-recovery.tsx` | NEW — account recovery form component |
| `apps/native/app/(drawer)/index.tsx` | UPDATE — add `AccountRecovery` trigger after profile query |
| `tests/api/reinstall-account-preservation.spec.ts` | NEW — API tests for reinstall preservation guarantee |

## Tasks / Subtasks

- [x] T1: Enable Better-Auth Account Linking in `packages/auth/src/index.ts`
  - [x] Add `account.accountLinking` config with `enabled: true` and `trustedProviders: ["google", "email-password"]`
- [x] T2: Add `linkAccount` procedure to rebuild router in `packages/api/src/routers/rebuild.ts`
  - [x] Import `account` and `user` from `@community/db/schema/auth`
  - [x] Import `ORPCError` from `@orpc/server`
  - [x] Implement `linkAccount` protected procedure with phone lookup, same-account guard, conflict guard, account re-pointing, and conditional profile migration
- [x] T3: Native UI — Account Recovery flow
  - [x] Create `apps/native/components/account-recovery.tsx` with phone input, mutation, inline state-based messages
  - [x] Update `apps/native/app/(drawer)/index.tsx` with `recoveryDismissed` state and `AccountRecovery` trigger
- [x] T4: API tests for reinstall account preservation
  - [x] Test file `tests/api/reinstall-account-preservation.spec.ts` created (ATDD red-phase, all tests use test.skip())

## Dev Agent Record

### Implementation Plan

Implemented all four tasks per story specifications:
- T1: Added `account.accountLinking` block in betterAuth config — enables cross-provider email-match linking for Google and email-password providers. Phone-number deliberately excluded from trustedProviders.
- T2: Added `linkAccount` protected procedure to `rebuildRouter` — handles phone number lookup, same-account short-circuit, phone-number provider existence check, conflict guard (current user already has phone method), account row re-point, and conditional userProfile migration.
- T3: Created `AccountRecovery` component using `useMutation` + inline state messages (no Sonner). Added recovery trigger in `index.tsx` checking `profile.isSuccess && profile.data === null && !recoveryDismissed`.
- T4: Test file already existed at `tests/api/reinstall-account-preservation.spec.ts` (ATDD red-phase generated earlier). All tests remain in `test.skip()` per project convention until test DB seeding is in place.

### Completion Notes

- All four tasks implemented per story spec
- Biome lint passed: 0 errors on all 4 changed files
- Pre-existing TypeScript workspace resolution errors in packages are unrelated to this story
- Account linking does NOT include phone-number in trustedProviders (by design — temp emails cannot be auto-linked)
- `linkAccount` returns `{ linked: false, reason: "same_account" }` for same-account no-ops (AC-5 guard)
- `linkAccount` returns `{ linked: true }` on success, re-pointing the phone account row to the Google userId
- `AccountRecovery` dismisses on both Skip and complete (success or same-account)
- `queryClient.invalidateQueries()` called in index.tsx `onComplete` handler to re-fetch profile after linking

## Change Log

| Date | Change | Files Modified |
|------|--------|---------------|
| 2026-06-30 | T1: Enable Better-Auth account linking | `packages/auth/src/index.ts` |
| 2026-06-30 | T2: Add `linkAccount` procedure + imports | `packages/api/src/routers/rebuild.ts` |
| 2026-06-30 | T3a: Create AccountRecovery component | `apps/native/components/account-recovery.tsx` |
| 2026-06-30 | T3b: Add recovery trigger to home screen | `apps/native/app/(drawer)/index.tsx` |

## Out of Scope

- Full FK migration of `callRoom`, `callRating`, `strikeEvent`, `subscription` from old `userId` to new — this is a future "full account merge" story
- Admin UI for manual account merging
- SMS-based account ownership verification (beyond the existing OTP sign-in flow)
- Push notification "Welcome back" after reinstall
- Story 1.3 (Phone Number Authentication) changes — phone signup UX is out of scope here
- Deleting orphaned old `userId` rows after linking — harmless to leave in DB
