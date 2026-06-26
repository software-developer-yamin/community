---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-26'
inputDocuments:
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/stories/epic-005-story-051.md'
  - '_bmad-output/implementation-artifacts/stories/epic-005-story-052.md'
  - '_bmad-output/implementation-artifacts/stories/epic-005-story-054.md'
  - '_bmad-output/implementation-artifacts/stories/epic-005-story-055.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic 5 — Billing, Support & Refund Transparency

**Date:** 2026-06-26
**Author:** Yamin
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for Epic 5 — Billing, Support & Refund Transparency

Epic 5 covers four stories delivered across web, native, and server layers:

- **Story 5.1** — Visible Subscription State + auto-renew toggle (status: draft)
- **Story 5.2** — In-App Support Tickets UI, web + native (status: completed)
- **Story 5.4** — SSLCommerz Payment Gateway Integration (status: done)
- **Story 5.5** — Cancellation Preserves Access Until Period End + lazy-downgrade cron (status: pending)

Payment and billing carry the highest financial and security risk of any epic in this system. An untested IPN handler or mismanaged tier state can cause direct revenue loss, incorrect feature gating, or fraudulent subscription activation.

**Risk Summary:**

- Total risks identified: 14
- High-priority risks (score ≥ 6): 6
- Critical categories: SEC (3), DATA (2), BUS (1)

**Coverage Summary:**

