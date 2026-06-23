---
baseline_commit: 52cd5b2
---

# Story 3.3: Match Timeout with Honest State

Status: ready-for-dev

## Story

As a Learner,
I want to see real-time status while waiting for a match,
So that I know the system is working and I'm not stuck in an invisible queue.

## Acceptance Criteria

1. **"Looking for a partner..." with animated indicator** — Given I join the matchmaking queue, When I wait for a match, Then I see "Looking for a partner..." with an animated indicator (spinner/pulsing dots) And status updates every 15 seconds.

2. **60-second timeout — transparent message** — Given I wait for more than 60 seconds, When no match is found, Then the status changes to "No partners online right now — we'll keep trying" And I can choose to continue waiting or exit the queue.

3. **5-minute timeout — offer choices** — Given I wait for 5 minutes, When no match is found, Then I am offered options to lower filter strictness or exit And the system is transparent about the wait time.

4. **Match found — fast transition** — Given the matchmaking queue, When the system finds a match, Then the transition to the call screen happens within 3 seconds.

5. **Filter awareness** — Given I have a gender preference set (premium_plus), When the 60-second timeout fires, Then the status can suggest "Few partners match your current filters" if gender filter is actively reducing candidates.

6. **Exit queue** — Given I am waiting in the queue, When I tap "Exit", Then the polling stops And I am returned to the previous screen.

7. **Persistent state across backgrounding** — Given I am waiting for a match, When I background and re-enter the app, Then the timer continues from where it left off (or resumes/resets transparently).

## Tasks / Subtasks

### Task 1: API — Add queue status endpoint (or extend matchPartners)

The current `matchPartners` is a one-shot synchronous call. The queue is entirely stateless — the client keeps polling `matchPartners`. For this story, the API remains stateless; the client drives the timeout logic. However, we need to ensure the API returns enough info for the client to determine its queue state:

- [ ] 1.1 Ensure `matchPartners` returns `totalNearby` count (how many total candidates passed similarity + CEFR before gender filter) so the client can estimate pool availability
- [ ] 1.2 Add optional `return { partners, reason, queueStats: { totalCandidates: number, genderFiltered: number } }` to the response
- [ ] 1.3 Ensure the API handler doesn't block on network calls — if LLM/embed service is slow, `matchPartners` should still return quickly

### Task 2: API — Match readiness check (fast path)

- [ ] 2.1 Add a lightweight `checkMatchReady` procedure that does a quick polling check (simplified `matchPartners` that just checks if ANY candidate exists without fetching full embeddings) — returns boolean + candidate count
- [ ] 2.2 This is optional; the existing `matchPartners` may suffice since it's already fast (<500ms)

### Task 3: Web UI — Match queue screen with timer

Create a new match queue page/component at `apps/web/src/app/dashboard/matching/page.tsx` (or similar):

- [ ] 3.1 Build a `MatchQueue` client component that:
  - Shows "Looking for a partner..." with an animated CSS indicator (pulsing dots or spinner)
  - Polls `matchPartners` every 5 seconds
  - Maintains a client-side `elapsed` timer (in seconds)
  - Updates status text at thresholds: 15s ("Still looking..."), 60s ("No partners online right now — we'll keep trying"), 300s ("We've been looking for 5 minutes")
  - Shows elapsed time in MM:SS format
  - Shows "Exit" button at all times
  - Shows "Adjust Filters" button after 60s
  - Shows "Lower Filter Strictness or Exit" options after 300s

- [ ] 3.2 Animated indicator:
  - Use CSS animation (no extra deps) — three pulsing dots or a spinning ring
  - Smooth, non-distracting, accessible (`prefers-reduced-motion` support)

- [ ] 3.3 Match found transition:
  - When `matchPartners` returns a partner, stop polling
  - Navigate to `/call/[room]` within 3 seconds
  - Show a 1-second "Partner found!" transitional state before navigation

