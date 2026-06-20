---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-20'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/stories/epic-002-story-021.md
  - _bmad-output/implementation-artifacts/stories/epic-002-story-022.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/project-context.md
  - _bmad/tea/config.yaml
knowledgeFragments:
  - risk-governance.md
  - probability-impact.md
  - test-levels-framework.md
  - test-priorities-matrix.md
  - nfr-criteria.md
---

# Test Design: Epic 2 — Call Reliability & Reconnection

**Date:** 2026-06-20
**Author:** Yamin
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-Level test design for Epic 2 (Call Reliability & Reconnection), covering Story 2.3 (Full Reconnection 5-30s Blips) and Story 2.4 (Explicit Call End). Stories 2.1 (Room Lifecycle) and 2.2 (ICE Restart) are complete and this plan builds on their foundations.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (>=6): 3
- Critical categories: OPS (reconnection reliability), SEC (token expiry), TECH (state machine race conditions)

**Coverage Summary:**

- P0 scenarios: 20 (~30-45h)
- P1 scenarios: 14 (~14-22h)
- P2/P3 scenarios: 8 (~4-8h)
- **Total effort**: ~48-75h over 2-3 weeks

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Story 2.1 (Room Lifecycle)** | Already implemented and tested | Verify no regressions from story 2.3/2.4 changes |
| **Story 2.2 (ICE Restart 1-5s)** | Already implemented and tested | Verify ICE restart does not interfere with full reconnection flow |
| **Moderation strike system (Epic 4)** | Will be covered in dedicated Epic 4 test plan | Document interface points: Story 2.4 AC4 (no strike for connection loss) |
| **LiveKit Cloud infrastructure** | External dependency, not testable directly | Monitor LiveKit status; test against documented SLOs |
| **Native E2E (Expo/Detox)** | No native test framework configured | Web E2E covers core logic; native-specific scenarios marked as P2 manual |

---

## Risk Assessment

### Story Context

Story 2.3 extends ICE restart (2.2) for blips lasting 5-30s. When ICE restart fails, the system shows a "reconnecting..." indicator with elapsed time. At 30s, a "connection lost" prompt offers retry or end call. Partner is notified that the user is reconnecting.

Story 2.4 ensures every call end shows a clear reason: "you ended", "partner ended", or "connection lost". Post-call rating prompt appears. Connection loss never labeled as "partner left".