- P0 scenarios: 22 (~44–55 hours)
- P1 scenarios: 18 (~18–27 hours)
- P2 scenarios: 12 (~6–12 hours)
- P3 scenarios: 5 (~1–3 hours)
- **Total effort**: ~69–97 hours (~9–12 dev-days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| **bKash / Nagad / Razorpay integration** | Explicitly deferred in Story 5.4 spec | Test-design coverage when providers added |
| **Auto-renewal billing (recurring charges)** | SSLCommerz is one-time charge; re-subscribe is a new session | Cover renewal UX flow in future story |
| **Refund mechanism (Story 5.3)** | Story spec not yet written | Add to test design once spec is available |
| **Pro-rated refunds** | Explicitly out of scope per Story 5.5 spec | N/A |
| **Email notifications for expiry** | Deferred in Story 5.5 spec | Covered when notification story ships |
| **Detox / native E2E automation** | No native test framework configured | Manual verification on native; automate post-framework selection |

---

## Risk Assessment

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| R-001 | SEC | IPN payload is trusted without SSLCommerz Validation API call — allows fraudulent subscription activation by forging a POST to `/api/billing/ipn` | 2 | 3 | 6 | API test verifies that a synthetic IPN without a valid `val_id` does NOT activate the subscription; `verifyPayment` is called in every non-idempotent path | QA + Dev | Before Story 5.4 release |
| R-002 | SEC | `risk_level = 1` transactions silently activate subscription — risky payments bypassing the risk check | 2 | 3 | 6 | Dedicated API test: inject IPN with `risk_level = 1`, assert subscription remains `pending` / transaction flagged | QA | Before Story 5.4 release |
| R-003 | DATA | IPN processed twice for the same `tran_id` — double activation duplicates subscription row or corrupts tier state | 3 | 2 | 6 | API test: send identical IPN twice, assert second call is a no-op (200 OK, single subscription row, unchanged tier) | QA + Dev | Before Story 5.4 release |
| R-004 | DATA | Tier not lazily downgraded when `tierExpiresAt` passes — expired users retain paid-tier feature access indefinitely | 2 | 3 | 6 | API test: seed user with past `tierExpiresAt`, call `getEffectiveTier`, assert `effectiveTier = "free"` and DB is updated | QA | Before Story 5.5 release |
| R-005 | SEC | Unauthenticated or cross-user access to `getSubscription`, `toggleAutoRenew`, or support ticket endpoints | 2 | 3 | 6 | API tests: verify 401 on unauthenticated calls; verify user A cannot read/mutate user B's subscription or tickets | QA | Pre-release (all stories) |
| R-006 | BUS | Client sends an arbitrary `amount` in `initiatePayment` — amount mismatch allows underpayment | 1 | 3 | 3 | Confirm via code review + API test: amount is derived 100% from server-side `TIER_PRICING` constants; input schema must NOT accept `amount` | QA + Dev | Before Story 5.4 release |

> **Note:** R-006 scores 3 but is flagged as a critical design invariant — it must be verified before release even though the probabilistic score is low.

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-007 | BUS | Auto-renew toggle optimistic update not rolled back on API failure — UI shows incorrect state | 2 | 2 | 4 | E2E / component test: simulate mutation error, assert toggle reverts to pre-mutation state | QA + Dev |
| R-008 | DATA | `toggleAutoRenew` does not set `tierExpiresAt` for subscriptions created before Story 5.5 — legacy subscriptions lose tier on next cleanup run | 2 | 2 | 4 | API test: legacy subscription row (no `tierExpiresAt`), call `toggleAutoRenew`, assert `tierExpiresAt` is populated | Dev |
| R-009 | SEC | Support ticket messages readable by other users (missing `userId` scope in DB query) | 2 | 2 | 4 | API test: user A creates ticket, user B calls `getTicketMessages` with ticket A's ID — expect 403/empty | QA |
| R-010 | PERF | Subscription state stale beyond 60s after payment webhook — user sees old state on Settings screen | 2 | 2 | 4 | Manual + monitoring: trigger IPN, navigate to Settings within 60s, verify updated state; plan TanStack Query `staleTime` review | QA |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| R-011 | OPS | `cleanupExpiredTiers` cron silently fails — no alerting, expired tiers persist | 2 | 1 | 2 | Unit test cron logic; add evlog structured output; verify on startup run; monitor in prod |
| R-012 | TECH | `@foxses/pay` library returns unexpected shape on SSLCommerz validation failure — unhandled exception in IPN handler | 1 | 2 | 2 | API test: stub `verifyPayment` to throw, assert IPN handler returns 200 (not 500) and transaction is set to `failed` |
| R-013 | BUS | Free-tier "Compare plans" pricing data rendered with wrong currency symbol (BDT vs INR) | 1 | 1 | 1 | E2E snapshot / component test: verify currency symbol matches locale |
| R-014 | OPS | SSLCommerz sandbox vs live toggle misconfigured in CI — live charges in test environment | 1 | 3 | 3 | Env guard: assert `SSLCOMMERZ_SANDBOX=true` in CI; document required env var explicitly |

> R-014 scores 3 due to high impact but low probability in a disciplined team. Treat as OPS blocker for CI setup.

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for `nfr-assess`.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|---|---|---|---|---|
| **Security — IPN integrity** | Every non-idempotent IPN must call SSLCommerz Validation API before activating subscription | R-001, R-002 | API integration tests; code review of IPN handler | Test report showing forged IPN rejected; `verifyPayment` call confirmed in code |
| **Security — auth boundaries** | All billing + subscription procedures require authenticated session; cross-user access returns 403 | R-005, R-009 | API auth tests (unauthenticated + cross-user) | Test report showing 401/403 responses |
| **Security — server-authoritative pricing** | Client input MUST NOT include `amount`; server derives from `TIER_PRICING` | R-006 | Code review + API schema validation test | Schema definition of `initiatePayment` confirming no `amount` field in input |
| **Reliability — IPN idempotency** | Duplicate IPN with same `tran_id` is a no-op; 200 OK, no duplicate subscription rows | R-003 | API test: replay same IPN body twice | Test report; DB assertion of single subscription row |
| **Reliability — tier cleanup** | Cron runs hourly; startup run on server boot; lazy downgrade in `getEffectiveTier` | R-004, R-011 | Unit test for `cleanupExpiredTiers`; API test for lazy downgrade path | Test report; evlog output confirming cleanup count |
| **Performance — subscription state freshness** | Subscription state reflects within 60s of payment webhook | R-010 | Manual post-IPN timing test; TanStack Query `staleTime` review | Manual test log or monitoring trace |
| **Maintainability — server-authoritative readable labels** | All subscription readable strings computed server-side in `formatSubscriptionDetail`; zero UI label logic | — | Code review + unit tests for `formatSubscriptionDetail` | Unit test coverage report showing all status-branch paths |
| **Sandbox isolation** | `SSLCOMMERZ_SANDBOX=true` enforced in CI/staging; never `false` in non-production | R-014 | CI env var assertion; documented in runbook | CI workflow file showing env guard |

**Unknown thresholds:**
- P99 latency for `initiatePayment` — not specified in PRD; mark as **UNKNOWN** until load profile defined
- Max concurrent webhook requests for IPN handler — not specified; plan to monitor in production

---

## Entry Criteria

- [ ] Stories 5.1, 5.2, 5.4, 5.5 specs reviewed and accepted by QA, Dev, PM
- [ ] Test environment with PostgreSQL and SSLCommerz sandbox credentials provisioned
- [ ] Sandbox payment flow verified manually (VISA `4111111111111111`, OTP `111111`)
- [ ] DB schema pushed (`pnpm db:push`) with `payment_transaction` and `subscription` tables
- [ ] `@foxses/pay` package installed and resolving in `@community/api`
- [ ] `SSLCOMMERZ_SANDBOX=true` confirmed in server `.env` and CI
- [ ] Test user accounts seeded: free-tier, active-premium, cancelled-premium, expired-premium
- [ ] Support ticket seeding utility available (or factory pattern agreed)

## Exit Criteria

- [ ] All 22 P0 test scenarios passing
- [ ] All 18 P1 test scenarios passing (or failures triaged with approved waivers)
- [ ] R-001 through R-005 mitigations verified by passing tests
- [ ] R-006 (server-authoritative pricing) confirmed by code review sign-off
- [ ] No open P0/P1 bugs without approved waivers
- [ ] Cron cleanup verified on staging with evlog output
- [ ] IPN idempotency confirmed with replay test
- [ ] `pnpm check-types` and `pnpm dlx ultracite check` passing on all changed files

---

## Test Coverage Plan

### P0 (Critical) — Run on every commit

**Criteria:** Blocks core billing/subscription journey + high risk (≥6) + no workaround

#### Story 5.1 — Subscription State API

| Requirement | Test Level | Risk Link | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| `getSubscription` returns `SubscriptionDetail` for active sub | API | R-005 | 1. Returns `status:"active"`, correct `readableLabel`, `readableDescription`, `nextBillingDate` | QA | Use seeded active-premium user |
| `getSubscription` returns free-tier detail when no subscription row | API | — | 2. Returns `status:"free"`, `tier:"free"`, `readableLabel:"Free Plan"` | QA | User with no subscription row |
| `getSubscription` returns cancelled status (autoRenew off) | API | R-007 | 3. `status:"cancelled"`, `readableDescription` contains "paid until" | QA | Seed `autoRenew=0` |
| `getSubscription` returns expired status | API | R-004 | 4. `status:"expired"`, "has ended" in description | QA | Seed `status="expired"` |
| `toggleAutoRenew` turns auto-renew off | API | R-007 | 5. `autoRenew=false`, `autoRenewDisabledAt` set | QA | Active subscription required |
| `toggleAutoRenew` turns auto-renew back on | API | R-008 | 6. `autoRenew=true`, `autoRenewDisabledAt` null | QA | — |
| Unauthenticated `getSubscription` rejected | API | R-005 | 7. Returns 401 | QA | No session header |
| Unauthenticated `toggleAutoRenew` rejected | API | R-005 | 8. Returns 401 | QA | — |

**P0 Story 5.1 subtotal: 8 scenarios**

#### Story 5.4 — SSLCommerz Payment Gateway

| Requirement | Test Level | Risk Link | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| IPN with `status=VALID`, `risk_level=0` activates subscription | API | R-001, R-003 | 9. Transaction → `completed`; subscription row created; `userProfile.tier` updated; `tierExpiresAt` set | QA | Stub `verifyPayment` to return VALID |
| IPN idempotency — duplicate `tran_id` is no-op | API | R-003 | 10. Second identical IPN returns 200; single subscription row; tier unchanged | QA | Replay same IPN body |
| IPN with `risk_level=1` does NOT activate subscription | API | R-002 | 11. Transaction status → `failed` or flagged; subscription NOT created; tier unchanged | QA | Stub `verifyPayment` to return VALID + risk_level=1 |
| IPN with `status=FAILED` does NOT activate subscription | API | R-001 | 12. Transaction → `failed`; no subscription row; tier unchanged | QA | — |
| Forged IPN without valid `val_id` does NOT activate | API | R-001 | 13. `verifyPayment` returns INVALID; subscription NOT created | QA | Stub to return INVALID |
| `initiatePayment` schema has no `amount` field | API | R-006 | 14. Sending `amount` in body is ignored / schema-rejected; server uses `TIER_PRICING` | QA | Pass `amount:1` in request body |
| `initiatePayment` returns `gatewayUrl` and `tranId` | API | — | 15. Response contains both fields; `payment_transaction` row created with `status:"pending"` | QA | Stub `gateway.createPayment` |
| Cross-user: user B cannot call `getPaymentStatus` for user A's `tranId` | API | R-005 | 16. Returns 403 or empty result | QA | Two seeded users |

**P0 Story 5.4 subtotal: 8 scenarios**

#### Story 5.5 — Effective Tier & Lazy Downgrade

| Requirement | Test Level | Risk Link | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| `getEffectiveTier` returns `"free"` when `tierExpiresAt` is past | API / Unit | R-004 | 17. Seed user with past `tierExpiresAt`; call `getEffectiveTier`; assert `effectiveTier="free"` and DB updated | QA | |
| Lazy downgrade updates DB atomically | Unit | R-004 | 18. After lazy downgrade call, `userProfile.tier="free"` and `tierExpiresAt=null` in DB | Dev | |
| Gender preference enforcement respects effective tier | API | R-004 | 19. User with past `tierExpiresAt` (was premium_plus) calls `updateGenderPreference` → 403 | QA | |
| Gender preference allowed when cancelled but within paid period | API | R-004 | 20. User with `autoRenew=0` but future `tierExpiresAt` can update gender preference | QA | |
| `cleanupExpiredTiers` downgrades all users with past `tierExpiresAt` | Unit | R-011 | 21. Seed 3 expired users; call `cleanupExpiredTiers`; assert all 3 downgraded to free | Dev | |
| Cross-user: user A cannot access user B's subscription | API | R-005 | 22. `getSubscription` scoped to current session user; no `userId` param accepted | QA | |

**P0 Story 5.5 subtotal: 6 scenarios**

**Total P0: 22 scenarios, ~44–55 hours**

---

### P1 (High) — Run on every PR to main

**Criteria:** Important features + medium risk (3–4) + common workflows

#### Story 5.1 — Subscription State UI

| Requirement | Test Level | Risk Link | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| Settings page shows "Subscription" section (web) | E2E | — | 1. Navigate to `/settings`, assert "Subscription" section visible | QA | Playwright |
| Free-tier shows tier comparison table with upgrade CTAs | E2E | — | 2. Free user → see "Free Plan", "Compare plans" table, "Upgrade to Premium" CTA | QA | |
| Active subscription displays tier badge, amount, dates, toggle | E2E | R-007 | 3. Active premium user → see tier badge, amount (e.g., "৳299"), next billing date, toggle ON | QA | |
| Cancelled subscription shows "paid until" message, toggle off | E2E | R-007 | 4. Cancelled premium user → see "paid until" text, toggle OFF | QA | |
| Auto-renew toggle: confirmation dialog on toggle-off | E2E | R-007 | 5. Click toggle off → confirmation dialog appears; cancel → toggle stays on | QA | |
| Auto-renew toggle: mutation succeeds and updates UI optimistically | Component | R-007 | 6. Toggle → optimistic update; mutation resolves → state persists | Dev | |
| Amount formatted correctly: BDT → ৳, INR → ₹ | API + Unit | R-013 | 7. `formatSubscriptionDetail` unit test: BDT 29900 → "৳299"; INR 49900 → "₹499" | Dev | |
| `toggleAutoRenew` errors when no active subscription | API | — | 8. User with no subscription → expect structured `ORPCError` | QA | |

**P1 Story 5.1 subtotal: 8 scenarios**

#### Story 5.2 — Support Tickets

| Requirement | Test Level | Risk Link | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| Create ticket returns ticket ID and confirmation | API | R-009 | 1. `createSupportTicket` → ticket row in DB, response with `id` | QA | |
| `getMyTickets` returns only current user's tickets | API | R-009 | 2. Two users each with tickets → each sees only their own | QA | |
| `getTicketMessages` scoped to ticket owner | API | R-009 | 3. User B calls `getTicketMessages` for User A's ticket ID → 403 or empty | QA | |
| `addTicketMessage` adds to thread | API | — | 4. Add message → appears in `getTicketMessages` response with `role:"user"` | QA | |
| Web: support page renders at `/settings/support` | E2E | — | 5. Navigate → form + ticket list visible | QA | Playwright |
| Web: ticket detail page shows message thread | E2E | — | 6. Click ticket → see messages; send reply → appears in thread | QA | |

**P1 Story 5.2 subtotal: 6 scenarios**

#### Story 5.4 — Payment Redirect Flows

| Requirement | Test Level | Risk Link | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| Success page polls `getPaymentStatus` until `"completed"` | E2E / Component | — | 1. Land on `/billing/success?tran_id=X`; stub status poll; on `"completed"` → show success message | QA | Mock poll |
| Fail page shows message and "Try again" CTA | E2E | — | 2. Navigate to `/billing/fail` → see failure message and retry button | QA | |
| Cancel page shows message and "Try again" CTA | E2E | — | 3. Navigate to `/billing/cancel` → see cancel message and retry button | QA | |
| Sandbox toggle: `SSLCOMMERZ_SANDBOX=true` uses sandbox base URL | Unit | R-014 | 4. Assert payment client instantiates with sandbox URL when env var is true | Dev | |

**P1 Story 5.4 subtotal: 4 scenarios**

**Total P1: 18 scenarios, ~18–27 hours**

---

### P2 (Medium) — Run nightly

**Criteria:** Secondary flows + low risk (1–2) + edge cases

| Story | Requirement | Test Level | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| 5.1 | Expired subscription shows "has ended" + upgrade options (web) | E2E | 1. Expired user → sees "has ended" text and upgrade CTAs | QA | |
| 5.1 | Auto-renew toggle rollback on API failure | Component | 2. Mutation throws → toggle reverts to pre-mutation state | Dev | R-007 |
| 5.1 | Native subscription screen mirrors web content | Manual | 3. Active user on native → see same fields as web surface | QA | Manual until Detox configured |
| 5.1 | `toggleAutoRenew` ensures `tierExpiresAt` set for legacy subs (no `tierExpiresAt`) | API | 4. Legacy subscription (no `tierExpiresAt`), call `toggleAutoRenew`, assert `tierExpiresAt` populated | Dev | R-008 |
| 5.2 | Support form validates required fields (subject, description, category) | Component | 5. Submit empty form → validation errors shown | QA | |
| 5.4 | IPN handler returns 200 even when `verifyPayment` throws | API | 6. Stub `verifyPayment` to throw; IPN handler returns 200; transaction set to `failed` | QA | R-012 |
| 5.4 | `initiatePayment` rejects unknown tier or billingPeriod | API | 7. Pass `tier:"unknown"` → Zod validation error | QA | |
| 5.4 | `getPaymentStatus` returns `pending` when transaction not yet completed | API | 8. Query status for pending transaction → `status:"pending"` | QA | |
| 5.5 | `cleanupExpiredTiers` returns count of downgraded users | Unit | 9. Mix of expired and non-expired; assert returned count matches only expired | Dev | |
| 5.5 | `getEffectiveTier` returns current tier when `tierExpiresAt` is future | Unit | 10. Seed future `tierExpiresAt`; assert `effectiveTier = "premium"` | Dev | |
| 5.5 | `getEffectiveTier` returns `"free"` when `tierExpiresAt` is null and tier is `"free"` | Unit | 11. No subscription row; `tier="free"` | Dev | |
| 5.1 | Currency display: Free-tier comparison table shows correct prices | E2E | 12. Free user → tier comparison table has correct amounts and currency symbols | QA | R-013 |

**Total P2: 12 scenarios, ~6–12 hours**

---

### P3 (Low) — Run on demand / exploratory

| Story | Requirement | Test Level | Test Scenarios | Owner | Notes |
|---|---|---|---|---|---|
| 5.4 | Sandbox end-to-end payment with real SSLCommerz sandbox | Manual E2E | 1. Full payment flow with VISA `4111111111111111`; verify subscription activation | QA | Requires sandbox credentials |
| 5.1 | Subscription state refreshes within 60s after IPN | Manual | 2. Fire IPN; open Settings within 60s; verify updated state | QA | R-010 |
| 5.5 | Cron runs on server startup without error (evlog output) | Manual | 3. Start server; verify evlog shows cleanup action with count | QA | R-011 |
| 5.4 | Native WebView payment modal closes on success/fail/cancel URL | Manual | 4. Trigger payment on native; simulate redirect URL; verify modal closes | QA | R-014 |
| 5.2 | Support ticket SLA: first response time not tested (infra, not code) | — | 5. Deferred — SLA is operational, not testable in unit/E2E scope | — | Out of automated scope |

**Total P3: 5 scenarios, ~1–3 hours**

---

## Execution Order

### Smoke Tests (< 5 min)

**Purpose:** Fast feedback — catch broken auth or DB connectivity before full suite

- [ ] `getSubscription` returns 200 for authenticated user (30s)
- [ ] `createSupportTicket` creates ticket and returns ID (30s)
- [ ] `initiatePayment` returns 200 with `gatewayUrl` (stubbed gateway, 45s)

**Total:** 3 scenarios

### P0 Tests (< 15 min)

**Purpose:** Critical path — IPN security, tier enforcement, auth boundaries

All 22 P0 scenarios above, grouped:

1. Auth boundary tests (scenarios 7, 8, 16, 22) — fastest, catch missing guards
2. IPN security tests (scenarios 9–15) — core billing integrity
3. Subscription state API tests (scenarios 1–6) — Story 5.1 data layer
4. Tier enforcement tests (scenarios 17–21) — Story 5.5 feature gating

### P1 Tests (< 30 min)

All 18 P1 scenarios above.

### P2/P3 Tests (< 60 min, nightly)

All 12 P2 scenarios. P3 scenarios run on demand only.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|---|---|---|---|---|
| P0 | 22 | 2.0–2.5 | 44–55 hrs | IPN mocking, DB seeding, auth stubs add complexity |
| P1 | 18 | 1.0–1.5 | 18–27 hrs | E2E setup, component test harness |
| P2 | 12 | 0.5–1.0 | 6–12 hrs | Mostly unit tests and simple API tests |
| P3 | 5 | 0.25–0.5 | 1–3 hrs | Manual exploratory; minimal automation |
| **Total** | **57** | **—** | **69–97 hrs** | **~9–12 dev-days** |

### Prerequisites

**Test Data:**

- `seedUser(tier)` factory — creates user + userProfile with given tier, optional `tierExpiresAt`
- `seedSubscription(userId, overrides)` factory — creates subscription row with defaults overridable
- `seedPaymentTransaction(userId, status)` factory — creates `payment_transaction` row
- `seedSupportTicket(userId)` factory — creates ticket + optional messages

**Tooling:**

- Bun test or Vitest for unit/API tests (framework selection per `bmad-testarch-framework` if needed)
- Playwright for web E2E
- `@foxses/pay` stub/mock for IPN tests (avoid live SSLCommerz calls in CI)
- evlog capture utility for verifying structured log output in unit tests

**Environment:**

- PostgreSQL running locally or in CI Docker service (`packages/db/docker-compose.yml`)
- `SSLCOMMERZ_SANDBOX=true` + valid sandbox credentials in CI secrets
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` set in test environment
- Web app running at `localhost:3001` for Playwright E2E tests

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (no exceptions; any failure blocks release)
- **P1 pass rate:** ≥ 95% (waivers required for each failure, must be documented)
- **P2/P3 pass rate:** ≥ 90% (informational; failures logged as tech debt)
- **High-risk mitigations (R-001 to R-005):** 100% of mitigating tests must pass

### Coverage Targets

- **IPN security paths:** 100% (R-001, R-002, R-003 — no exceptions)
- **Auth boundary paths:** 100% (R-005 — all protected procedures tested for 401/403)
- **Subscription state branches:** ≥ 90% (all 5 status values: free, active, cancelled, expired, refunded)
- **Tier enforcement paths:** 100% (lazy downgrade + gender preference gate)
- **Business logic (formatSubscriptionDetail):** ≥ 80% branch coverage

### Non-Negotiable Requirements

- [ ] All 22 P0 tests pass
- [ ] IPN forged-payload test (R-001) passes — subscription NOT activated
- [ ] IPN idempotency test (R-003) passes — no duplicate activation
- [ ] Cross-user access tests (R-005) pass — 401/403 verified
- [ ] `risk_level=1` payment blocked (R-002) — test must pass before Story 5.4 release
- [ ] Lazy tier downgrade (R-004) verified — test passes before Story 5.5 release
- [ ] `SSLCOMMERZ_SANDBOX=true` confirmed in CI environment before any Story 5.4 deployment
- [ ] `pnpm check-types` passes on all Epic 5 files
- [ ] NFR evidence (IPN test reports, auth test reports) filed before `nfr-assess` run

---

## Mitigation Plans

### R-001: IPN payload trusted without server-side validation (Score: 6)

**Mitigation Strategy:** API test verifies that a POST to `/api/billing/ipn` with a fabricated body — where `val_id` is unknown — does NOT create a subscription or change `userProfile.tier`. The `verifyPayment` call from `@foxses/pay` must be on the critical path in every non-idempotent IPN case. Code review sign-off required confirming no bypass path exists.
**Owner:** QA + Dev Lead
**Timeline:** Before Story 5.4 production release
**Status:** Planned
**Verification:** Test scenario #13 passes; code review shows `verifyPayment` precedes any DB write

### R-002: risk_level=1 transactions activate subscription (Score: 6)

**Mitigation Strategy:** IPN test seeds a transaction, stubs `verifyPayment` to return `{ status: "VALID", raw: { risk_level: 1 } }`, asserts that subscription is NOT created and transaction is marked `failed` (or flagged for review). Confirm `billing-ipn.ts` has an explicit `risk_level !== 0` guard.
**Owner:** Dev + QA
**Timeline:** Before Story 5.4 production release
**Status:** Planned
**Verification:** Test scenario #11 passes

### R-003: IPN double-processing creates duplicate subscription (Score: 6)

**Mitigation Strategy:** Test replays the same IPN body twice (same `tran_id`). Assert: second IPN returns 200, exactly one `subscription` row exists in DB, `userProfile.tier` unchanged. Confirm idempotency check in `billing-ipn.ts` reads `payment_transaction.status` before any write.
**Owner:** QA
**Timeline:** Before Story 5.4 production release
**Status:** Planned
**Verification:** Test scenario #10 passes; DB assertion confirms single row

### R-004: Expired tiers not downgraded — paid features accessible after expiry (Score: 6)

**Mitigation Strategy:** Unit test for `getEffectiveTier` with past `tierExpiresAt`; unit test for `cleanupExpiredTiers` covering mixed-expiry population; API test confirming gender-preference gate uses `effectiveTier` not raw `tier`. Confirm `rebuild.ts` calls `getEffectiveTier` in all feature-gated procedures.
**Owner:** Dev + QA
**Timeline:** Before Story 5.5 production release
**Status:** Planned
**Verification:** Test scenarios #17–21 pass

### R-005: Unauthorized access to subscription and ticket data (Score: 6)

**Mitigation Strategy:** Auth boundary tests for every Epic 5 protected endpoint: `getSubscription`, `toggleAutoRenew`, `getPaymentStatus`, `createSupportTicket`, `getMyTickets`, `addTicketMessage`, `getTicketMessages`. Two test flavors: (a) unauthenticated → 401; (b) authenticated as wrong user → 403 or empty. Confirmed via oRPC `protectedProcedure` middleware.
**Owner:** QA
**Timeline:** Pre-release, all stories
**Status:** Planned
**Verification:** Test scenarios #7, #8, #16, #22, P1 scenarios #3 pass

---

## Assumptions and Dependencies

### Assumptions

1. `@foxses/pay` library is stubbable in test context (can mock `gateway.createPayment` and `gateway.verifyPayment` without live network calls).
2. SSLCommerz sandbox is stable enough for P3 manual E2E — sandbox instability is an accepted risk for manual tests only.
3. A Bun-compatible test runner (Bun test or Vitest) will be selected before test implementation begins; test code is written to be runner-agnostic where possible.
4. `formatSubscriptionDetail` is a pure function (no DB calls) and is fully unit-testable in isolation.
5. The `cleanupExpiredTiers` cron uses `setInterval` in the MVP and is extractable for unit testing without starting the full server.
6. No testing framework (Playwright, Vitest) is currently installed — per `project-context.md`, test framework selection is deferred to `bmad-testarch-framework` skill.

### Dependencies

1. **Story 5.4 IPN endpoint deployed to test environment** — Required before P0 IPN tests can run (dependency: `pnpm db:push` with `payment_transaction` table)
2. **SSLCommerz sandbox credentials** — Required for P3 manual E2E and P1 sandbox URL test; must be in CI secrets before Story 5.4 release
3. **Story 5.1 `SubscriptionDetail` type finalized** — Story 5.5 tests extend this type; Story 5.5 tests depend on Story 5.1 completing
4. **Test framework selection** (`bmad-testarch-framework`) — Required before test implementation begins; tests are scaffolded in story specs but no runner is configured
5. **DB seeding utilities** — Seed factories for `user`, `userProfile`, `subscription`, `paymentTransaction`, and `supportTicket` must be in place before API tests run

### Risks to Plan

- **Risk:** `@foxses/pay` is not stubbable out-of-the-box (no dependency injection hook)
  - **Impact:** IPN tests require live SSLCommerz sandbox, making CI unreliable
  - **Contingency:** Wrap `gateway` calls in a thin adapter in `billing-ipn.ts`; inject mock adapter in tests

- **Risk:** Test framework not selected before Sprint end — test scaffolds from stories sit unexecuted
  - **Impact:** P0 tests remain unimplemented; release gating not possible
  - **Contingency:** Use Bun's built-in test runner as an interim; adopt `bmad-testarch-framework` in parallel

- **Risk:** SSLCommerz sandbox is unavailable during CI run
  - **Impact:** P3 manual E2E and any live-API tests fail intermittently
  - **Contingency:** All P0/P1 API tests stub `@foxses/pay`; only P3 requires live sandbox

---

## Interworking & Regression

| Service / Component | Impact | Regression Scope |
|---|---|---|
| **`getSubscription` (rebuild router)** | Enhanced from raw row to `SubscriptionDetail` — shape change | Any existing caller of `getSubscription` must update field access; confirm no other callers pre-Story 5.1 |
| **Settings page (web)** | New "Subscription" section added below "Account Standing" | Existing Account Standing section must remain intact; run E2E for Account Standing after Story 5.1 merge |
| **Native drawer navigation** | New "Subscription" and "Support" items added | Existing drawer items (e.g., Account Standing) must still render; manual verification |
| **`userProfile.tier` mutations** | IPN handler and `cleanupExpiredTiers` now write `tier` and `tierExpiresAt` | Any existing code reading `userProfile.tier` for feature gating must be audited; gender preference gate is the known case |
| **Gender preference enforcement** | Replaced direct tier check with `getEffectiveTier` call | Existing premium_plus users must still pass gate when `tierExpiresAt` is in the future |
| **`billingRouter` registration** | New router added to `packages/api/src/routers/index.ts` | Existing routers (auth, models, livekit, moderation, rebuild, support, call) must still resolve; run type-check |

---

## Follow-on Workflows (Manual)

- Run `/bmad-testarch-atdd` for Stories 5.1, 5.5 to generate failing P0 test stubs (IPN tests, lazy-downgrade tests, auth boundary tests) — run separately after this design is approved.
- Run `/bmad-testarch-framework` to select and configure Bun test / Vitest — required before test implementation begins.
- Run `/bmad-testarch-automate` for Story 5.2 (support tickets) — lower risk, can be deferred until Stories 5.1 + 5.4 P0s are green.
- Run `/bmad-testarch-test-design` for Story 5.3 (Refund Mechanism) when that spec is written.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: — Date: —
- [ ] Tech Lead: — Date: —
- [ ] QA Lead: — Date: —

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (TECH / SEC / PERF / DATA / BUS / OPS)
- `probability-impact.md` — Risk scoring: P × I, thresholds ≥6 = HIGH
- `test-levels-framework.md` — Test level selection (E2E / API / Component / Unit)
- `test-priorities-matrix.md` — P0–P3 prioritization criteria

### Related Documents

- Epic 5 definition: `_bmad-output/planning-artifacts/epics.md`
- Story 5.1: `_bmad-output/implementation-artifacts/stories/epic-005-story-051.md`
- Story 5.2: `_bmad-output/implementation-artifacts/stories/epic-005-story-052.md`
- Story 5.4: `_bmad-output/implementation-artifacts/stories/epic-005-story-054.md`
- Story 5.5: `_bmad-output/implementation-artifacts/stories/epic-005-story-055.md`
- Project Context: `_bmad-output/project-context.md`
- TEA Config: `_bmad/tea/config.yaml`

### Story Status Summary

| Story | Title | Status | Test Priority |
|---|---|---|---|
| 5.1 | Visible Subscription State | draft | P0 + P1 + P2 |
| 5.2 | Support Tickets UI | completed | P1 + P2 |
| 5.3 | Refund Mechanism | spec not written | Deferred |
| 5.4 | SSLCommerz Payment Gateway | done | P0 + P1 |
| 5.5 | Cancellation Preserves Access | pending | P0 + P2 |

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Epic:** Epic 5 — Billing, Support & Refund Transparency
**Mode:** Epic-Level (Create)
**Date:** 2026-06-26
