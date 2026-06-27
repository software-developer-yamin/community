---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-28'
inputDocuments:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad/tea/config.yaml'
  - 'apps/native/utils/call-state-storage.ts'
  - 'apps/native/utils/network-state.ts'
---

# Test Design: Epic 6 — Mobile Stability & State Preservation

**Date:** 2026-06-28
**Author:** Yamin
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for Epic 6 — Mobile Stability & State Preservation

Epic 6 covers three stories delivered primarily on the native (Expo/React Native) layer, backed by the Hono/oRPC server and PostgreSQL:

- **Story 6.1** — State Preservation Across App Backgrounding (in-progress): Call and queue state survive up to 30 minutes of backgrounding; OS-kill shows "call ended" without a strike.
- **Story 6.2** — Crash Resilience (backlog): Force-quit mid-call lands on home screen (not frozen UI); crash type logged; account standing unaffected.
- **Story 6.3** — Reinstall Account Preservation (backlog): Reinstall + same-credential sign-in restores account, subscription, call history, and profile in full.

Two new utility files introduced in Story 6.1 are the primary testability surface:
- `apps/native/utils/call-state-storage.ts` — expo-secure-store wrapper for persisting/restoring call state.
- `apps/native/utils/network-state.ts` — network availability check and offline-error classifier.

Mobile lifecycle, OS-level process termination, and device-variance (mid-range Android on Bangladeshi cellular) create a cluster of risks that are distinct from any prior epic. Several risks score 9 (BLOCK), driven by stale-token and OS-kill scenarios that existing tests do not cover.

**Risk Summary:**

- Total risks identified: 11
- High-priority risks (score ≥ 6): 8
- Critical (score = 9): 2
- Critical categories: TECH (4), DATA (3), BUS (1)

**Coverage Summary:**