### High-Priority Risks (Score >= 6)

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | - | - | ----- | ---------- | ----- | ------- |
| R2.3-A | OPS | Reconnection timeout race: 30s countdown expires while network recovers — user sees "connection lost" prematurely. Edge case where TCP half-open or delayed ACK causes false timeout. | 3 | 3 | **9** | Add 5s grace window after countdown; verify connection state with LiveKit API before showing prompt. Debounce transition to "connection lost" | Dev | Story 2.3 impl |
| R2.3-B | OPS | Token expiry (5min TTL) during extended reconnection, causing full room disconnect even if network recovers. LiveKit token minted at call start expires during 30s+ blip | 3 | 3 | **9** | Add server-side token refresh procedure for active rooms; client requests new token on reconnection after >4min. Verify `livekit-client` default 10s reconnect covers token refresh window | Dev | Story 2.3 impl |
| R2.3-C | TECH | State machine inconsistency: user reconnects while partner sees "partner disconnected" or vice versa — mismatched call states between participants. ICE restart failure vs full reconnection vs intentional end are not clearly separate code paths | 2 | 3 | **6** | Define and unit-test explicit state machine: idle -> connecting -> active -> reconnecting -> connection_lost -> ended. Integration test both clients simultaneously | Dev | Story 2.3 impl |
| R2.4-A | BUS | Wrong end reason shown: connection loss is misclassified as "partner ended" or vice versa, violating Story 2.4 AC3 ("connection lost is never labeled as your partner left"). Builts on webhook signal ambiguity in Story 2.1 | 2 | 3 | **6** | End reason is server-authoritative from call_record table. Verify webhook sequence: room.finished vs explicit endCall order determines reason. Integration test all 3 end paths | Dev | Story 2.4 impl |
| R2.3-D | TECH | Partner reconnection notification causes premature call end — partner's client receives "user reconnecting" event and navigates away or triggers end flow | 2 | 2 | **4** | Partner client ignores "reconnecting" state for call-end decisions. Only "connection_lost" (>=30s) should trigger end flow on partner side | Dev | Story 2.3 impl |
| R2.4-B | OPS | 10-second "waiting" window (AC2) interrupted by partner reconnection — ambiguous UX state if partner returns during countdown | 2 | 2 | **4** | Add abort logic: if partner reconnects during 10s window, dismiss "waiting" and return to active call. Test reconnection during waiting window | Dev | Story 2.4 impl |
| R2.3-E | TECH | Retry loop (AC3) runs indefinitely on dead network — infinite retries waste battery/data. No max retry limit | 2 | 2 | **4** | Cap retries at 3 attempts; after 3 failures, show persistent "connection lost" with manual retry button. Exponential backoff: 2s, 4s, 8s | Dev | Story 2.3 impl |
| R2.4-C | DATA | Post-call rating data loss when end screen is dismissed or navigated away before rating submitted. Skipped ratings are lost permanently | 1 | 2 | **2** | Persist rating in local storage pending submission; allow rating from call history (Story 7.1). Document as P3 | Dev | Story 2.4 |
| R2.3-F | TECH | Web vs Native SDK reconnection behavior differs — `livekit-client` (web) vs `@livekit/react-native` (native) have different reconnection timeouts/event sequences | 2 | 2 | **4** | Test reconnection flows on both platforms; document known differences. SDK version alignment check in CI | QA | Story 2.3 impl |
| R2.4-D | BUS | Strike system integration: Story 2.4 AC4 requires connection-loss end to NOT issue a strike. If moderation system (Epic 4) not yet implemented, this could default to strike | 2 | 2 | **4** | Stub strike API for integration tests; verify end reason=connection_lost does not produce strike event. Flag as Epic 2-to-Epic 4 dependency | Dev | Story 2.4 impl |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Reliability | NFR4: 1s blip resume >= 95% (ICE restart) | R2.3-A | Integration test with network disruption (tc/netem on CI); measure resume success rate over 100 iterations | CI test report with pass rate |
| Reliability | NFR5: 5s blip resume >= 80% (full reconnection) | R2.3-A, R2.3-B | Integration test simulating 5s network drop; measure full reconnection success rate | CI test report with pass rate |
| Reliability | NFR10: Disconnect-during-call <= 5% | R2.4-A | Monitoring: track call_end_reason distribution; alert if connection_lost > 5% of total calls | Dashboard (evlog metrics) |
| Security | Token refresh during reconnection: no expired token causes disconnect | R2.3-B | Integration test with token expiry during blip; verify refresh-then-reconnect flow | Test report |
| Performance | Reconnection time p95 <= 3s (full reconnect from 5s blip AC measurement) | R2.3-A | k6/API timing test: measure end-to-end reconnection time | k6 report |
| Maintainability | State machine is single source of truth for call states | R2.3-C | Unit test all state transitions; lint against uncovered branches | Code coverage report |

**Unknown thresholds:** 
- Reconnection time p95 threshold (3s is an assumption; refine during implementation)
- Number of retry attempts before manual intervention (capped at 3 per risk R2.3-E)

---

## Entry Criteria

- [x] Story 2.1 (Room Lifecycle) implemented and tested
- [x] Story 2.2 (ICE Restart) implemented and tested
- [ ] Story 2.3 ACs finalized and approved
- [ ] Story 2.4 ACs finalized and approved
- [ ] Test environment with LiveKit Cloud sandbox available
- [ ] Network disruption tooling (tc/netem) available in CI
- [ ] Offline more testing capability (DevTools/Expo developer menu)

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged with waiver)
- [ ] No open HIGH-risk items unmitigated
- [ ] Reconnection state machine unit-tested (all transitions)
- [ ] End reason accuracy verified on all 3 paths (you/partner/connection_lost)
- [ ] Cross-platform parity confirmed (web + native)
- [ ] NFR evidence identified for all in-scope NFR categories

---

## Test Coverage Plan

### P0 — Critical (Must Test)

