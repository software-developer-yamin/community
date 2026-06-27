---
baseline_commit: ac488f3
---

# Story 6.1: State Preservation Across App Backgrounding

## Story

As a Learner,
I want to return to my app after backgrounding it and still be in my call or queue,
So that I don't lose my place when I switch apps briefly.

## Status

in-progress

## Context: What Is Already Built

The following exist and must NOT be recreated:

- **`apps/native/utils/call-state-storage.ts`** — expo-secure-store wrapper for persisting/restoring call state. **HAS A BUG**: default TTL is 5 minutes, spec requires 30 minutes.
- **`apps/native/utils/network-state.ts`** — network availability check and offline error classifier.
- **`apps/native/app/call/[room].tsx`** — full call screen with LiveKit reconnection logic.
- **`apps/native/app/_layout.tsx`** — root layout with SessionRestoreGuard, TokenRefreshProvider.
- **`apps/native/app/(drawer)/(tabs)/two.tsx`** — profile tab with sign-out button.
- **`apps/native/app/(drawer)/index.tsx`** — drawer home with sign-out button.
- **`app.json`** — already has `@livekit/react-native-expo-plugin` (addresses R-011 foreground service).

## Tasks/Subtasks

- [x] T1: Fix `isStateStale` TTL bug — change default from 5 min to 30 min (BLOCK risk R-007)
  - [x] T1.1: Update `ttlMs` default in `call-state-storage.ts` from `5 * 60 * 1000` to `30 * 60 * 1000`

- [x] T2: Write unit tests for `call-state-storage.ts` (Bun test runner, co-located)
  - [x] T2.1: 6.1-UNIT-001 — `saveCallState` persists JSON with correct fields
  - [x] T2.2: 6.1-UNIT-002 — `getCallState` returns null on empty store
  - [x] T2.3: 6.1-UNIT-003 — `isStateStale` returns false within 30-min TTL
  - [x] T2.4: 6.1-UNIT-004 — `isStateStale` returns true after 30 min
  - [x] T2.5: 6.1-UNIT-005 — `clearCallState` removes persisted state
  - [x] T2.6: 6.1-UNIT-006 — corrupt JSON gracefully returns null (no throw)
  - [x] T2.7: 6.1-UNIT-009 — `clearCallState` on logout prevents cross-user state leak
  - [x] T2.8: 6.1-UNIT-010 — `saveCallState` overwrites existing state atomically

- [x] T3: Write unit tests for `network-state.ts` (Bun test runner, co-located)
  - [x] T3.1: 6.1-UNIT-007 — `checkNetworkAvailable` falls back to `true` on exception
  - [x] T3.2: 6.1-UNIT-008 — `isOfflineError` classifies TypeError messages correctly
  - [x] T3.3: 6.1-UNIT-011 — `isOfflineError` ignores non-TypeError errors

- [x] T4: Save/clear call state in the call screen (R-001 mitigation)
  - [x] T4.1: In `[room].tsx`, call `saveCallState` immediately when token is received
  - [x] T4.2: In `[room].tsx`, call `clearCallState` on every intentional exit path

- [x] T5: OS-kill recovery on app startup (AC-3)
  - [x] T5.1: Create `apps/native/components/call-state-restore-guard.tsx`
  - [x] T5.2: Integrate into `_layout.tsx` inside `SessionRestoreGuard`

- [x] T6: Clear call state on sign-out (R-010 / UNIT-009 mitigation)
  - [x] T6.1: Add `clearCallState()` call before `authClient.signOut()` in `two.tsx`
  - [x] T6.2: Add `clearCallState()` call before `authClient.signOut()` in drawer `index.tsx`

## Acceptance Criteria

### AC-1: Call survives backgrounding
Given I am in an active call
When I background the app for up to 30 minutes
Then the call continues (LiveKit + Android foreground service maintains connection)
And when I return, I am still in the call

### AC-2: Queue position preserved
Given I am in the matchmaking queue
When I background the app
Then I remain in the queue
And when I return, my queue position is preserved