- P0 scenarios: 15 (~25–35 hours)
- P1 scenarios: 9 (~9–15 hours)
- P2 scenarios: 5 (~2.5–7.5 hours)
- P3 scenarios: 3 (~1.5–3 hours)
- **Total effort**: 32 scenarios, ~38–60 hours (~5–7.5 days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| **iOS-specific App Store compliance** | No App Store submission in scope for this epic | Deferred to deployment epic |
| **Detox native E2E automation** | No Detox framework configured; native E2E is manual/exploratory at this stage | R-009 logged; Playwright-based API tests cover server-side behavior |
| **LiveKit SDK internals** | LiveKit Cloud handles ICE/TURN; reconnection protocol tested in Epic 2 | Epic 2 tests provide regression coverage |
| **Background audio on iOS (CallKit)** | iOS CallKit integration is out of scope for this sprint | Noted as future risk |
| **Story 6.3 — Reinstall with phone OTP** | Phone OTP linking depends on Epic 1 auth infrastructure; covered by Epic 1 tests | Epic 1 session-persistence tests provide baseline |

---

## Risk Assessment

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | TECH | App OS-kill during active call before `saveCallState` completes — state never persisted, user stuck on stale UI on reopen | 3 | 3 | 9 | Unit-test `saveCallState` atomicity; verify call state written before LiveKit room join is confirmed; manual OS-kill test on device | Dev | Before 6.1 merge |
| R-002 | DATA | `getCallState` returns a valid-looking but expired token — reconnect attempt fails with 401, user in auth loop on reopen | 3 | 3 | 9 | Verify token expiry vs. `isStateStale` TTL alignment; add server-side token-validity check before rejoining room; add API test for expired-token rejection | Dev | Before 6.1 merge |
| R-003 | DATA | Reinstall + different auth method (Google vs. phone) with matching email — duplicate account created instead of link | 2 | 3 | 6 | API test: sign in with Google after phone-OTP account creation with same email → confirm single account + subscription preserved | Dev | Before 6.3 merge |
| R-004 | TECH | iOS vs. Android backgrounding lifecycle differs — call may be OS-killed on iOS within 30 min despite spec | 3 | 2 | 6 | Document iOS audio background entitlement requirement; API test covers server-side behavior; native behavior deferred to manual | Dev/QA | Before 6.1 GA |
| R-005 | TECH | Crash logger misses ANR and black_screen types — Story 6.2 refund auto-approval never triggers | 2 | 3 | 6 | API test: POST crash record with each type (force_close, anr, black_screen) → 201 + correct type stored; verify refund eligibility query uses crash count | Dev | Before 6.2 merge |
| R-007 | BUS | `isStateStale` default TTL is 5 minutes — call state marked stale after 5 min backgrounding when spec allows 30 min | 3 | 2 | 6 | Unit test: `isStateStale` with 29-min-old state returns false; verify TTL constant is `30 * 60 * 1000` not `5 * 60 * 1000` | Dev | Before 6.1 merge |
| R-008 | DATA | Subscription tier stale in client cache after reinstall — user sees wrong tier until manual refresh | 2 | 3 | 6 | API test: reinstall flow invalidates TanStack Query cache on first login; server returns authoritative tier immediately | Dev | Before 6.3 merge |
| R-011 | TECH | Android foreground service not declared — OS aggressively kills background audio after ~1 min on low-RAM Android | 2 | 3 | 6 | Verify `@livekit/react-native` foreground service config in `app.json`/`AndroidManifest.xml`; native smoke test on device | Dev | Before 6.1 merge |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-006 | BUS | Backgrounding-induced disconnect not tagged as `connection_lost` — moderation system issues a strike | 2 | 2 | 4 | API test: disconnect reason propagated as `connection_lost` when OS-kill detected; strike NOT issued | Dev |
| R-009 | OPS | No Detox native E2E framework configured — native backgrounding/crash behavior untestable in CI | 2 | 2 | 4 | Manual exploratory session on device; document gaps; add Detox setup to Epic 7 backlog | QA |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-010 | SEC | `getCallState` returns stale state for wrong user after reinstall + different account sign-in | 1 | 3 | 3 | Document: `clearCallState` must be called on logout; add unit test |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| --- | --- | --- | --- | --- |
| Performance | NFR2: Cold-start-to-home-screen p95 ≤ 2.5s on Pixel 4a–equivalent | R-008 | Manual timing on device after reinstall; Expo startup trace | Device timing log; Expo performance trace |
| Reliability | NFR10: Disconnect-during-call rate ≤ 5% — backgrounding/crash must not inflate this | R-001, R-004, R-011 | API test counts OS-kill disconnects as `connection_lost` (not user-initiated); server-side disconnect telemetry | evlog disconnect-type breakdown; moderation strike audit |
| Reliability | FR17: Call survives backgrounding ≤ 30 min | R-001, R-007 | API: call room still open after 30 min; `isStateStale` TTL = 30 min | LiveKit room-state API response; unit test TTL assertion |
| Reliability | FR18: Crash → "call ended — connection lost" (not frozen UI) | R-005 | Manual device crash + relaunch; API: crash record endpoint accepts all 3 types | Manual session note; crash record DB row |
| Data Integrity | FR19: Reinstall → account, subscription, history preserved | R-003, R-008 | API: reinstall flow returns correct user, tier, call history | API response assertions; DB audit |
| Maintainability | `call-state-storage.ts` and `network-state.ts` covered by unit tests | — | Unit tests co-located at `apps/native/utils/*.test.ts` | Test coverage report |

**Unknown thresholds:**
- Crash count threshold for refund auto-approval (Story 6.2 says "≥3 crashes in first 7 days" — confirm this aligns with Epic 5 refund logic).
- Maximum reconnect window for Android foreground service — needs LiveKit RN documentation review.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM
- [ ] `call-state-storage.ts` and `network-state.ts` implemented and type-checking clean
- [ ] Hono server endpoints for crash logging (Story 6.2) implemented
- [ ] Server endpoints for account/subscription restoration (Story 6.3) implemented
- [ ] Test environment accessible (server running on port 3000, DB seeded)
- [ ] Android device or emulator (API 30+) available for manual validation

## Exit Criteria

- [ ] All P0 tests (15) passing
- [ ] All P1 tests passing or failures triaged with waiver
- [ ] R-001 and R-002 (score-9 risks) mitigated and verified
- [ ] All score-6 risks mitigated or formally accepted with owner
- [ ] `isStateStale` TTL verified = 30 minutes in source
- [ ] No open high-priority / high-severity bugs
- [ ] Manual device test completed for Story 6.1 backgrounding

---

## Test Coverage Plan

### P0 (Critical) — Run on every commit

**Criteria:** Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test ID | Test Level | Risk Link | Scenario | Owner | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `callStateStorage.saveCallState` persists JSON correctly | 6.1-UNIT-001 | Unit | R-001 | Save state → getItemAsync returns parseable JSON with correct fields | Dev | Co-located at `call-state-storage.test.ts` |
| `callStateStorage.getCallState` returns null on empty store | 6.1-UNIT-002 | Unit | R-001 | No prior save → `getCallState()` returns null (not throws) | Dev | |
| `callStateStorage.isStateStale` returns false within 30 min TTL | 6.1-UNIT-003 | Unit | R-007 | State.timestamp = now → `isStateStale(state, 30*60*1000)` is false | Dev | Verifies correct TTL constant |
| `callStateStorage.isStateStale` returns true after 30 min | 6.1-UNIT-004 | Unit | R-007 | State.timestamp = now − 31 min → `isStateStale(state, 30*60*1000)` is true | Dev | |
| `callStateStorage.clearCallState` removes persisted state | 6.1-UNIT-005 | Unit | R-001 | Save then clear → `getCallState()` returns null | Dev | |
| `callStateStorage` handles corrupt JSON gracefully | 6.1-UNIT-006 | Unit | R-001 | Manually write non-JSON string to secure store → `getCallState()` returns null (not throws) | Dev | Tests error branch |
| `networkState.checkNetworkAvailable` falls back to `true` on exception | 6.1-UNIT-007 | Unit | — | Mock `getNetworkStateAsync` to throw → `checkNetworkAvailable()` returns `true` | Dev | |
| `networkState.isOfflineError` correctly classifies TypeError messages | 6.1-UNIT-008 | Unit | — | TypeError("network error"), TypeError("dns"), TypeError("fetch failed") → all return `true`; Error("500") → `false` | Dev | |
| OS-kill disconnect tagged `connection_lost`, no strike issued | 6.1-API-001 | API | R-001, R-006 | Server API: simulate disconnect with reason=`os_kill` → verify strike NOT created in moderation table | Dev | Via oRPC call procedures |
| Crash record endpoint accepts all three crash types | 6.2-API-001 | API | R-005 | POST crash record with type `force_close` / `anr` / `black_screen` + app/OS/device metadata → 201, stored correctly | Dev | |
| Crashes do not affect moderation state | 6.2-API-002 | API | R-005 | 3 crash records for user → user moderation state unchanged (no strike, no cooldown) | Dev | |
| Reinstall + same-email login restores subscription tier | 6.3-API-001 | API | R-008 | Create user, set tier=premium, wipe local state, re-authenticate → server returns correct tier | Dev | |
| Reinstall + Google login with matching email links account (no duplicate) | 6.3-API-002 | API | R-003 | Phone-OTP account with email X; login with Google+email X after reinstall → single user row, subscription preserved | Dev | |
| `clearCallState` called on logout prevents cross-user state leak | 6.1-UNIT-009 | Unit | R-010 | Save state for user A, logout (clearCallState), login as user B → `getCallState()` returns null | Dev | |
| Android foreground service config present in native manifest | 6.1-CONFIG-001 | Static/Config | R-011 | Assert `app.json` or `AndroidManifest.xml` contains LiveKit foreground service declaration | Dev | Grep/config assertion in CI |

**Total P0:** 15 tests, ~25–35 hours

---

### P1 (High) — Run on PR to main

**Criteria:** Important features + Medium/High risk + Common workflows

| Requirement | Test ID | Test Level | Risk Link | Scenario | Owner | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `saveCallState` overwrites existing state atomically | 6.1-UNIT-010 | Unit | R-001 | Save state A, save state B → `getCallState()` returns state B only | Dev | |
| Call room still open after 30 min on server side | 6.1-API-002 | API | R-007 | Create LiveKit room, wait/advance 30 min (mocked), check room status → still open | Dev | Use test clock or mock |
| Queue position preserved across background (server side) | 6.1-API-003 | API | R-006 | Enqueue user, mark as backgrounded, re-poll → same queue position returned | Dev | |
| Disconnect type `connection_lost` propagated to partner | 6.1-API-004 | API | R-004 | When one participant OS-killed → other participant receives call-end with reason `connection_lost` (not `partner_left`) | Dev | |
| Crash log captures correct metadata | 6.2-API-003 | API | R-005 | POST crash record → response/DB row contains app_version, os_version, device_model fields | Dev | |
| 3 crashes in 7 days meets refund auto-approval threshold | 6.2-API-004 | API | R-005 | Insert 3 crash records within 7 days → refund eligibility check returns `auto_approve` path | Dev | Links to Epic 5 refund logic |
| Call history and CEFR placements restored after reinstall | 6.3-API-003 | API | R-008 | Create 5 call records + CEFR placement for user; wipe client; re-auth → server returns all records | Dev | |
| Profile settings (native language, gender filter) preserved | 6.3-API-004 | API | R-008 | Set nativeLanguage=bn, genderFilter=female; reinstall; re-auth → profile settings unchanged | Dev | |
| `isOfflineError` ignores non-TypeError errors | 6.1-UNIT-011 | Unit | — | Pass Error("Internal Server Error") → `isOfflineError` returns `false` | Dev | |

**Total P1:** 9 tests, ~9–15 hours

---

### P2 (Medium) — Run nightly/weekly

**Criteria:** Secondary features + Low risk + Edge cases

| Requirement | Test ID | Test Level | Risk Link | Scenario | Owner | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Subscription `tierExpiresAt` preserved after reinstall | 6.3-API-005 | API | R-008 | Set `tierExpiresAt` to future date; reinstall; re-auth → `tierExpiresAt` unchanged in server response | Dev | |
| No duplicate account on reinstall with same phone number | 6.3-API-006 | API | R-003 | Phone-OTP account; reinstall; sign in with same phone → single user row, count = 1 | Dev | |
| Re-authentication not required on return from background (token still valid) | 6.1-API-005 | API | R-002 | Token valid, background and return within TTL → no 401, no redirect to login | Dev | |
| Multiple crashes across sessions do not degrade moderation system | 6.2-API-005 | API | R-005 | Insert 10 crash records for user → moderation state still `clean`, no spurious warnings | Dev | |
| Expired token on `getCallState` resume rejected by server | 6.1-API-006 | API | R-002 | `getCallState` returns state with expired token → reconnect attempt returns 401, UI shows "call ended" not auth loop | Dev | Critical for R-002 mitigation |

**Total P2:** 5 tests, ~2.5–7.5 hours

---

### P3 (Low) — Run on-demand

**Criteria:** Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test ID | Test Level | Scenario | Owner | Notes |
| --- | --- | --- | --- | --- | --- |
| Cold-start-to-home-screen p95 ≤ 2.5s (NFR2) | 6.3-PERF-001 | Performance | Time app launch from cold on Pixel 4a–equivalent emulator after reinstall + login; measure p95 over 10 runs | QA/Dev | Manual + device trace |
| Background/foreground cycle stability (burn-in) | 6.1-STABILITY-001 | Exploratory | Background and foreground app 20 times on physical device during active call; check for memory leak, frozen UI, or duplicate state | QA | Manual session on device |
| Exploratory crash recovery on low-memory Android | 6.2-EXPLORE-001 | Exploratory | Force app to low-memory state during call; observe recovery behavior; document findings | QA | Manual; inform Detox backlog |

**Total P3:** 3 tests, ~1.5–3 hours

---

## Execution Order

### Smoke Tests (<3 min)

**Purpose:** Fast feedback on utility layer correctness after any change

- [ ] 6.1-UNIT-001: `saveCallState` persists JSON (15s)
- [ ] 6.1-UNIT-002: `getCallState` returns null on empty (5s)
- [ ] 6.1-UNIT-008: `isOfflineError` classifies TypeError (5s)
- [ ] 6.1-CONFIG-001: Foreground service config present (10s)

**Total:** 4 scenarios

### P0 Tests (<20 min)

**Purpose:** Critical path validation — must all pass before merge

- [ ] 6.1-UNIT-003 through 6.1-UNIT-009 (unit suite)
- [ ] 6.1-API-001: OS-kill disconnect no strike (API)
- [ ] 6.2-API-001: Crash record endpoint (API)
- [ ] 6.2-API-002: Crashes don't affect moderation (API)
- [ ] 6.3-API-001: Reinstall restores subscription (API)
- [ ] 6.3-API-002: Google+email links existing account (API)

**Total:** 15 scenarios

### P1 Tests (<20 min)

**Purpose:** Important feature coverage — run on PR to main

- [ ] 6.1-UNIT-010, 6.1-UNIT-011 (unit)
- [ ] 6.1-API-002 through 6.1-API-004 (API)
- [ ] 6.2-API-003, 6.2-API-004 (API)
- [ ] 6.3-API-003, 6.3-API-004 (API)

**Total:** 9 scenarios

### P2/P3 Tests (nightly / on-demand)

**Purpose:** Full regression + exploratory coverage

- [ ] 6.3-API-005, 6.3-API-006, 6.1-API-005, 6.1-API-006, 6.2-API-005 (P2 API)
- [ ] 6.3-PERF-001, 6.1-STABILITY-001, 6.2-EXPLORE-001 (P3 manual/exploratory)

**Total:** 8 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| --- | --- | --- | --- | --- |
| P0 | 15 | 1.7–2.3 | ~25–35 | Unit tests fast; API tests need server + DB setup |
| P1 | 9 | 1.0–1.7 | ~9–15 | Standard API coverage + edge unit cases |
| P2 | 5 | 0.5–1.5 | ~2.5–7.5 | Edge API cases; one critical for R-002 |
| P3 | 3 | 0.5–1.0 | ~1.5–3 | Manual/exploratory sessions |
| **Total** | **32** | **—** | **~38–60** | **~5–7.5 days** |

### Prerequisites

**Test Data / Factories:**
- `userFactory` — creates user with phone/email/Google auth, optional tier, optional crash records
- `callStateFactory` — creates `SavedCallState` with configurable timestamp (for TTL testing)
- `crashRecordFactory` — creates crash record with type, app/OS/device metadata

**Tooling:**
- Playwright (already configured) for API-level tests at `tests/api/`
- `expo-secure-store` mock for unit tests of `call-state-storage.ts`
- `expo-network` mock for unit tests of `network-state.ts`
- Manual device (Android API 30+) for P3 exploratory sessions

**Environment:**
- Hono server running at `http://localhost:3000`
- PostgreSQL with fresh schema (crash_logs table, users.tier/tierExpiresAt)
- `expo-secure-store` mock available in test environment (Jest/Vitest with RN preset or Bun test)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥ 95% (waivers require QA + Dev sign-off)
- **P2/P3 pass rate**: ≥ 90% (informational; P3 is exploratory)
- **Score-9 risks mitigated**: 100% before merge (R-001, R-002)
- **Score-6 risks mitigated or accepted**: 100% before GA

### Coverage Targets

- **Critical paths (OS-kill, crash, reinstall)**: ≥ 80%
- **Utility unit coverage (`call-state-storage`, `network-state`)**: ≥ 90%
- **Data integrity scenarios (reinstall)**: 100% of AC covered
- **Edge cases (expired token, corrupt JSON, cross-user)**: ≥ 50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] R-001 (OS-kill state loss) and R-002 (stale token auth loop) both mitigated with passing tests
- [ ] `isStateStale` TTL verified at source to be 30 minutes (not 5 minutes)
- [ ] Android foreground service declaration verified in native manifest
- [ ] Crash endpoint accepts all 3 crash types with correct metadata
- [ ] No duplicate account created on reinstall (R-003 API test passing)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: App OS-Kill During Active Call — State Loss (Score: 9)

