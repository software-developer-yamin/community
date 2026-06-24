---
baseline_commit: 9fe8714
---

# Story 5.1: Visible Subscription State

## Story

As a Learner,
I want to see my current plan, next billing date, and auto-renew status,
So that I always know what I'm paying for and when.

## Acceptance Criteria

1. **Settings → "Subscription" section (Web)** — Given a user on the web dashboard, When they open Settings, A "Subscription" section displays their current tier, price, next billing date, and auto-renew status with a plain-language explanation.

2. **Settings → "Subscription" screen (Native)** — Given a user on the mobile app, When they navigate to Settings → Subscription, They see the same subscription detail as the web surface.

3. **Paid tier: active subscription** — Given the user has an active paid subscription, When they view Subscription, They see: the tier name (e.g., "Premium" or "Premium Plus"), the amount and currency, the started-on date, the next billing date (endsAt), and a "Auto-renew" toggle showing the current state. And they see a label: "Your plan is active until {endsAt}."

4. **Paid tier: cancelled (auto-renew off)** — Given the user has turned off auto-renew, When they view Subscription, They see: "Your plan is paid until {endsAt}." And the auto-renew toggle is off. And a note: "Access to paid features continues until {endsAt}. After that, you'll be downgraded to Free."

5. **Paid tier: expired** — Given the user's subscription has expired, When they view Subscription, They see: "Your subscription has ended." And they see upgrade/purchase options to resubscribe.

6. **Free tier** — Given the user is on the Free tier, When they view Subscription, They see: "You're on the Free plan." And a "Compare plans" section showing tier benefits (Free vs Premium vs Premium Plus) with upgrade CTAs for each paid tier.

7. **Auto-renew toggle — turn off** — Given the user taps the auto-renew toggle to turn it off, When the toggle is switched, A confirmation dialog appears: "You'll keep access until {endsAt}. Are you sure?" The user confirms. The toggle updates immediately (optimistic). The page shows the updated state: auto-renew is off, "Your plan is paid until {endsAt}."

8. **Auto-renew toggle — turn on** — Given the user taps the auto-renew toggle to turn it on (re-enable), When the toggle is switched, A confirmation dialog appears: "Auto-renew will turn back on. Your plan will renew on {endsAt}." The user confirms. The toggle updates immediately.

9. **NFR: State reflects within 60 seconds** — Given any paid state change occurs (purchase, renewal, cancel, refund), When the user navigates to Subscription, The app reflects the change within 60 seconds (the data is server-authoritative, not cached stale).

10. **API returns a rich subscription detail object** — The enhanced `getSubscription` endpoint returns a `SubscriptionDetail` object with computed fields (readable labels, formatted dates, readable status) so the UI has zero logic for generating text about the subscription state.

## Tasks / Subtasks

### Task 1: API enhancement — `SubscriptionDetail` type and enhanced `getSubscription`

**Files:**
- `packages/api/src/routers/rebuild.ts`
- `packages/api/src/types/subscription.ts` (new)

**Changes:**

1. Create `packages/api/src/types/subscription.ts` with:
   ```typescript
   export interface SubscriptionDetail {
     id: string;
     tier: "free" | "premium" | "premium_plus";
     provider: string | null;
     amount: number | null;
     currency: string | null;
     startedAt: string | null;
     endsAt: string | null;
     autoRenew: boolean;
     autoRenewDisabledAt: string | null;
     status: "active" | "cancelled" | "expired" | "refunded" | "free";
     readableLabel: string;        // "Premium Plan", "Free Plan", etc.
     readableDescription: string;  // "Your plan is active until {date}.", etc.
     nextBillingDate: string | null;
     paymentMethodLastFour: string | null;
   }
   ```

