# Epic 1 Test Design: Reliable Auth & Session

**Epic**: Epic 1 — Reliable Auth & Session (FR1–FR4)
**Stories**: 1.1 Persistent Session, 1.2 Silent Token Refresh, 1.3 Phone OTP, 1.4 Google OAuth
**Mode**: Epic-Level Test Design
**Date**: 2026-06-16

---

## Executive Summary

This document defines the test plan for Epic 1 (Auth & Session) covering four stories: persistent session with token rotation (FR1), silent token refresh (FR2), phone OTP authentication (FR3), and Google OAuth integration (FR4). The plan covers 53 test scenarios across Integration/API, Component, Unit, and E2E levels.

**Risk summary**: 1 CRITICAL risk (SMS delivery failure), 3 HIGH risks (token storage vulnerability, refresh during call, OTP brute force), 4 MEDIUM, 4 LOW. Primary mitigations: voice fallback for SMS, expo-secure-store audit, deduplicated refresh, cooldown enforcement.

**Coverage summary**: 33 P0 tests, 12 P1 tests, 8 P2 tests. Estimated ~60–94h total effort over 4–6 weeks.

---

## Risk Assessment

### High-Priority Risks (Score ≥ 6)

| ID | Category | Description | P | I | Score | Mitigation | Owner | Timeline |
|----|----------|-------------|---|---|-------|------------|-------|----------|
| 1.3-A | OPS | SMS delivery failure — Bangladesh SMS reliability is poor, users unable to auth | 3 | 3 | **9** | Voice call fallback; SMS provider redundancy; aggressive retry with escalating timeout; resend cooldown UI | Dev + Ops | Before Epic 1 release |
| 1.1-A | SEC | Token storage vulnerability (mobile) — expo-secure-store implementation gaps | 2 | 3 | **6** | Verify expo-secure-store usage; add token read/write integration test; audit biometric lock optional | Dev | Before Epic 1 release |
| 1.2-A | OPS | Token refresh during active LiveKit call fails — dropped calls if auth fails mid-call | 2 | 3 | **6** | Pre-fetch token before call start; verify call continues without auth re-check post-join; test refresh under degraded network | Dev | Story 1.2 implementation |
| 1.3-B | SEC | OTP brute force / enumeration — automated tooling could compromise accounts | 2 | 3 | **6** | 3-attempt lockout 60s cooldown (per AC); rate-limit OTP requests 5/15min per phone; log all attempts; brute force alert | Dev | Story 1.3 implementation |

### Medium-Priority Risks (Score 4–5)

| ID | Category | Description | P | I | Score | Mitigation | Owner |
|----|----------|-------------|---|---|-------|------------|-------|
| 1.1-B | TECH | Token rotation race condition — concurrent requests race on token | 2 | 2 | **4** | Mutex on refresh operations; concurrent token access test | Dev |
| 1.2-B | BUS | All 3 refresh retries exhausted → unexpected logout | 2 | 2 | **4** | Exponential backoff; "connection lost" banner instead of redirect; preserve unsent data | Dev |
| 1.2-C | TECH | Refresh request flood from multiple tabs/microservices | 2 | 2 | **4** | Deduplicate refresh requests; single outstanding refresh per session | Dev |
| 1.4-A | TECH | Google OAuth flow failure on mobile (custom tabs / redirects) | 2 | 2 | **4** | Test Android + iOS; verify redirect URI registration; device browser not WebView | Dev |

### Low-Priority Risks (Score 1–3)

| ID | Category | Description | P | I | Score | Mitigation | Owner |
|----|----------|-------------|---|---|-------|------------|-------|
| 1.1-C | SEC | Cookie security misconfiguration (web) — httpOnly+secure misconfig | 1 | 3 | **3** | Automated CI check for cookie flags | Dev |
| 1.3-C | DATA | Wrong phone number format / international numbers | 2 | 1 | **2** | libphonenumber validation; clear error message | Dev |
| 1.4-B | DATA | Account linking — data loss or duplicate on Google link | 1 | 3 | **3** | Integration test verifying account merge; rollback capability | Dev |
| 1.4-C | SEC | OAuth state parameter missing (CSRF linking) | 1 | 3 | **3** | Verify Better-Auth nonce/state; CI OAuth config check | Dev |

### Risk Category Legend