**Mitigation Strategy:** (1) Write `saveCallState` to expo-secure-store synchronously-as-possible immediately when the user joins a LiveKit room — before any UI transition. (2) Unit-test atomicity: save → kill simulation (throw) → `getCallState` still returns persisted state. (3) Manual device test: force-stop app on Android mid-call; reopen; verify "call ended — connection lost" screen.
**Owner:** Dev
**Timeline:** Before Story 6.1 merge
**Status:** Planned
**Verification:** 6.1-UNIT-001 through 6.1-UNIT-006 pass; manual device test documented

### R-002: Stale/Expired Token in call-state-storage Causes Auth Loop (Score: 9)

**Mitigation Strategy:** (1) On `getCallState` restore, always validate the token against the server before attempting LiveKit rejoin. If token is invalid (401), show "call ended — connection lost" and DO NOT redirect to login. (2) Align `isStateStale` TTL with actual token expiry time; if token expires in < 30 min, mark state stale at token expiry. (3) API test 6.1-API-006: expired token on resume → 401 → "call ended" shown (not auth loop).
**Owner:** Dev
**Timeline:** Before Story 6.1 merge
**Status:** Planned
**Verification:** 6.1-UNIT-003, 6.1-UNIT-004, 6.1-API-006 pass

### R-007: `isStateStale` TTL Mismatch — 5 min vs. 30 min Spec (Score: 6)