- [ ] 3.4 Empty state:
  - If `matchPartners` returns `reason: "no_embedding"`, show "Set up your profile first" with a link to onboarding
  - Not a queue state — don't start the timer

- [ ] 3.5 Filter awareness:
  - When `queueStats.genderFiltered > 0` at the 60s mark, show "Your gender preference is filtering some potential matches"
  - Offer "Adjust filter" option that navigates to settings

- [ ] 3.6 Wire the "Find a Partner" button in the dashboard to navigate to this matching screen

### Task 4: Native UI — Match queue screen with timer

Create a matching screen in the native app:

- [ ] 4.1 Build a `MatchingScreen` component (new route: `apps/native/app/call/matching.tsx` or inline in a modal):
  - Same status progression as web (15s, 60s, 300s thresholds)
  - Same animated indicator (RN ActivityIndicator or custom animated view)
  - Shows elapsed time in MM:SS
  - "Exit" button, "Adjust Filters" button (after 60s)
  - "Continue Waiting" + "Lower Filter Strictness" + "Exit" options (after 300s)

- [ ] 4.2 Match found transition:
  - Stop polling, show "Partner found!" for 1 second
  - Navigate to `/call/[room]` within 3 seconds

- [ ] 4.3 Wire the lobby/start screen to have a "Find a Match" button that navigates to matching screen

- [ ] 4.4 Empty state handling — if `no_embedding`, show profile setup prompt

### Task 5: Backgrounding/resume handling

- [ ] 5.1 Store `elapsed` in a ref (not state) so it survives re-renders but not navigation
- [ ] 5.2 On `AppState` change (native: `AppState.addEventListener('change', ...)`, web: `visibilitychange`), pause/resume the timer
- [ ] 5.3 When coming back from background for >30s, reset the timer and show "Reconnecting to queue..." briefly (the poll was paused, so the first poll on resume gets a fresh result)

### Task 6: Verification

- [ ] 6.1 LSP diagnostics clean on all changed files (`pnpm check-types`)
- [ ] 6.2 `pnpm dlx ultracite fix` run
- [ ] 6.3 No `console.log`, no `as any`, no `@ts-expect-error`
- [ ] 6.4 Manual verification:
  - Test queue with no partners online: timer shows 15s, 60s, 300s messages
  - Test match found: partner returned within 3 seconds of navigation
  - Test exit: returns to previous screen
  - Test filter awareness: with gender filter active, see filter hint at 60s
  - Test backgrounding: timer pauses/resumes correctly

## Dev Notes

### Key Design Decisions

- **Stateless queue, timer-driven client** — The matchmaking system (`matchPartners`) is inherently stateless (no persistent queue table). "Queue" state is emulated entirely on the client side via polling + elapsed timer. This avoids a new DB table and queue worker, keeping scope manageable. The timer drives the UX; the polling drives the match detection.

- **Polling interval = 5 seconds** — Frequent enough to feel responsive when a match arrives, infrequent enough to avoid excessive API calls. `matchPartners` already completes in <500ms (DB + cosine similarity only, no LLM call).

- **Three timeout tiers** — Matching the AC exactly:
  - Tier 1 (0-60s): "Looking for a partner..." — normal waiting
  - Tier 2 (60-300s): "No partners online right now" + exit/continue options — transparent honesty
  - Tier 3 (300s+): Filter adjustment offered — proactive user empowerment

- **No new DB schema needed** — This story is purely client-side timer + polling logic. No migration required.

- **Gender filter awareness is best-effort** — The `queueStats.genderFiltered` field from `matchPartners` tells the client how many candidates were removed by gender filter. If this is >0 at the 60s mark, the queue screen shows a gentle hint. This is not a guarantee that removing the filter would find a match — it's transparency.

