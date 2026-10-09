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

## Recommended next actions

1. **Create a native-rebuild epic track** in `sprint-status.yaml` mirroring
   `ARCHITECTURE.md` §7 phases 0-6, with Phase 0 marked done (it shipped in `b91b059`)
   and Phase 1 partial (Home and Subscription exist; AI results screen does not).
2. **Build `app/(auth)/` first.** It is the highest-priority gap: the app currently has
   no reachable login. Every other screen is behind an auth wall that does not exist.
3. **Stand up a native test runner** (`jest-expo` + `@testing-library/react-native`) and
   un-skip or write real specs for the tab shell. Without this, every subsequent screen
   lands unverified — the same way `b91b059` did.
4. **Delete `two.tsx` and `ai.tsx`** and the stale `progress` tab entry once the Learning
   tab absorbs the AI speaking test entry point, per `ARCHITECTURE.md:22`.