**Mitigation Strategy:** Change default TTL in `call-state-storage.ts` from `5 * 60 * 1000` to `30 * 60 * 1000`. Unit tests 6.1-UNIT-003 and 6.1-UNIT-004 use 30-min TTL explicitly and will fail if the constant is wrong.
**Owner:** Dev
**Timeline:** Immediate (caught in code review)
**Status:** Planned
**Verification:** 6.1-UNIT-003 passes with 29-min-old state returning `false`

### R-011: Android Foreground Service Not Declared (Score: 6)

**Mitigation Strategy:** Add LiveKit foreground service plugin configuration to `app.json` (Expo config plugin) per LiveKit React Native documentation. CI config assertion (6.1-CONFIG-001) verifies the declaration exists before build.
**Owner:** Dev
**Timeline:** Before Story 6.1 merge
**Status:** Planned
**Verification:** 6.1-CONFIG-001 static check passes; manual Android device test confirms call persists when backgrounded

---

## Assumptions and Dependencies

### Assumptions

1. `expo-secure-store` mock is or can be made available in the unit test environment (Bun test with RN mocks, or Vitest with `__mocks__/expo-secure-store.ts`).
2. The server has (or will have before Story 6.2 merge) a `POST /api/crash-reports` endpoint accepting `{ type, appVersion, osVersion, deviceModel, userId }`.
3. Crash count is stored server-side and queryable by the Epic 5 refund eligibility logic.
4. The `tierExpiresAt` and `tier` fields already exist in the DB schema (introduced in Epic 5).
5. LiveKit room state is queryable via the LiveKit server SDK (for P1 test 6.1-API-002).