**Criteria:** Blocks core functionality + High risk (>=6) + No workaround

| Test ID | Scenario | Level | Risk Link | Notes |
| ------- | -------- | ----- | --------- | ----- |
| 2.3-INT-001 | Network drops 10s — reconnecting banner shows with elapsed countdown | Integration | R2.3-A | Verify `connectionState === Reconnecting`, countdown visible per UX-DR10 |
| 2.3-INT-002 | Network recovers before 30s — call resumes, banner hides | Integration | R2.3-A | Full reconnect cycle within timeout |
| 2.3-INT-003 | 30s timeout reached — "connection lost" prompt with retry/end options | Integration | R2.3-A | Verify graceful timeout, both buttons visible |
| 2.3-INT-004 | User taps retry — reconnection attempt begins | Integration | R2.3-A | Retry triggers new connection attempt |
| 2.3-INT-005 | Retry succeeds after 2nd attempt — call resumes | Integration | R2.3-E | Retry logic with backoff, verify resume |
| 2.3-INT-006 | All retries exhausted (3 failures) — persistent "connection lost" | Integration | R2.3-E | Max retry cap, manual retry button shown |
| 2.3-INT-007 | Token expiry during 30s blip — new token fetched before reconnect | Integration | R2.3-B | Token refresh procedure, verify +4min edge |
| 2.3-INT-008 | Partner sees no reconnection indicator during user's blip | Integration | R2.3-C | Local vs remote state isolation |
| 2.3-INT-009 | Partner notified "partner is reconnecting" after 10s+ | Integration | R2.3-D | Partner UX verification, not end-call trigger |
| 2.3-INT-010 | State machine: active -> reconnecting -> active (happy path) | Component | R2.3-C | All valid transitions unit tested |
| 2.4-INT-001 | User taps End Call — "Call ended — you ended the call" displayed | Integration | R2.4-A | Primary end path, reason accuracy |
| 2.4-INT-002 | Partner ends call — "Call ended — your partner ended the call" displayed | Integration | R2.4-A | Partner end path, 10s waiting window |
| 2.4-INT-003 | Connection lost — "Call ended — connection lost" displayed | Integration | R2.4-A | Network end path, not "partner left" |
| 2.4-INT-004 | Connection lost does NOT produce strike event | Integration | R2.4-D | Moderation integration: end_reason=connection_lost |
| 2.4-INT-005 | Post-call rating prompt appears after all 3 end types | Integration | R2.4-C | E2E: end screen -> rating prompt |
| 2.4-INT-006 | End screen offers rejoin queue, report issue, or return home | Integration | — | All 3 options available and functional |
| 2.3-E2E-001 | 15s blip on web — reconnecting banner -> countdown -> resume -> banner hidden | E2E | R2.3-A, R2.3-F | Full journey web |
| 2.3-E2E-002 | 25s blip on native — same flow as above | E2E | R2.3-A, R2.3-F | Full journey native (manual P2 if no native E2E) |
| 2.4-E2E-001 | User ends call -> end screen -> rating -> rejoin queue | E2E | R2.4-A, R2.4-C | Full journey end-to-rejoin |
| 2.4-E2E-002 | Partner ends call -> "waiting" 10s -> end screen with partner-ended reason | E2E | R2.4-A, R2.4-B | Full partner-end journey |

**Total P0: 20 tests**

### P1 — High (Should Test)

**Criteria:** Important features + Medium risk (3-5) + Common workflows

