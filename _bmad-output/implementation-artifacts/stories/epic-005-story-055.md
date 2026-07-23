---
baseline_commit: 9fe8714
---

# Story 5.5: Cancellation Preserves Access Until Period End

## Story

As a Learner,
I want to cancel my subscription without losing access to paid features I've already paid for,
So that I feel confident I can cancel anytime.

## Status

review

## Context: What Is Already Built

The following are **already implemented** — do NOT recreate them:

- **`packages/api/src/lib/tier.ts`** — exists and exports `getEffectiveTier(userId)` and `computeEffectiveTier(tier, tierExpiresAt)`. It does lazy downgrade on access.
- **`packages/api/src/routers/rebuild.ts` line 18** — already imports `getEffectiveTier` from `../lib/tier`.
- **`packages/api/src/routers/rebuild.ts` ~line 174** — gender preference check already calls `getEffectiveTier(context.session.user.id)` and gates on `effectiveTier !== "premium_plus"`. **T1 and T2 are DONE.**
- **`apps/server/src/jobs/tier-cleanup.ts`** — exists and exports `cleanupExpiredTiers()` and `startTierCleanup(intervalMs?)`. **T3 file is DONE.**

## What Remains To Implement

### T3 (remaining): Register `startTierCleanup` in `apps/server/src/index.ts`

`startTierCleanup` is defined but never called. Add to server startup in `apps/server/src/index.ts`:

```typescript
import { startTierCleanup } from "./jobs/tier-cleanup";

// Near the bottom of startup, after DB is confirmed available:
startTierCleanup(); // runs immediately + every 60 min
```

The function signature is `startTierCleanup(intervalMs = 60 * 60 * 1000): void`. No arguments needed for production defaults.

### T4: Ensure `tierExpiresAt` is set on `userProfile` during `toggleAutoRenew`

In `packages/api/src/routers/rebuild.ts`, the `toggleAutoRenew` handler (around line 397) does NOT set `userProfile.tierExpiresAt`. Add after updating the subscription row:

```typescript
// After the subscription update (after the `if (!updated)` throw):
// Ensure tierExpiresAt is synced to userProfile from the subscription's endsAt
if (subRow.endsAt) {
  await db
    .update(userProfile)
    .set({ tierExpiresAt: subRow.endsAt })
    .where(eq(userProfile.userId, context.session.user.id));
}
```

This covers users whose subscriptions were created before story 5.4 set `tierExpiresAt` automatically.

### T5: Add `tierExpiresAt` to `SubscriptionDetail` type

In `packages/api/src/types/subscription.ts`, add:

```typescript
export interface SubscriptionDetail {
  // ... existing fields (keep all of them) ...
  tierExpiresAt: string | null;    // ISO string from userProfile.tierExpiresAt
  isCancelled: boolean;            // true when autoRenew === false
  willExpireOn: string | null;     // same as endsAt when isCancelled, else null
}
```

In `packages/api/src/routers/rebuild.ts`, update `formatSubscriptionDetail` to populate these fields:

```typescript
return {
  // ...existing fields...
  tierExpiresAt: formatDate(subRow.endsAt), // endsAt is the canonical expiry
  isCancelled: subRow.autoRenew === 0,
  willExpireOn: subRow.autoRenew === 0 ? formatDate(subRow.endsAt) : null,
};
```

The free-plan branches in `formatSubscriptionDetail` should return `tierExpiresAt: null, isCancelled: false, willExpireOn: null`.

### T6: Expose `tierExpiresAt` from `getSubscription` endpoint

The `getSubscription` endpoint (in rebuild router) returns `formatSubscriptionDetail(subRow, profile.tier)`. Once T5 updates the type and formatter, this is automatically covered — verify the return includes the new fields.

## Acceptance Criteria

### AC-1: Cancellation preserves access to paid features
Given a user has an active paid subscription with `autoRenew = 1`,
When they toggle auto-renew OFF (cancel),
Then the subscription `autoRenew` is set to 0,
And the user's `tier` remains unchanged (e.g., "premium"),
And the user's `tierExpiresAt` remains unchanged (the original `endsAt`),
And paid features remain accessible until `tierExpiresAt`.

### AC-2: Lazy expiration check
Given a user's `tierExpiresAt` has passed (is in the past),
When any server-side feature gate checks the user's tier,
The system treats them as "free" tier for enforcement purposes,
Even if the `tier` column in `userProfile` hasn't been updated yet.

### AC-3: Auto-renew re-enable
Given a user with `autoRenew = 0` who is still within the paid period,
When they toggle auto-renew back ON,
The subscription `autoRenew` is set to 1,
And they keep their tier without disruption.

### AC-4: Periodic tier cleanup
Given a user whose `tierExpiresAt` has passed,
When the system's tier cleanup runs (hourly via `startTierCleanup`),
The `userProfile.tier` is downgraded to `"free"` and `tierExpiresAt` is set to NULL.

### AC-5: Gender preference enforcement respects tierExpiresAt
Given a user on "premium_plus" whose `tierExpiresAt` has passed,
When they try to update their gender preference,
The system rejects the change — treating them as effectively "free".

### AC-6: Gender preference enforcement allows access during valid period
Given a user on "premium_plus" who has cancelled (autoRenew = 0) but their `tierExpiresAt` is still in the future,
When they try to update their gender preference,
The system allows the change as normal — their paid period hasn't expired yet.

## Technical Notes

### Do Not Modify
- `packages/api/src/lib/tier.ts` — already correct and complete.
- The gender preference check in `rebuild.ts` — already uses `getEffectiveTier`.
- `apps/server/src/jobs/tier-cleanup.ts` — already correct. Only the registration call is missing.

### Imports Needed
`toggleAutoRenew` already imports `db`, `userProfile`, `eq`, and `and` from the top of `rebuild.ts` — no new imports required for T4.

For T3, `apps/server/src/index.ts` needs:
```typescript
import { startTierCleanup } from "./jobs/tier-cleanup";
```

### Code Pattern: `toggleAutoRenew` shape
The full handler is at ~line 397 of `rebuild.ts`. It selects `subRow` from the `subscription` table, updates `autoRenew` + `autoRenewDisabledAt`, then returns `formatSubscriptionDetail(updated, profile.tier)`. Insert the `tierExpiresAt` sync **between** the `if (!updated)` guard and the return statement.

### Ultracite / Linting
Run `pnpm dlx ultracite fix` after changes. The codebase uses `evlog` (`log.info`) not `console.log` for structured logging — the existing tier-cleanup.ts already uses `evlog` correctly.

## File List

| File | Action |
|------|--------|
| `apps/server/src/index.ts` | UPDATE — add `startTierCleanup()` call |
| `packages/api/src/routers/rebuild.ts` | UPDATE — add `tierExpiresAt` sync in `toggleAutoRenew`; update `formatSubscriptionDetail` for new type fields |
| `packages/api/src/types/subscription.ts` | UPDATE — add `tierExpiresAt`, `isCancelled`, `willExpireOn` fields |

## Out of Scope

- Email notifications about pending expiration
- Auto-downgrade in-app notification to user
- Pro-rated refunds for early cancellation — cancellation = no new charges, keep access until period ends
- Re-activating an expired subscription's data — handled by story 5.4 re-subscribe flow
- Refund flow — separate story