- **SEC**: Security vulnerability
- **TECH**: Architecture/integration/implementation issue
- **OPS**: Deployment/operational/reliability concern
- **BUS**: Business/revenue/user-experience impact
- **DATA**: Data integrity or data quality issue
- **PERF**: Performance or scalability concern

---

## Test Coverage Plan

**Note**: P0/P1/P2/P3 = priority/risk, NOT execution timing. See Execution Strategy section for when tests run.

### P0 — Critical (Must Test)

**Criteria**: Blocks core functionality + high risk (score ≥6) + no workaround

| Test ID | Scenario | Level | Risk Link | Notes |
|---------|----------|-------|-----------|-------|
| 1.1-INT-001 | Login creates valid session token | Integration | — | Foundation for all auth |
| 1.1-INT-002 | Session token stored in httpOnly cookie (web) | Integration | 1.1-C | Security-critical |
| 1.1-INT-003 | Token rotation on every use — new token issued, old expires | Integration | 1.1-B | FR1 requirement |
| 1.1-INT-004 | Session survives page reload (web) | Integration | — | Core UX requirement |
| 1.1-INT-005 | Session expiry after 7+ day idle | Integration | — | FR1 security boundary |
| 1.1-INT-006 | Session invalidated on logout → old token rejected | Integration | — | Security-critical |
| 1.1-INT-007 | Invalid/expired session token returns 401 | Integration | — | Security boundary |
| 1.1-COMP-001 | Session token read from expo-secure-store (mobile) | Component | 1.1-A | Mobile persistence |
| 1.1-E2E-001 | Full login → navigate → reload → still logged in (web) | E2E | — | Critical user journey |
| 1.1-E2E-002 | App force-quit → reopen → still logged in (mobile) | E2E | 1.1-A | Mobile persistence |
| 1.1-E2E-003 | Full login → logout → cannot access protected page | E2E | — | Security E2E |
| 1.2-INT-001 | Token auto-refreshes ≤60s before expiry | Integration | — | FR2 core mechanism |
| 1.2-INT-002 | Refresh succeeds during active API call | Integration | 1.2-A | Call continuity |
| 1.2-INT-003 | 3 retries on refresh failure with exponential backoff | Integration | — | FR2 resilience |
| 1.2-INT-004 | All 3 retries fail → user not logged out | Integration | 1.2-B | Graceful degradation |
| 1.2-INT-006 | Server-side token validation after rotation | Integration | — | Security boundary |
| 1.2-E2E-001 | User stays logged in during extended session | E2E | — | Full refresh lifecycle |
| 1.3-INT-001 | Send OTP to valid phone number | Integration | — | Core phone auth |
| 1.3-INT-002 | Verify correct OTP → session token | Integration | — | Positive auth case |
| 1.3-INT-003 | Verify incorrect OTP → error, no session | Integration | — | Security boundary |
| 1.3-INT-004 | 3 failed OTP → 60s cooldown enforced | Integration | 1.3-B | Brute force prevention |
| 1.3-INT-005 | During cooldown, OTP verification returns lockout error | Integration | 1.3-B | Cooldown enforcement |
| 1.3-INT-006 | Resend OTP within cooldown → rate limited | Integration | 1.3-B | Rate limiting |
| 1.3-E2E-001 | Full phone auth: enter phone → receive OTP → enter code → logged in | E2E | 1.3-A | Critical journey |
| 1.4-INT-001 | Google OAuth callback → session created | Integration | — | Core OAuth flow |
| 1.4-INT-002 | Account linking — Google linked to existing phone user | Integration | 1.4-B | Data preservation |
| 1.4-INT-003 | OAuth state parameter validated (CSRF) | Integration | 1.4-C | Security-critical |
| 1.4-INT-004 | Invalid Google token → auth error | Integration | — | Security boundary |
| 1.4-INT-006 | Account linking preserves existing phone data | Integration | 1.4-B | Data integrity |
| 1.4-E2E-001 | Full Google sign-in flow (web) | E2E | — | Critical journey |
| 1.4-E2E-002 | Full Google sign-in flow (mobile) | E2E | 1.4-A | Mobile OAuth |

### P1 — High (Should Test)

**Criteria**: Important features + medium risk (score 4) + common workflows