### AC-3: OS-kill shows "Call ended — connection lost"
Given the OS terminates the app while backgrounded
When I reopen the app
Then I see "Call ended — connection lost"
And no strike is assessed for the disconnect

### AC-4: UI state restored on return
Given I return to the app after backgrounding
When the app resumes
Then the UI state is restored (same screen, same data)
And no re-authentication is required

## Dev Notes

### Block Risks Addressed
- **R-001** (OS-kill state loss): `saveCallState` called immediately on token receipt in `[room].tsx`. All exit paths call `clearCallState` so a missing state correctly indicates intentional end.
- **R-007** (TTL mismatch): Changed default TTL from 5 min to 30 min. Unit tests 6.1-UNIT-003/004 enforce this at the source.
- **R-011** (Android foreground service): `app.json` already has `@livekit/react-native-expo-plugin` with `audioType: "communication"` and foreground service permissions. Verified in T5.

### Test Framework
Bun built-in test runner (`bun:test`). Run with:
```bash
bun test apps/native/utils/call-state-storage.test.ts
bun test apps/native/utils/network-state.test.ts
```
Or all native utils:
```bash
bun test apps/native/utils/
```

### Architecture: OS-Kill Recovery Flow
1. User joins room → `saveCallState({ roomName, token, userId, timestamp })` written to SecureStore
2. OS kills app → state survives in SecureStore
3. User reopens app → `SessionRestoreGuard` restores session
4. `CallStateRestoreGuard` (inside SessionRestoreGuard) reads SecureStore on mount
5. If state found and not stale (< 30 min): clear state, `router.replace("/call/ended?reason=connection_lost")`
6. If state found but stale (> 30 min): silently clear state, normal startup
7. User intentionally ends call → `clearCallState()` is called, so next startup finds no state

### Architecture: Backgrounding (AC-1/AC-2)
LiveKit maintains the WebRTC connection while the app is backgrounded via the Android foreground service declared through `@livekit/react-native-expo-plugin`. The existing reconnection logic in `[room].tsx` handles re-establishing the UI when the app foregrounds. No additional native code is required for AC-1/AC-2.

## File List

| File | Action |
|------|--------|
| `_bmad-output/implementation-artifacts/stories/epic-006-story-061.md` | NEW — this file |
| `apps/native/utils/call-state-storage.ts` | UPDATE — fix TTL 5 min → 30 min |
| `apps/native/utils/call-state-storage.test.ts` | NEW — 8 unit tests (P0+P1) |
| `apps/native/utils/network-state.test.ts` | NEW — 3 unit tests (P0+P1) |
| `apps/native/components/call-state-restore-guard.tsx` | NEW — startup OS-kill recovery |
| `apps/native/app/_layout.tsx` | UPDATE — add CallStateRestoreGuard |
| `apps/native/app/call/[room].tsx` | UPDATE — save/clear call state |
| `apps/native/app/(drawer)/(tabs)/two.tsx` | UPDATE — clearCallState on sign-out |
| `apps/native/app/(drawer)/index.tsx` | UPDATE — clearCallState on sign-out |

## Dev Agent Record

### Implementation Plan

1. Fix TTL bug in `call-state-storage.ts` (30 min TTL)
2. Write unit tests for both utility files using Bun test runner with `mock.module()` for native module mocking
3. Add `saveCallState()` in `[room].tsx` when token is received; add `clearCallState()` to all exit paths
4. Create `CallStateRestoreGuard` component for OS-kill recovery
5. Wire `CallStateRestoreGuard` into `_layout.tsx`
6. Add `clearCallState()` to both sign-out handlers

### Completion Notes

All tasks completed. Key implementation decisions:
- Used Bun's `mock.module()` for native module mocking (automatically hoisted before static imports)
- `CallStateRestoreGuard` renders children immediately and navigates in `useEffect` (avoids blocking startup)
- `clearCallState()` is fire-and-forget on sign-out (best-effort; sign-out navigation will occur regardless)
- The `isStateStale` TTL constant is now `30 * 60 * 1000` — unit tests 003/004 will fail if reverted

### Change Log

- 2026-06-28: Story created; all 6 task groups implemented; status set to review.