| Test ID | Scenario | Level | Risk Link | Notes |
| ------- | -------- | ----- | --------- | ----- |
| 2.3-INT-011 | Network blip at call start during room join — reconnection during initial connection | Integration | R2.3-C | Edge: blip before first connection stabilizes |
| 2.3-INT-012 | Both participants disconnect simultaneously — independent reconnection | Integration | R2.3-D | Race: both blip at same moment |
| 2.3-INT-013 | "Reconnecting" indicator respects UX-DR10: amber, subtle animation, local user only | Component | — | Visual compliance check |
| 2.3-INT-014 | Countdown timer format: "Reconnecting... (5s)" with proper i18n | Component | — | Timer display, no negative values |
| 2.3-INT-015 | State machine: reconnecting -> connection_lost -> ended (timeout path) | Component | R2.3-C | Full state coverage |
| 2.3-INT-016 | State machine: reconnecting -> active (recovery path) | Component | R2.3-C | Recovery transition |
| 2.3-INT-017 | State machine: active -> ended (intentional end during reconnection) | Component | R2.3-C | User ends call while reconnecting |
| 2.4-INT-007 | 10s waiting window dismissed if partner reconnects during countdown | Integration | R2.4-B | Abort logic, return to active call |
| 2.4-INT-008 | End call reason persisted in call_record table | Integration | R2.4-A | DB assertion: end_reason field accuracy |
| 2.4-INT-009 | "Connection lost" screen: retry button works and triggers 2.3 reconnection | Integration | R2.3-A, R2.4-A | Cross-story integration |
| 2.3-COMP-001 | ReconnectingBanner component renders correctly (amber, positioned top, pulse animation) | Component | — | Visual + accessibility (aria-live) |
| 2.3-COMP-002 | ConnectionLostPrompt component renders with retry/end buttons | Component | — | Both actions available, focus management |
| 2.4-COMP-001 | CallEndScreen renders correct message per end_reason prop | Component | R2.4-A | 3 variants + rating prompt |
| 2.4-COMP-002 | WaitingOverlay (10s) renders with cancel/end options | Component | R2.4-B | Timer for partner-end wait period |

**Total P1: 14 tests**

### P2 — Medium (Nice to Test)

| Test ID | Scenario | Level | Risk Link | Notes |
| ------- | -------- | ----- | --------- | ----- |
| 2.3-INT-018 | Web vs native SDK reconnection behavior comparison | Integration | R2.3-F | Document differences, verify both work |
| 2.3-INT-019 | Multiple blips in same call (3 cycles) — reconnection still works | Integration | — | Durability: repeat disruption |
| 2.3-INT-020 | Reconnecting during active audio — audio resumes correctly after reconnect | Integration | R2.3-A | Audio quality post-reconnect |
| 2.3-INT-021 | Active call + app backgrounded + blip + foreground — reconnection state preserved | Integration | — | Cross-feature: backgrounding + reconnect |
| 2.4-INT-010 | Post-call rating skipped — dismissed, no crash, no data corruption | Integration | R2.4-C | Graceful dismissal |
| 2.4-INT-011 | Rejoin queue after connection_lost end — queue state correct | Integration | R2.4-A | Cross-feature: end screen -> queue |
| 2.3-UNIT-001 | Reconnection timeout calculation (30s debounce, 5s grace window) | Unit | R2.3-A | Pure function: timeout logic |
| 2.4-UNIT-001 | End reason classification logic (deterministic from event sequence) | Unit | R2.4-A | Pure function: webhooks -> end_reason mapping |

**Total P2: 8 tests**

### P3 — Low (Test if Time Permits)

| Test ID | Scenario | Level | Notes |
| ------- | -------- | ----- | ----- |
| 2.3-E2E-003 | Full reconnection cycle on slow 3G network (throttled) | E2E | Network conditions simulation |
| 2.3-E2E-004 | Reconnection while partner also reconnecting simultaneously | E2E | Race condition E2E |
| 2.4-E2E-003 | Rate/report after connection_lost -> report sent, strike not counted | E2E | Full moderation integration |
| 2.4-PERF-001 | Time-to-end-screen from end action < 500ms | Perf | End screen render performance |
| 2.3-PERF-001 | Time-to-reconnect from recovery < 2s | Perf | Reconnection speed benchmark |

**Total P3: 5 tests**

### Aggregate Coverage

| Priority | Count | Hours Range |
| -------- | ----- | ----------- |
| P0 | 20 | ~30-45h (complex setup: tc/netem, LiveKit test rooms, dual-client state sync) |
| P1 | 14 | ~14-22h (standard integration + component) |
| P2 | 8 | ~4-8h (edge cases + cross-feature) |
| P3 | 5 | ~2-5h (benchmarks + exploratory) |
| **Total** | **47** | **~48-75h over 2-3 weeks** |

---

## Execution Strategy