| Test ID | Scenario | Level | Risk Link | Notes |
|---------|----------|-------|-----------|-------|
| 1.1-COMP-002 | Token rotation helper — concurrent access safety | Component | 1.1-B | Race condition guard |
| 1.1-COMP-003 | Session expiry computation (created + TTL) | Component | — | Boundary logic |
| 1.2-INT-005 | Concurrent refresh requests deduplicated | Integration | 1.2-C | Server load protection |
| 1.2-COMP-001 | Refresh timer hook fires at correct interval | Component | — | Timer accuracy |
| 1.2-E2E-002 | App continues during brief network interruption (mobile) | E2E | 1.2-A | Resilience validation |
| 1.3-INT-007 | OTP expires after timeout | Integration | — | Stale code rejected |
| 1.3-INT-008 | Voice call fallback when SMS fails | Integration | 1.3-A | CRITICAL risk mitigation |
| 1.3-INT-009 | Send OTP to invalid phone → validation error | Integration | 1.3-C | Data boundary |
| 1.3-COMP-001 | OTP input UI — paste code from SMS (mobile) | Component | — | Mobile UX |
| 1.3-UNIT-001 | Phone number format validation | Unit | 1.3-C | libphonenumber integration |
| 1.3-E2E-002 | Wrong OTP → error → retry → success | E2E | — | Recovery path |
| 1.3-E2E-003 | 3 wrong OTPs → cooldown → wait → retry → success | E2E | 1.3-B | Cooldown UX |
| 1.4-INT-005 | Google OAuth token refresh | Integration | — | Token lifecycle |
| 1.4-INT-007 | OAuth error → fallback to other login method works | Integration | — | Graceful degradation |
| 1.4-E2E-003 | Phone user links Google → both methods work | E2E | 1.4-B | Dual-auth UX |

### P2 — Medium (Nice to Test)

**Criteria**: Secondary features + low risk + edge cases

| Test ID | Scenario | Level | Risk Link | Notes |
|---------|----------|-------|-----------|-------|
| 1.1-UNIT-001 | Session token format validation | Unit | — | JWT decode, expiry field |
| 1.1-UNIT-002 | Expiry date calculation from TTL | Unit | — | Simple calculation |
| 1.2-COMP-002 | Retry backoff calculation (0.5s → 1s → 2s) | Component | — | Pure calculation |
| 1.2-UNIT-001 | Auth header update after token refresh | Unit | — | Simple assignment |
| 1.3-COMP-002 | Cooldown countdown timer display | Component | — | UI timer element |
| 1.3-UNIT-002 | OTP code format validation (6-digit) | Unit | — | Simple format check |
| 1.4-COMP-001 | Google Sign-In button renders correctly (web + mobile) | Component | — | Visual verification |

---

## NFR Test Coverage Plan

| NFR | Requirement / Threshold | Planned Validation | Tool / Level | Evidence Artifact | Priority |
|-----|----------------------|-------------------|-------------|-------------------|----------|
| NFR1 | Login first-attempt ≥ 99% | Repeat auth flow 100×, measure success vs retry count | Integration (k6) | k6 report with success rate metric | P0 |
| NFR2 | Cold-start p95 ≤ 2.5s | Measure cold-start session load (no cached session) | Integration (k6) + Lighthouse | k6 p95 latency + Lighthouse FCP/LCP | P0 |
| NFR12 | False-positive strike ≤ 1% | Simulate auth-timeout disconnect, verify strike not counted | Integration | Test report with strike assertion | P1 |
| SMS delivery | SMS p95 delivery < 30s, voice fallback triggers | Measure SMS delivery time (p50/p95/p99), verify fallback timing | Integration + monitoring logs | CloudWatch/Datadog metrics; alert if p95 > 30s | P1 |
| Token rotation | Rotation overhead < 50ms per API call | Measure token rotation latency added to requests | Integration (k6) | k6 report with refresh-latency metric | P2 |

**Missing thresholds**: None for in-scope NFRs. All values extracted from PRD (NFR1, NFR2, NFR12). SMS delivery threshold of <30s is an assumption — clarify with operations team.

---

## Execution Strategy

**Philosophy**: Run everything in PRs unless expensive or long-running. Playwright parallelization handles 100s of tests in ~10–15 min.

| Cadence | What Runs | Duration Target |
|---------|-----------|----------------|
| Every PR | All P0 Integration/API tests, all unit tests, P0 E2E journeys, security smoke tests | <15 min |
| Nightly | P1 integration + E2E, component tests, cooldown/OAuth scenarios | ~20–30 min |
| Weekly | NFR suite (k6 performance), P2 tests, full regression (all tags) | ~45–60 min |