- **Fast match transition** — The AC requires ≤3s transition. Since `matchPartners` returns immediately (no async wait) and the room token/LiveKit room creation can be done synchronously, this is achievable. Pre-create the room on the server during `matchPartners` or use a dedicated `createMatchRoom` endpoint that the client calls immediately after receiving a partner.

### Matching Flow

Current flow:
```
User taps "Find a Match"
  → Navigate to matching screen
  → Poll matchPartners every 5s
  → No partners → timer advances, status updates
  → Partner found:
      → Stop polling
      → Show "Partner found!" (1s)
      → Call createRoom + get token (or pre-created)
      → Navigate to /call/[room]
```

### Room Creation for Match

For match-based calls (not the existing room lobby), consider:
- Option A: Pre-create the room on the server when `matchPartners` runs (extra write but zero-latency join)
- Option B: Create room client-side immediately after receiving partner (simpler, +500ms latency)
- **Recommendation**: Option B — simpler, no orphaned room risk. The 3-second transition window is generous enough.

```typescript
// On match found:
const token = await orpc.livekit.token.mutate({ room: partnerRoomName, username });
router.push(`/call/${partnerRoomName}`);
```

### Timer Logic

```typescript
// Client-side timer (React hook pattern)
const [elapsed, setElapsed] = useState(0);
const [status, setStatus] = useState<MatchStatus>("searching");
const intervalRef = useRef<ReturnType<typeof setInterval>>();

useEffect(() => {
  intervalRef.current = setInterval(() => {
    setElapsed((prev) => {
      const next = prev + 1;
      if (next >= 300) setStatus("long_wait");
      else if (next >= 60) setStatus("stale");
      return next;
    });
  }, 1000);
  return () => clearInterval(intervalRef.current);
}, []);

// Separate polling loop
useEffect(() => {
  const poll = setInterval(async () => {
    const result = await orpc.models.matchPartners.query({ limit: 1 });
    if (result.partners.length > 0) {
      setMatchFound(result.partners[0]);
    }
  }, 5000);
  return () => clearInterval(poll);
}, []);
```

### Status Text Progression

| Time | Status Text | Actions Available |
|------|------------|-------------------|
| 0-15s | "Looking for a partner..." | Exit |
| 15-60s | "Still looking... (XXs)" | Exit |
| 60-300s | "No partners online right now — we'll keep trying" | Exit, Continue Waiting, Adjust Filters |
| 300s+ | "We've been looking for 5 minutes" | Exit, Lower Filter Strictness, Continue Waiting |

### Relevant Files

- `packages/api/src/routers/models.ts` — matchPartners: add `queueStats` to response (totalCandidates, genderFiltered)
- `apps/web/src/app/dashboard/page.tsx` — web dashboard: add "Find a Partner" button
- `apps/web/src/app/dashboard/dashboard.tsx` — web dashboard client component
- `apps/web/src/app/dashboard/matching/page.tsx` — **NEW** web match queue screen
- `apps/native/app/call/lobby.tsx` — native lobby: add "Find a Match" button
- `apps/native/app/call/matching.tsx` — **NEW** native match queue screen
- `apps/native/app/call/[room].tsx` — existing call screen (no changes expected)

### Story Dependencies

- Depends on: Epic 1 (authentication, API infrastructure) — **done**
- Depends on: Story 3.1 (Gender Filter Enforcement) — **done**
- Depends on: Story 3.2 (Native Language Field) — **done**
- Related: Story 2.4 (Explicit Call End) — the call/ended flow leads back to matching

### What Must Be Preserved

- Existing `matchPartners` API must continue returning the same shape (extra fields optional)
- Existing lobby (room-based) must continue working unchanged
- Existing `matchPartners` filtering logic (CEFR, gender) must remain untouched
- Existing call screen (`[room].tsx`) must not be modified
- No breaking changes to existing `orpc.models.matchPartners` consumers
- The polling must stop when the user exits the queue or a match is found (no orphaned requests)
- Timer must use `useRef` for interval cleanup to prevent memory leaks
