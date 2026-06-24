---
baseline_commit: 88cf50e
---

# Story 4.4: Visible Moderation State

## Story

As a Learner,
I want to see my account standing with a plain-language explanation,
So that I understand why I'm restricted, when it will be lifted, and what I can do about it.

## Acceptance Criteria

1. **Settings → "Account standing" section (Web)** — Given a user on the web dashboard, When they open their user menu, a "Settings" item navigates to a settings page, And a "Account standing" section displays their current moderation state with a human-readable explanation.

2. **Settings → "Account standing" section (Native)** — Given a user on the mobile app, When they open the drawer and navigate to Settings, And tap "Account standing", They see their moderation state with the same plain-language explanation as web.

3. **State: clean** — Given the user has fewer than 3 active strikes, When they view their account standing, They see "Account in good standing" with a green indicator And an explanation: "You're all set! Your account is in good standing. Keep up the great conversations."

4. **State: warned** — Given the user has 3–4 active strikes, When they view their account standing, They see "Warning — strikes accumulated" with a yellow indicator And an explanation: "You've received {N} strikes for ending calls too early. If you get more, you'll be temporarily blocked from matching. Try to stay in calls longer." And a "Learn more" link.

5. **State: cooldown_1h** — Given the user has 5–9 active strikes, When they view their account standing, They see "Temporarily blocked — 1-hour cooldown" with a red indicator And an explanation: "You've received {N} strikes for ending calls early. Matching is paused until {cooldownUntil} (local time). After that, your access will be restored." And a countdown showing remaining time.

6. **State: cooldown_24h** — Given the user has 10+ active strikes, When they view their account standing, They see "Temporarily blocked — 24-hour cooldown" with a red indicator And an explanation: "You've accumulated significant strikes. Matching is paused until {cooldownUntil} (local time). Your account has also been flagged for review by our team." And a countdown showing remaining time.

7. **State: suspended** — Given the user's account is suspended, When they view their account standing, They see "Account suspended — pending review" with a red indicator And an explanation: "Your account has been suspended pending review by our moderation team. This usually means multiple concerns were flagged about your activity." And a "Contact support" link.

8. **State: banned** — Given the user's account is banned, When they view their account standing, They see "Account banned" with a red indicator And an explanation showing the ban reason And a "Contact support" link with text: "If you believe this was a mistake, please contact support."

9. **Cooldown countdown updates live** — Given the user is in a cooldown state, When they view account standing, A live countdown timer shows the remaining cooldown time (updates every 1s). When the cooldown expires, the page refreshes to show the new state.

10. **API enhancement: readable state** — The `getStrikes` endpoint returns an additional `readableState` object with `{ label, description, action, actionLink }` per state, so the UI has zero logic for generating text.

11. **Flagged for review indicator** — Given the user's profile has `flaggedForReview = 1`, When they view their account standing, They see: "Flagged for review — our team is reviewing recent activity on your account."

## Tasks / Subtasks

### Task 1: API enhancement — `readableState` in `getStrikes`

**Files:**
- `packages/api/src/routers/moderation.ts`

**Changes:**
- Add a helper function `formatReadableState(state, { strikeCount, cooldownUntil })` that returns a `ReadableState` object per state:
  - `clean`: `{ label: "Good standing", description: "You're all set! Your account is in good standing. Keep up the great conversations.", action: null, actionLink: null }`
  - `warned`: `{ label: "Warning — strikes accumulated", description: "You've received {N} strikes for ending calls too early. If you get more, you'll be temporarily blocked from matching. Try to stay in calls longer.", action: "Learn more", actionLink: "/help/moderation" }`
  - `cooldown_1h`: `{ label: "Temporarily blocked — 1-hour cooldown", description: "You've received {N} strikes for ending calls early. Matching is paused until {cooldownUntil} (local time). After that, your access will be restored.", action: null, actionLink: null }`
  - `cooldown_24h`: `{ label: "Temporarily blocked — 24-hour cooldown", description: "You've accumulated significant strikes. Matching is paused until {cooldownUntil} (local time). Your account has been flagged for review by our team.", action: null, actionLink: null }`
  - `suspended`: `{ label: "Account suspended — pending review", description: "Your account has been suspended pending review by our moderation team. This usually means multiple concerns were flagged about your activity.", action: "Contact support", actionLink: "/support" }`
  - `banned`: `{ label: "Account banned", description: "(ban reason from userProfile)", action: "Contact support", actionLink: "/support" }`