**Philosophy:** Web E2E + API integration for critical paths. Native-specific flows tested manually until native E2E framework set up. A shared test utility (`simulateNetworkBlip`) abstracts tc/netem or Playwright network condition emulation.

| Cadence | What Runs | Duration Target |
| ------- | --------- | --------------- |
| Every PR (Story 2.3) | P0 integration tests (INT-001 through INT-010), unit tests (COMP-001, COMP-002), state machine transitions | <10 min |
| Every PR (Story 2.4) | P0 integration tests (INT-001 through INT-006), unit tests (COMP-001, COMP-002), end reason accuracy | <10 min |
| Nightly | P1 integration + P0 E2E (web), cross-feature tests, token refresh, retry exhaustion | ~20-30 min |
| Weekly | Full regression (all tags), P2/P3, native manual runs, network condition variations | ~45-60 min |

**CI tagging:** `@ep2-p0` for PR gate, `@ep2-p1` for nightly, `@ep2-regression` for weekly.

```bash
npx playwright test --grep "@ep2-p0"            # PR gate
npx playwright test --grep "@ep2-p0|@ep2-p1"    # Nightly
npx playwright test --grep "@ep2-p0|@ep2-p1|@ep2-p2|@ep2-p3"  # Weekly regression
```

---

## Dependencies & Test Blockers

| Dependency | Type | Affects | Details |
| ---------- | ---- | ------- | ------- |
| LiveKit Cloud test environment | Infrastructure | All integration/E2E tests | Requires test API key + room quota |
| Network disruption tooling (tc/netem) | Infrastructure | P0 reconnection tests | Simulate 1-30s network drops on CI |
| Dual LiveKit client test fixture | Test tooling | P0 integration tests | Need to simulate both participants in same test |
| Token refresh endpoint (server) | Backend | R2.3-B resolution | Must exist before reconnection token tests pass |
| Moderation stub API | Backend | R2.4-D test | End reason -> no-strike assertion needs moderation endpoint |
| Call room + call record tables | Backend | Story 2.4 INT-008 | Must have DB tables from Story 2.1 |
| Test framework configuration | Infrastructure | All tests | `playwright.config.ts` or equivalent must be set up first |

---

## Quality Gates

| Gate | Threshold | Enforcement |
| ---- | --------- | ----------- |
| P0 pass rate | 100% | CI blocks PR merge |
| P1 pass rate | >= 95% | CI warning, nightly report |
| State machine coverage (call states) | >= 90% branch coverage | Unit test gate |
| HIGH risk mitigations | R2.3-A (grace window), R2.3-B (token refresh), R2.4-A (end reason server-authoritative) verified before release | Epic 2 release checklist |
| CRITICAL risk R2.3-A | Grace window confirmed and tested | Acceptance test sign-off |
| End reason accuracy | All 3 paths tested at integration level | Test report |
| No P0 failures on master | Last 24h | Alert on-call |

---

## Assumptions

1. **Network disruption tooling**: tc/netem or equivalent is available in CI for precise network blip simulation. If not available, Playwright `context.setOffline()` and `context.route()` provide partial coverage.
2. **Token refresh endpoint**: Story 2.3 Task 4 (token refresh) must be implemented before reconnection token tests pass.
3. **LiveKit room timeout**: Story 2.1's 30s `emptyTimeout` ensures rooms aren't prematurely closed during reconnection. Verify this is set correctly.
4. **Web call screen**: Story 2.2 noted `apps/web/src/app/call/` may not exist. If missing, web reconnection tests are manual until screen is created.
5. **Moderation integration**: Story 2.4's "no strike for connection loss" assumes a moderation system exists (Epic 4). Stub API needed for integration tests.

---

## Mitigation Plans

### R2.3-A: Reconnection timeout race (Score: 9)

**Mitigation Strategy:** Add 5s grace window after 30s countdown before showing "connection lost" prompt. Debounce LiveKit Room.Event.Disconnected to prevent false triggers. Verify connection via LiveKit Room.state API before showing prompt.
**Owner:** Dev
**Timeline:** Story 2.3 implementation
**Status:** Planned
**Verification:** INT-003 (30s timeout), INT-002 (recovery before timeout), COMP-001 (timeout calculation with grace)

