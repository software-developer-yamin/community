# State Audit — 2026-10-09

Audit of `_bmad-output/` planning artifacts against the code as it actually stands at
commit `1436874`. Every claim below is traceable to a file path.

## Verdict

The planning artifacts are **not stale in direction**. They describe a voice-chat
community product, and `apps/native/PRODUCT.md` records a 2026-07-30 product-owner
decision that the full consumer-social product — voice rooms, trainer marketplace,
AI speaking test, full paywall — *is* the native rebuild target. The voice-chat epics
were therefore deferred-then-reinstated, not abandoned. `epics.md` remains correct.

What is genuinely out of sync is narrower, and it splits into two real problems.

## Problem 1 — sprint-status.yaml accuracy (small, fixed)

Three entries did not match the code:

| Entry | Recorded | Actual | Basis |
|---|---|---|---|
| `epic-1` | `in-progress` | `done` | all four stories 1-1…1-4 are `done`; no 1-5 exists in `epics.md` |
| `5-3-refund-mechanism` | `blocked` | `blocked`, no story file | `refundRequest` insert/list exist at `packages/api/src/routers/rebuild.ts:806-827`, but no `epic-005-story-053.md` was ever written, so the story was never scoped |
| `re-3-1-native-mobile-recommendation-feed-expo` | `backlog` | `in-progress` | `apps/native/app/(app)/(tabs)/recommendations.tsx` is 469 lines and wired into the tab shell |

`story_location` also pointed at `/home/yamin/Documents/Yamin Company/community/…`; the
repo now lives at `/home/yamin/Documents/Yamin Portfolio/community/…`.

## Problem 2 — no tracking exists for the native rebuild (large, unaddressed)

`apps/native/ARCHITECTURE.md` §7 defines a 7-phase rebuild roadmap. **No file in
`_bmad-output/` tracks it.** The most recent work — commit `b91b059`, the drawer→tabs
nav refactor — has no epic, no story, no status. Phases 0 and 1 claim to have shipped;
here is what the route tree actually shows.

### Screen coverage against ARCHITECTURE.md §2

`ARCHITECTURE.md` names 125 routes. 26 route files exist. 11 of the 125 spec'd routes
are present:

```
app/call/matching.tsx          app/call/lobby.tsx
app/call/[room].tsx            app/call/ended.tsx
app/ai-test/index.tsx          app/ai-test/record/[topicId].tsx
app/(app)/(tabs)/home.tsx      app/(app)/(tabs)/classes/index.tsx
app/(app)/(tabs)/rooms/index.tsx
app/(app)/(tabs)/learning/index.tsx
app/(app)/(tabs)/my-view/index.tsx
```

**114 spec'd routes do not exist.** Grouped:

- **Entire auth + onboarding tree — 15 routes, 0 built.** No `app/(auth)/` directory at
  all. Sign-in exists only as unstyled components (`components/sign-in.tsx`,
  `sign-up.tsx`, `phone-sign-in.tsx`, `google-sign-in.tsx`, `account-recovery.tsx`) with
  no route wrapping them. There is no login screen reachable in the running app.
- **Trainer marketplace — 9 routes, 0 built.** No `app/classes/` directory. The Classes
  tab is a 149-line static shell.
- **Live room detail/live session — 5 routes, 0 built.** No `app/rooms/` directory. The
  Rooms tab is a placeholder; `ARCHITECTURE.md:92` already flagged this as
  "`rooms.tsx` is a placeholder today".
- **Learning content — 15 routes, 0 built.** No `app/courses/`, `app/vocabulary/`,
  `app/news/`. Learning tab is 169 lines.
- **AI speaking test results/history — 3 of 5 present.** `topics.tsx`, `results/[attemptId].tsx`,
  `history.tsx` missing.
- **Subscription stack — 0 of 12 built.** Only the 312-line `(app)/subscription.tsx`
  exists; the spec wants `app/subscription/` as a 12-route stack.
- **Social/gamification, account, support, settings, legal — 0 built.**
- **Chrome routes missing:** `search`, `notifications`, `messages`, `account`.
  `(app)/settings.tsx` exists but the spec wants a 9-route settings stack.

### Route files with no spec entry