- Append `readableState` to `getStrikes` response alongside `strikeCount`, `state`, `cooldownUntil`, `flaggedForReview`.
- Add TypeScript type export `ReadableState` for reuse in web and native apps.

### Task 2: Settings page — Web

**New files:**
- `apps/web/src/app/settings/page.tsx` — Settings page layout
- `apps/web/src/app/settings/account-standing.tsx` — Account standing section component
- `apps/web/src/components/account-standing-badge.tsx` — Reusable state badge component

**Changes:**
- Add `/settings` route to the web app
- Add "Settings" dropdown item to `user-menu.tsx` (before "Sign Out")
- `/settings` page layout with sidebar or sections (account standing, future: subscription)
- Account standing section fetches `moderation.getStrikes` and renders:
  - State badge (colored indicator: green/yellow/red)
  - State label (from `readableState.label`)
  - Description paragraph (from `readableState.description`)
  - Cooldown countdown timer (1s interval, local time formatting)
  - Action link when present (`readableState.action` + `readableState.actionLink`)
  - Flagged-for-review banner when applicable
- Cooldown countdown: `useEffect` with `setInterval(1000)` that computes remaining time from `cooldownUntil` and displays as "Xh Ym Zs remaining". When cooldown expires, refetch the API to get new state.

### Task 3: Settings screen — Native

**New files:**
- `apps/native/app/settings/account-standing.tsx` — Account standing screen
- `apps/native/components/account-standing-badge.tsx` — Reusable state badge

**Changes:**
- Add `apps/native/app/settings/_layout.tsx` — Settings drawer group
- Add "Settings" drawer item to `apps/native/app/(drawer)/_layout.tsx`
- Settings home screen lists: "Account standing", (future: "Subscription")
- Account standing screen mirrors web content:
  - State badge with colored indicator
  - Label and description from `readableState`
  - Countdown timer for cooldown states
  - Action link (opens browser via `Linking.openURL`)
  - Flagged-for-review banner

### Task 4: Tests — API readable state

**New file:** `tests/api/moderation-state.spec.ts`

**Scaffolds:**
- P0: `getStrikes` returns `readableState` with correct label for each state
- P0: `readableState` description interpolates strike count when containing `{N}`
- P0: `readableState` includes action + actionLink for warned/suspended/banned
- P1: `readableState` for clean state has null action + null actionLink
- P1: `readableState` for banned state includes ban reason in description
- P1: Unauthenticated request returns 401

### Task 5: Tests — Account standing UI (web)

**New file:** `tests/e2e/moderation-state.spec.ts`

**Scaffolds:**
- P0: Settings page shows "Account standing" section
- P0: Clean state shows green badge with "Good standing"
- P0: Warned state shows yellow badge with strike count in description
- P0: Cooldown state shows countdown timer
- P0: Banned state shows "Contact support" link
- P1: Cooldown countdown updates in real-time
- P1: State refreshes when cooldown expires
- P1: Flagged-for-review banner is displayed when applicable

### Task 6: Verification

- [ ] 6.1 LSP diagnostics clean on all changed files (`pnpm check-types`)
- [ ] 6.2 `pnpm dlx ultracite fix` run
- [ ] 6.3 No `console.log`, no `as any`, no `@ts-expect-error`
- [ ] 6.4 Verify account standing flow via API test or curl
- [ ] 6.5 Web settings page renders correctly
- [ ] 6.6 Native settings screen renders correctly

## Dev Notes

### Key Design Decisions

**`readableState` is computed server-side.** The `getStrikes` endpoint already computes the moderation state from strike counts and DB values. Adding `readableState` to the response keeps all state-to-text logic in one place (the server). Web and native UIs simply render what the API returns — zero duplicated logic.

**Single settings page for web; drawer item for native.** Web uses a `/settings` route accessible from the user dropdown. Native adds a "Settings" group to the existing drawer with "Account standing" as the first screen. This matches the existing navigation patterns (user-menu dropdown for web, drawer for native).

