# Epic 4: Moderation & Trust System — Test Design

**Generated:** 2026-06-23
**Epic:** 4 — Moderation & Trust System
**FRs covered:** FR11 (graduated strikes), FR12 (victim/aggressor), FR13 (visible moderation state), FR21 (skip button)
**Stories:** 4.1 (Graduated Strike), 4.2 (Skip Button), 4.3 (Victim/Aggressor), 4.4 (Visible Moderation State)
**Stack:** Hono backend, Drizzle/PostgreSQL, oRPC, Playwright (root-level), TanStack Query (web)

---

## 1. Risk Assessment

### High-Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| Strike state machine correctness — wrong state transitions could ban innocent users or let abusers through | User trust, NFR12 (≤1% false-positive) | State machine unit tests covering every transition; property-based testing for long sequences |
| 60-second report window race condition — report arrives just after the window closes | Wrongful strike, user frustration | Clock-skew-tolerant implementation; integration test with boundary (±1s) timing |
| Strike decay (30-day reset) — incorrect decay logic per-user instead of per-strike | Accumulated unfair penalties | Explicit decay algorithm specified; tested with multiple strike timestamps |
| Concurrent strike events — two short disconnects in rapid succession | Double-counting | Serialization per user_id; integration test with near-simultaneous requests |
| Skip rate limiting (1 skip / 5s) — bypass or lockout | UX degradation or abuse | Server-enforced rate limit + client-disable; test both sides |
| False-positive rate target (NFR12: ≤1%) — hard to verify statistically | Compliance | Requires batch analytics pipeline; unit-test the logic that voids strikes on report |

### Medium-Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| Strike counting with ≥30s calls excluded | Incorrect counts if duration is misreported | Integration test with call duration <30s vs ≥30s |
| Moderation state display latency — user sees stale state | Confusion, support tickets | Cache-bust on state change; E2E test verifying immediate reflection |
| Skip returning to queue within 3s | UX promise broken | E2E timing assertion |
| 3-skips-per-session nudge UX | Nudge shown too early/late | Integration test counting skip events per session |

---

## 2. Test Strategy Per Story

### Story 4.1: Graduated Strike System
- **Focus:** State machine, strike counting, decay, cooldowns
- **Layer:** Unit (strike logic) + Integration (API endpoints)
- **NFR coverage:** FR11, NFR12
- **Edge cases:** Consecutive vs non-consecutive disconnects, 30-day gap decay, ≥30s exempt calls

### Story 4.2: Skip Button (In-Call Action)
- **Focus:** Skip rate limiting, strike-free behavior, session skip counting
- **Layer:** Integration (API) + E2E (UI)
- **NFR coverage:** FR21
- **Edge cases:** Rapid skips (>1/5s), 3-skips-per-session nudge, skip during reconnection

### Story 4.3: Distinguish Victim from Aggressor
- **Focus:** 60s report window, strike voiding, partner flagging
- **Layer:** Integration (API) + Unit (void logic)
- **NFR coverage:** FR12
- **Edge cases:** Report exactly at 60s boundary, report after strike decay, report for non-call-ending scenarios

### Story 4.4: Visible Moderation State
- **Focus:** State readback, plain-language explanations, appeal flow
- **Layer:** Integration (API) + E2E (UI)
- **NFR coverage:** FR13
- **Edge cases:** All states (clean/warned/cooldown/suspended/banned), cooldown countdown, banned appeal flow

---

## 3. Test Architecture

```
tests/
├── api/
│   └── moderation-strikes.spec.ts      # Story 4.1 + 4.3 (API tests)
│   └── moderation-skip.spec.ts          # Story 4.2 (API tests)
│   └── moderation-state.spec.ts         # Story 4.4 (API tests)
├── e2e/
│   └── moderation-strikes.spec.ts       # Story 4.1 (E2E flow)
│   └── moderation-skip.spec.ts          # Story 4.2 (E2E flow)
│   └── moderation-state.spec.ts         # Story 4.4 (E2E flow)
├── fixtures/
│   └── moderation-test-constants.ts     # Strike thresholds, timeouts
│   └── moderation-test-data.ts          # Test users, call durations
```

### Test Infrastructure Requirements

1. **Time manipulation** — strike decay (30 days) and cooldowns (1h, 24h) require DB-level time mocking or a `now()` override via config
2. **Auth helpers** — existing session fixture from `tests/fixtures/test-data.ts` extended with moderation-state
3. **Duration fixtures** — call records with known durations for strike threshold testing

---

## 4. Key Test Scenarios (Story 4.1 - Prioritized)

### P0 — State Machine Correctness

```
Scenario: Warning on 3rd short disconnect
  Given user has 0 strikes
  When user disconnects 3 calls, each <30s and within 24h
  Then user receives strike count = 3
  And moderation state = "warned"
  And no queue block is applied

Scenario: 1h cooldown on 5th short disconnect
  Given user has 3 strikes
  When user disconnects 2 more short calls (<30s)
  Then user receives strike count = 5
  And moderation state = "cooldown_1h"
  And queue is blocked for 1 hour

Scenario: 24h cooldown on 10th short disconnect
  Given user has 8 strikes
  When user disconnects 2 more short calls (<30s)
  Then user receives strike count = 10
  And moderation state = "cooldown_24h"
  And account is flagged for human review

Scenario: Strike decay after 30 clean days
  Given user has 3 strikes
  When 30 days pass with no short disconnects
  Then strike count = 0
  And moderation state = "clean"

Scenario: Long call (≥30s) does not count as strike
  Given user has 2 strikes
  When user ends a call that lasted ≥30s
  Then strike count remains 2
  And no new strike is added
```

### P1 — API Contract & Error Handling

```
Scenario: Get strike count for authenticated user
  GET /api/moderation/strikes → 200 { count, state, readableState }

Scenario: Get strike count for unauthenticated user
  GET /api/moderation/strikes → 401

Scenario: Strike endpoint rejects invalid user_id
  GET /api/moderation/strikes?userId=invalid → 400
```

### P2 — Edge Cases

```
Scenario: Non-consecutive short calls (one per day for 10 days)
  → Each day adds 1 strike, decay doesn't apply until 30-day gap

Scenario: Concurrent strike increments
  → Serialization prevents double-counting same disconnect event

Scenario: Strike count persisted across server restart
  → Strike state survives process restart
```

---

## 5. NFR Test Mapping

| NFR | Target | Test Strategy |
|-----|--------|---------------|
| NFR12: False-positive strike rate ≤ 1% | ≤ 1% of strikes issued to users who reported partner within 60s | Unit: verify void-strike logic on report. Batch: requires analytics pipeline to measure rate over N=10k+ events |

---

## 6. Test Doubles Strategy

| Dependency | Double Type | Notes |
|------------|-------------|-------|
| PostgreSQL (strike table) | Testcontainers or in-memory Drizzle SQLite | Drizzle supports multiple dialects — use `libsql` for fast unit tests |
| Time | `vi.setSystemTime()` (Vitest) or DB-level `now()` override | Required for decay/cooldown testing |
| Auth/sessions | Existing auth fixtures from test-data.ts | Reuse `testUserId`, `testAuthToken` |

---

## 7. Implementation Order

1. **Story 4.1 (this batch)** — Strike state machine + API endpoints
   - Unit: strike-logic.ts (pure functions, no DB)
   - Integration: moderation-strikes.spec.ts (API tests)
   - E2E: full strike → warn → cooldown flow
2. Story 4.2 — Skip button rate limiting + strike-free logic
3. Story 4.3 — Report handling + strike voiding
4. Story 4.4 — Moderation state read API + UI