```
app/(app)/(tabs)/ai.tsx            0 lines — hidden via href: null
app/(app)/(tabs)/two.tsx         289 lines — hidden via href: null, dead
app/(app)/ai.tsx                    duplicates (tabs)/ai.tsx
app/(app)/subscription.tsx          spec wants app/subscription/pricing.tsx
app/(app)/ticket/*                  spec wants app/(app)/support/ticket/*
```

`(tabs)/_layout.tsx:87` also declares `<Tabs.Screen name="progress" options={{ href: null }} />`
but no `progress.tsx` route exists. Harmless at runtime (`href: null`), but it is a
stale reference to a route the refactor deleted.

## Problem 3 — no automated test coverage at all

> **Partially resolved 2026-10-09.** See "What changed" below.

- `tests/` holds 153 Playwright specs, of which **153 are skipped** and **0 are active**.
  Every one is an ATDD red-phase stub with the body commented out.
- No test script exists in any `package.json`.
- No test runner is configured for `apps/native` — no jest, vitest, or
  `@testing-library/react-native`. Playwright's `baseURL` targets `localhost:3000`,
  the web app; it cannot exercise the Expo app at all.
- No CI. `.github/workflows/` does not exist.

So the nav refactor — ~1,400 lines across 22 route files — has zero automated
verification. The type errors it introduced were invisible until this audit added a
`check-types` script to `apps/native`, which immediately surfaced three.

## What changed — 2026-10-09

Auth and onboarding routes were built, and a native test runner was stood up. Two
integration defects found during verification are also fixed.

### Route coverage: 11 → 28 of 125

Added 18 routes:

| Area | Routes added |
|---|---|
| Credential + recovery | `(auth)/index`, `_layout`, `splash`, `loading`, `login`, `signup`, `verify-phone`, `verify-email`, `forgot-password`, `reset-password` |
| Onboarding | `(auth)/onboarding/` — `welcome`, `features`, `language`, `goal`, `level`, `daily-goal`, `profile`, `avatar`, `permissions` |

New shared modules: `components/ui/text-field.tsx` (themed labelled input with
focus/error states), `components/onboarding-progress.tsx` (module-scoped store behind
`useSyncExternalStore`, since a context provider would reset on every Stack push),
`components/auth-redirect-guard.tsx`.

`app/_layout.tsx` now nests `AuthRedirectGuard` inside `SessionRestoreGuard` and outside
the `Stack`, so an unauthenticated cold start lands on `/(auth)` while the existing
retry/skeleton logic still runs first.

### Two integration defects found and fixed

1. **`(auth)/` had no `index.tsx`.** `AuthRedirectGuard` redirects to `/(auth)`, which was
   an unmatched route. Added an `index.tsx` that redirects to `/(auth)/login`.
2. **Onboarding was unreachable.** Nothing linked to `onboarding/welcome`, and `signup`
   replaced straight to `/(app)`. `signup` now replaces to `/(auth)/onboarding/welcome`.

### Test runner

`apps/native` now has `jest-expo` + `@testing-library/react-native` and a `test` script,
with `jest.setup.ts` mocking unistyles, reanimated, and the native Expo modules that
cannot load in Node. **9 tests across 3 suites pass**, covering the 5-tab shell (names,
titles, no duplicates, auxiliary routes hidden), `TextField` error/typing behaviour, and
`AuthRedirectGuard` pending/resolved states.

The root `tests/` Playwright stubs are untouched — still 153 skipped. There is still **no
CI**: `.github/workflows/` does not exist, so nothing runs on push.

## Recommended next actions

1. ~~**Build `app/(auth)/` first.**~~ **Done 2026-10-09** — 18 routes added, see above.
2. ~~**Stand up a native test runner.**~~ **Done 2026-10-09** — `jest-expo` + RNTL, 9
   tests passing. The 153 Playwright stubs remain skipped.
3. **Add CI.** Nothing runs on push. `.github/workflows/` does not exist, so both the
   typecheck and the new jest suite are advisory only until a workflow runs them.
4. **Build `app/classes/` next** (9 spec'd routes, 0 built). The Classes tab is a 149-line
   static shell; the trainer marketplace is the largest coherent remaining block.
5. **Delete `two.tsx` and `ai.tsx`** and the stale `progress` tab entry once the Learning
   tab absorbs the AI speaking test entry point, per `ARCHITECTURE.md:22`.