### R2.3-B: Token expiry during extended reconnection (Score: 9)

**Mitigation Strategy:** Add server procedure to refresh LiveKit token for active room. Client requests new token during reconnection if original token is >4min old. Default `livekit-client` 10s reconnect timeout covers refresh window.
**Owner:** Dev
**Timeline:** Story 2.3 implementation (Task 4)
**Status:** Planned
**Verification:** INT-007 (token expiry during blip), verify LiveKit SDK token handling

### R2.4-A: Wrong end reason shown (Score: 6)

**Mitigation Strategy:** End reason is server-authoritative from `call_record.end_reason` field. Webhook sequence determines reason: `room.finished` without explicit `endCall` = connection_lost; explicit `endCall` = explicit (with userId). Integration test verifies all 3 paths.
**Owner:** Dev
**Timeline:** Story 2.4 implementation
**Status:** Planned
**Verification:** INT-001 through INT-003 (3 end type scenarios), INT-008 (DB assertion)

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for Stories 2.3 and 2.4 (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.
- Run `*nfr-assess` for full NFR validation after implementation evidence exists.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Story 2.1 (Room Lifecycle)** | Reconnection relies on room not being cleaned up during blip | Verify `emptyTimeout=30s` not reduced; `room.finished` not triggered by blips |
| **Story 2.2 (ICE Restart)** | Full reconnection should trigger after ICE restart fails | Verify graceful fallback: ICE restart (1-5s) -> full reconnect (5-30s) -> connection lost (30s+) |
| **Epic 4 (Moderation)** | Connection loss must not count as strike | Verify `end_reason=connection_lost` is excluded from strike counting |
| **Epic 6 (Backgrounding)** | App backgrounded during reconnection — state preserved | Verify reconnection state survives background -> foreground cycle |
| **Epic 7 (Post-call Rating)** | Rating prompt must appear after all end types | Verify rating flow for all 3 end reasons |
| **Existing Voice Clubs/AI Test/Courses** | No impact expected | Smoke test: existing call features work after Epic 2 changes |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework
- `probability-impact.md` — Risk scoring methodology
- `test-levels-framework.md` — Test level selection
- `test-priorities-matrix.md` — P0-P3 prioritization
- `nfr-criteria.md` — NFR validation patterns

### Related Documents

- Epic + Stories: `_bmad-output/planning-artifacts/epics.md` (lines 336-456)
- Story 2.1: `_bmad-output/implementation-artifacts/stories/epic-002-story-021.md`
- Story 2.2: `_bmad-output/implementation-artifacts/stories/epic-002-story-022.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Project Context: `_bmad-output/project-context.md`
- Epic 1 Test Design (reference): `_bmad-output/test-artifacts/test-design-epic-1.md`

### Call State Machine Reference

```
idle -> connecting -> active -> reconnecting -> active
                                   |
                              connection_lost -> ended (retry/end)
                                              
active -> ended (explicit by local user)
active -> ended (explicit by partner)
active -> connection_lost (webhook timeout) -> ended
active -> reconnecting -> connection_lost -> ended (retries exhausted)
active -> reconnecting -> connection_lost -> retry -> reconnecting -> active
```

---

### Test ID Index

| Prefix | Count | Level |
| ------ | ----- | ----- |
| 2.3-INT-001 .. 021 | 21 | Integration — Story 2.3 |
| 2.3-COMP-001 .. 002 | 2 | Component — Story 2.3 |
| 2.3-UNIT-001 | 1 | Unit — Story 2.3 |
| 2.3-E2E-001 .. 004 | 4 | E2E — Story 2.3 |
| 2.3-PERF-001 | 1 | Performance — Story 2.3 |
| 2.4-INT-001 .. 011 | 11 | Integration — Story 2.4 |
| 2.4-COMP-001 .. 002 | 2 | Component — Story 2.4 |
| 2.4-UNIT-001 | 1 | Unit — Story 2.4 |
| 2.4-E2E-001 .. 003 | 3 | E2E — Story 2.4 |
| 2.4-PERF-001 | 1 | Performance — Story 2.4 |
| **Total** | **47** | |

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