**Cooldown countdown is client-side only.** The server returns `cooldownUntil` as an ISO timestamp. The client computes remaining time and updates every 1s. When the countdown reaches zero, the client refetches `getStrikes` to get the new state. This avoids server-side timer overhead while still being accurate.

**"Contact support" links use relative URLs for now.** `/support` is a placeholder route. The actual support system (ticketing, email, or in-app) is out of scope for this story. The link can be updated to a real support URL or deep link in a future iteration.

**Ban reason is stored on `userProfile`.** The `userProfile` table already has a `banReason` column (set by manual moderator action). The `getStrikes` endpoint can read this and include it in the readable state for `banned` and `suspended` states.

### Current Implementation Status

The `getStrikes` endpoint in `packages/api/src/routers/moderation.ts` already returns:
- ✅ `strikeCount` — number of active (non-voided, non-decayed) strikes
- ✅ `state` — computed moderation state (`clean`, `warned`, `cooldown_1h`, `cooldown_24h`, `suspended`, `banned`)
- ✅ `cooldownUntil` — ISO timestamp of cooldown expiry (or null)
- ✅ `flaggedForReview` — boolean for partner reports

Needed:
- ❌ `readableState` — plain-language label, description, action, actionLink
- ❌ Settings page UI (web)
- ❌ Settings screen UI (native)
- ❌ Tests

### Schema Reference

```typescript
// userProfile (from packages/db/src/schema/rebuild.ts)
export const userProfile = pgTable("user_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id),
  moderationState: moderationStateEnum("moderation_state"),
  cooldownUntil: timestamp("cooldown_until"),
  strikeCount: integer("strike_count").default(0).notNull(),
  flaggedForReview: integer("flagged_for_review").default(0).notNull(),
  banReason: text("ban_reason"),             // set by moderator when banning
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Readable State Payload Shape

```typescript
interface ReadableState {
  label: string;         // "Good standing", "Account banned", etc.
  description: string;   // Plain-language explanation
  action: string | null; // CTA text: "Contact support", "Learn more", null
  actionLink: string | null; // CTA URL: "/support", "/help/moderation", null
}
```

### Relevant Files

- `packages/api/src/routers/moderation.ts` — `getStrikes` endpoint (needs `readableState` addition)
- `packages/api/src/lib/strike-logic.ts` — `ModerationState` type, thresholds
- `packages/db/src/schema/rebuild.ts` — `userProfile` table schema
- `apps/web/src/components/user-menu.tsx` — needs "Settings" item added
- `apps/web/src/app/settings/page.tsx` — new settings page
- `apps/native/app/(drawer)/_layout.tsx` — needs "Settings" drawer item
- `apps/native/app/settings/account-standing.tsx` — new screen
- `tests/api/moderation-strikes.spec.ts` — existing API contract tests
- `tests/fixtures/moderation-test-constants.ts` — shared constants
- `tests/fixtures/moderation-test-data.ts` — shared test data

### Story Dependencies

- Depends on: Story 4.1 (Graduated Strike System) — **done** (provides `getStrikes` endpoint, stripe logic, moderation state computation)
- Depends on: Story 4.2 (Skip Button) — **done** (no direct dep, but strike-free skip logic affects state)
- Depends on: Story 4.3 (Distinguish Victim from Aggressor) — **done** (report flow affects `flaggedForReview`)
- Related: Story 5.x (Help/Support pages) — future consumer of `/support` placeholder links

### What Must Be Preserved

- Existing `getStrikes` response shape must remain backward-compatible (add `readableState` but keep existing fields)
- Existing `expandModerationState` function must remain unchanged
- Existing user-menu dropdown functionality must remain unchanged (just add "Settings")
- Existing native drawer structure must remain intact (just add "Settings" group)

## Dev Agent Record

### Completion Notes

*(To be filled on completion)*

## File List

*(To be filled on completion)*

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-24 | 1.0 | Story 4.4 spec created: visible moderation state with API enhancement, web + native settings UIs, ATDD scaffolds | Dev Agent |

## Status

draft