**CI tagging**: `@p0` for PR gate, `@p0 @p1` for nightly, `@regression` for weekly.

```bash
npx playwright test --grep @p0          # PR gate
npx playwright test --grep "@p0|@p1"    # Nightly
npx playwright test --grep "@p0|@p1|@p2|@p3"  # Weekly regression
```

**Note for mobile (Expo)**: Mobile E2E tests run nightly only — setup overhead (Expo Go / EAS Build) exceeds PR gate budget.

---

## QA Effort Estimate

| Priority | Estimate (Range) | Key Drivers |
|----------|-----------------|-------------|
| P0 | ~30–45h | Auth integration setup, OTP mock provider, 7 critical E2E plays, CI integration |
| P1 | ~18–28h | Google OAuth mock server, mobile E2E setup, cooldown scenario scripting |
| P2 | ~8–15h | Edge case coverage, timer testing, UI component isolation |
| P3 | ~3–6h | k6 performance scripts, exploratory test charter |
| **Total** | **~60–94h** | QA effort only (no DevOps/backend estimates included) |

**Timeline**: ~4–6 weeks total, running in parallel with story development (1 QA + 1 dev shared).

---

## Dependencies & Test Blockers

| Dependency | Type | Affects | Details |
|-----------|------|---------|---------|
| Test database with seed data | Backend | All integration tests | Drizzle schema + user fixtures needed |
| OTP/SMS mock provider | Infrastructure | Story 1.3 tests | Mock SMS gateway or test mode in provider |
| Google OAuth test credentials | Configuration | Story 1.4 tests | Test OAuth client ID + redirect URIs configured |
| expo-secure-store mock | Test tooling | Story 1.1 mobile tests | Secure store mock for component tests |
| Better-Auth test utilities | Test tooling | All stories | Programmatic session create/read/delete helpers |

---

## Quality Gates

| Gate | Threshold | Enforcement |
|------|-----------|-------------|
| P0 pass rate | 100% | CI blocks PR merge |
| P1 pass rate | ≥ 95% | CI warning, nightly report |
| Unit coverage (auth) | ≥ 80% | CI coverage gate |
| Integration coverage | ≥ 80% | CI coverage gate |
| HIGH risk mitigations | All verified | Epic 1 release checklist |
| CRITICAL risk 1.3-A | Voice fallback confirmed working | Acceptance test sign-off |
| No P0 failures on master | Last 24h | Alert on-call |
| NFR evidence | Identified for all 3 NFRs | Epic 1 completion review |

---

## Assumptions

1. **SMS delivery threshold**: SMS p95 delivery < 30s is assumed — confirm with operations team.
2. **OTP timeout**: OTP validity window is not yet defined in stories — default to 5 minutes unless AC refined.
3. **Test environment**: CI pipeline has access to a test PostgreSQL database with Drizzle schema.
4. **Mobile E2E**: Expo Go or EAS Build environment available for mobile test execution.
5. **k6**: Available in CI for NFR performance validation.

---

## Appendix: Test ID Index

| Prefix | Count | Level |
|--------|-------|-------|
| 1.1-INT-001 .. 007 | 7 | Integration — Story 1.1 |
| 1.1-COMP-001 .. 003 | 3 | Component — Story 1.1 |
| 1.1-UNIT-001 .. 002 | 2 | Unit — Story 1.1 |
| 1.1-E2E-001 .. 003 | 3 | E2E — Story 1.1 |
| 1.2-INT-001 .. 006 | 6 | Integration — Story 1.2 |
| 1.2-COMP-001 .. 002 | 2 | Component — Story 1.2 |
| 1.2-UNIT-001 | 1 | Unit — Story 1.2 |
| 1.2-E2E-001 .. 002 | 2 | E2E — Story 1.2 |
| 1.3-INT-001 .. 009 | 9 | Integration — Story 1.3 |
| 1.3-COMP-001 .. 002 | 2 | Component — Story 1.3 |
| 1.3-UNIT-001 .. 002 | 2 | Unit — Story 1.3 |
| 1.3-E2E-001 .. 003 | 3 | E2E — Story 1.3 |
| 1.4-INT-001 .. 007 | 7 | Integration — Story 1.4 |
| 1.4-COMP-001 | 1 | Component — Story 1.4 |
| 1.4-E2E-001 .. 003 | 3 | E2E — Story 1.4 |
| **Total** | **53** | |