2. Add a helper function `formatSubscriptionDetail(row, userTier)` in the router that converts the raw DB row + user's current tier into a `SubscriptionDetail`:
   - If no subscription row exists and userTier is "free" → `{ status: "free", tier: "free", readableLabel: "Free Plan", readableDescription: "You're on the Free plan.", autoRenew: false, ... }`
   - If subscription exists with `status = "active"` and `autoRenew = 1` → `{ status: "active", readableLabel: "{Tier} Plan", readableDescription: "Your plan is active until {endsAt formatted}. Auto-renew is on.", nextBillingDate: endsAt, ... }`
   - If subscription exists with `status = "active"` and `autoRenew = 0` → `{ status: "cancelled", readableLabel: "{Tier} Plan (cancelled)", readableDescription: "Your plan is paid until {endsAt formatted}. After that, you'll be downgraded to Free.", nextBillingDate: endsAt, ... }`
   - If subscription exists with `status = "expired"` → `{ status: "expired", readableLabel: "{Tier} Plan (expired)", readableDescription: "Your subscription has ended.", ... }`
   - If subscription exists with `status = "refunded"` → `{ status: "refunded", readableLabel: "{Tier} Plan (refunded)", readableDescription: "Your subscription has been refunded.", ... }`
   - Tier names: "free" → "Free", "premium" → "Premium", "premium_plus" → "Premium Plus"
   - Currency display: "BDT" → "৳", "INR" → "₹"
   - Amount formatted as `{currency_symbol}{amount / 100}` (e.g., "₹499", "৳999")

3. Enhance the existing `getSubscription` endpoint (currently returns raw row or null) to:
   - Fetch the subscription row as before
   - Also fetch `userProfile.tier` for the user (to detect "free" tier when no subscription)
   - Return a `SubscriptionDetail` by calling `formatSubscriptionDetail`
   - Export the `SubscriptionDetail` type for reuse in web and native apps