### Dependencies

1. Story 6.2 server endpoint (crash logging) — required for P0 6.2-API-001, 6.2-API-002 — before 6.2 merge
2. Story 6.3 account-restoration API — required for P0 6.3-API-001, 6.3-API-002 — before 6.3 merge
3. Epic 5 refund auto-approval logic (crash count threshold) — required for P1 6.2-API-004 — must be merged before 6.2 testing begins
4. `expo-secure-store` test mock — required for all `call-state-storage` unit tests — before Story 6.1 merge

### Risks to Plan

- **Risk:** Detox not set up — native E2E for backgrounding untestable in CI
  - **Impact:** Story 6.1 backgrounding behavior only validated manually on device; CI gap remains
  - **Contingency:** Document gap in R-009; add Detox framework setup to backlog; block GA only if manual device test fails

- **Risk:** Crash logging endpoint not implemented before 6.2 testing window
  - **Impact:** P0 6.2-API-001 and 6.2-API-002 cannot run; Story 6.2 cannot ship
  - **Contingency:** Implement minimal endpoint with `{ type, appVersion, osVersion, deviceModel }` schema; full crash analytics deferred

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| --- | --- | --- |
| **Epic 1 — Auth/Session** | Reinstall (6.3) reuses auth sign-in flows | `tests/api/session-persistence.spec.ts` must still pass |
| **Epic 2 — Call Reliability** | OS-kill disconnect reason must be distinct from ICE failure | `tests/api/reconnection.spec.ts` must still pass |
| **Epic 4 — Moderation** | No strike for OS-kill or crash-induced disconnect | `tests/api/moderation-strikes.spec.ts` must still pass |
| **Epic 5 — Billing** | Crash count feeds refund auto-approval; reinstall preserves tier | `tests/api/cancellation-preserves-access.spec.ts` must still pass |
| **`callStateStorage.ts`** | New file; no prior tests. All coverage is net-new. | — |
| **`networkState.ts`** | New file; no prior tests. All coverage is net-new. | — |

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for Stories 6.1–6.3 (separate workflow; not auto-run).
- Run `*automate` for broader coverage once full implementation exists (especially Story 6.2 crash endpoint and Story 6.3 account restoration).
- Add Detox native E2E framework setup to Epic 7 or a dedicated infrastructure story.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: Yamin — Date: ___
- [ ] Tech Lead: Yamin — Date: ___
- [ ] QA Lead: Yamin — Date: ___

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework
- `probability-impact.md` — Risk scoring methodology
- `test-levels-framework.md` — Test level selection
- `test-priorities-matrix.md` — P0–P3 prioritization

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md`
- Epics: `_bmad-output/planning-artifacts/epics.md` (Epic 6, pp. 214–216)
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Sprint Status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- New Utilities: `apps/native/utils/call-state-storage.ts`, `apps/native/utils/network-state.ts`
- Prior Epic Design: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md`

---

**Generated by**: BMad TEA Agent — Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