4. Add a `toggleAutoRenew` protected procedure:
   - Input: no input (operates on current user's subscription)
   - Validates: user has an active subscription
   - If `autoRenew` is 1 → set it to 0, set `autoRenewDisabledAt` to now
   - If `autoRenew` is 0 → set it to 1, clear `autoRenewDisabledAt`
   - Returns the updated `SubscriptionDetail`
   - Error if no active subscription to toggle

5. Add TypeScript type export `SubscriptionDetail` for reuse in web and native apps.

### Task 2: Settings page — Web subscription section

**New files:**
- `apps/web/src/app/settings/subscription.tsx` — Subscription section component

**Changes:**
- Add "Subscription" section to existing `apps/web/src/app/settings/page.tsx` (below the existing `AccountStanding` section)
- `subscription.tsx` fetches `rebuild.getSubscription` and renders:
  - **Paid active with auto-renew on:**
    - Tier badge (e.g., "Premium Plan")
    - Amount per period (e.g., "₹499/month")
    - "Your plan is active until {endsAt formatted}. Auto-renew is on."
    - Auto-renew toggle (switch/checkbox) — on
    - Provider name and payment method last-4 from metadata
  - **Paid active with auto-renew off (cancelled):**
    - Tier badge with "(cancelled)" suffix
    - "Your plan is paid until {endsAt formatted}. After that, you'll be downgraded to Free."
    - Auto-renew toggle — off
  - **Expired/Refunded:**
    - "Your subscription has ended."
    - "Compare plans" section with upgrade CTAs
  - **Free tier:**
    - "You're on the Free plan."
    - Tier comparison table: Free vs Premium vs Premium Plus with features and prices
    - "Upgrade to Premium" and "Upgrade to Premium Plus" buttons (buttons are placeholder — actual payment flow is Story 5.x)
  - Auto-renew toggle:
    - On toggle off: confirmation dialog "You'll keep access until {endsAt}. Are you sure?"
    - On toggle on: confirmation "Auto-renew will turn back on. Your plan will renew on {endsAt}."
    - Mutation via `orpc.rebuild.toggleAutoRenew.mutate()` with optimistic update
    - Toggle is disabled while mutation is in-flight
  - Format amounts using Intl.NumberFormat for the currency
  - Format dates as readable locale strings

### Task 3: Settings screen — Native subscription

**New files:**
- `apps/native/app/settings/subscription.tsx` — Subscription screen

**Changes:**
- Add "Subscription" item to the settings screen (native drawer settings)
- Subscription screen mirrors web content:
  - Tier badge with colored indicator
  - Amount, dates, auto-renew toggle
  - Free tier upgrade options
  - Auto-renew toggle with confirmation alert (uses React Native `Alert.alert` for confirmations)
  - Tier comparison section for free users
  - Provider info and payment method when available

### Task 4: Tests — API subscription detail

**New file:** `tests/api/subscription-detail.spec.ts`

**Scaffolds:**
- P0: `getSubscription` returns `SubscriptionDetail` with correct readableLabel for active subscription
- P0: `getSubscription` returns free-tier detail when user has no subscription row
- P0: `getSubscription` returns cancelled status with "paid until" description when autoRenew is off
- P0: `getSubscription` returns expired status with "has ended" description
- P0: `toggleAutoRenew` turns auto-renew off and sets autoRenewDisabledAt
- P0: `toggleAutoRenew` turns auto-renew back on and clears autoRenewDisabledAt
- P1: `toggleAutoRenew` returns error if no active subscription
- P1: Amounts are formatted per currency (BDT → ৳, INR → ₹)
- P1: Unauthenticated request returns 401

### Task 5: Tests — Subscription UI (web)

**New file:** `tests/e2e/subscription-state.spec.ts`

**Scaffolds:**
- P0: Settings page shows "Subscription" section
- P0: Free tier shows "Free Plan" label with upgrade options
- P0: Active subscription shows tier badge, amount, dates, auto-renew toggle
- P0: Cancelled subscription shows "paid until" message with toggle off
- P0: Auto-renew toggle shows confirmation dialog
- P0: Expired subscription shows "has ended" message
- P1: Auto-renew toggle mutation succeeds and updates UI optimistically
- P1: Free tier tier comparison renders all three tiers

### Task 6: Verification

- [ ] 6.1 LSP diagnostics clean on all changed files (`pnpm check-types`)
- [ ] 6.2 `pnpm dlx ultracite fix` run
- [ ] 6.3 No `console.log`, no `as any`, no `@ts-expect-error`
- [ ] 6.4 Verify subscription state flow via API test or curl
- [ ] 6.5 Web settings page renders subscription section correctly
- [ ] 6.6 Native settings subscription screen renders correctly
- [ ] 6.7 Auto-renew toggle works end-to-end (optimistic update, confirmation dialog, refetch)

## Dev Notes

### Key Design Decisions

**`SubscriptionDetail` is computed server-side.** Following the same pattern as Story 4.4 (`readableState`), all state-to-text logic lives in the server. Web and native UIs simply render what the API returns — zero duplicated logic. The `formatSubscriptionDetail` helper centralizes all readable labels and descriptions.

**Auto-renew toggle is immediate, no save button.** Per UX design (EXPERIENCE.md §Component Patterns): "Toggle edit is immediate (no 'Save' button). Cancel auto-renew shows confirmation: 'You'll keep access until [date].'" Optimistic updates with TanStack Query's `onMutate` rollback on error.

**Confirmation dialog is required on toggle.** Both turning off and turning on auto-renew show a confirmation. This prevents accidental toggles. On web, this is a standard dialog/modal. On native, this is `Alert.alert` with "Confirm" and "Cancel" buttons.

**Free tier has no subscription row.** Users on the free tier have no entry in the `subscription` table. The `getSubscription` endpoint detects this by checking the `userProfile.tier` field and returns a `status: "free"` detail with upgrade options.

**Payment method last-4 stored in `metadata` jsonb.** The `subscription.metadata` field stores `{ paymentMethodLastFour: "1234" }` populated by the payment provider webhook at subscription creation time. If absent, the field is null.

**Amount stored in smallest currency unit.** The `amount` column stores integers (paise for INR, poisha for BDT). Format as `amount / 100` for display. Currency symbols: BDT → `৳`, INR → `₹`.

### Relationship to existing features

- `getSubscription` already exists as a simple SELECT. This story **enhances** it — backward compatible in shape (still returns subscription data) but adds rich computed fields. Existing callers that use the raw response will need to update their field access.
- `toggleAutoRenew` is a **new** endpoint. No existing callers.
- Settings page already exists (created in Story 4.4). This story adds a "Subscription" section below "Account Standing."
- Native settings layout already has drawer navigation (from Story 4.4). This story adds "Subscription" as a second item alongside "Account Standing."

### Current Implementation Status

The `getSubscription` endpoint in `packages/api/src/routers/rebuild.ts` (line 257–264) currently:
- ✅ Returns raw subscription row (or null)
- ❌ Returns `SubscriptionDetail` with computed readable fields
- ❌ Handles free-tier detection (null row + profile.tier)
- ❌ Formats amounts, dates, readable labels
- ❌ `toggleAutoRenew` endpoint does not exist

### Schema Reference

```typescript
// subscription (from packages/db/src/schema/rebuild.ts)
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tier: tierEnum("tier").notNull(),                          // "free" | "premium" | "premium_plus"
  provider: paymentProviderEnum("provider").notNull(),        // "stripe" | "bdpay"
  providerSubscriptionId: text("provider_subscription_id").notNull(),
  amount: integer("amount").notNull(),                       // smallest currency unit
  currency: text("currency").notNull(),                      // "BDT" | "INR"
  startedAt: timestamp("started_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  autoRenew: integer("auto_renew").default(1).notNull(),     // 1 = on, 0 = off
  autoRenewDisabledAt: timestamp("auto_renew_disabled_at"),
  status: text("status").notNull(),                          // "active" | "cancelled" | "expired" | "refunded"
  metadata: jsonb("metadata"),                               // { paymentMethodLastFour?: string }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// userProfile tier: "free" | "premium" | "premium_plus"
```

### SubscriptionDetail Payload Shape

```typescript
interface SubscriptionDetail {
  id: string;
  tier: "free" | "premium" | "premium_plus";
  provider: string | null;
  amount: number | null;         // in smallest currency unit (null for free)
  currency: string | null;       // "BDT" | "INR" (null for free)
  startedAt: string | null;      // ISO timestamp (null for free)
  endsAt: string | null;         // ISO timestamp (null for free/expired)
  autoRenew: boolean;
  autoRenewDisabledAt: string | null;  // ISO timestamp
  status: "active" | "cancelled" | "expired" | "refunded" | "free";
  readableLabel: string;
  readableDescription: string;
  nextBillingDate: string | null;      // ISO timestamp (same as endsAt if active)
  paymentMethodLastFour: string | null; // from metadata
}
```

### Relevant Files

- `packages/db/src/schema/rebuild.ts` — `subscription` table, `userProfile` tier, `tierEnum`
- `packages/api/src/routers/rebuild.ts` — existing `getSubscription` endpoint (line 257–264), needs enhancement + new `toggleAutoRenew`
- `packages/api/src/types/subscription.ts` — new file for `SubscriptionDetail` type
- `apps/web/src/app/settings/page.tsx` — existing settings page, needs subscription section added
- `apps/web/src/app/settings/subscription.tsx` — new subscription section component
- `apps/web/src/app/settings/account-standing.tsx` — reference pattern for client component with orpc query
- `apps/native/app/settings/subscription.tsx` — new native subscription screen
- `tests/api/subscription-detail.spec.ts` — new API tests
- `tests/e2e/subscription-state.spec.ts` — new E2E tests

### Story Dependencies

- Depends on: Story 4.4 (Visible Moderation State) — **done** (established Settings page pattern, drawer navigation pattern, readable-state server pattern)
- Story 5.2 (In-App Support Ticket) — **depends on this story** (adds more items to Settings)
- Story 5.3 (Refund Mechanism) — **depends on this story** (refund flow navigates from subscription detail)
- Related: Payment provider integration (Story 5.x, future) — payment method last-4 and total billed to date will be enriched when payment webhooks are implemented

### What Must Be Preserved

- Existing `getSubscription` return shape can change (there is no UI client consuming its raw shape yet — it was created as a foundational endpoint)
- Existing settings page layout and AccountStanding section must remain intact
- Existing native drawer structure must remain intact (just add "Subscription" item)
- `toggleAutoRenew` must only affect the current user's subscription
- Auto-renew toggle must be idempotent (safe to call multiple times)

## Dev Agent Record

### Completion Notes

*(To be filled on completion)*

## File List

*(To be filled on completion)*

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-25 | 1.0 | Story 5.1 spec created: visible subscription state with API enhancement, web + native subscription UIs, auto-renew toggle, ATDD scaffolds | Dev Agent |

## Status

draft
