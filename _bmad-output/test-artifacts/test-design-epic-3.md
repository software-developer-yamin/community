---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-23'
inputDocuments:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/stories/epic-003-story-032.md
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

# Test Design: Epic 3 — Matchmaking & Filtering

**Date:** 2026-06-23
**Author:** Yamin (via BAD pipeline)
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-Level test design for Epic 3 (Matchmaking & Filtering), covering Story 3.2 (Native Language Field) and Story 3.3 (Match Timeout with Honest State). Story 3.1 (Gender Filter Enforcement) is already implemented and tested — this plan builds on its foundations.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (>=6): 3
- Critical categories: DATA (embedding staleness, language mismatch), TECH (queue state race conditions), SEC (profile field manipulation)

**Coverage Summary:**

- P0 scenarios: 12 (~18-28h)
- P1 scenarios: 10 (~10-16h)
- P2/P3 scenarios: 8 (~4-8h)
- **Total effort**: ~32-52h over 2-3 weeks

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Story 3.1 (Gender Filter Enforcement)** | Already implemented and tested | Verify no regressions from story 3.2/3.3 changes |
| **Epic 1 (Auth) / Epic 2 (Call Reliability)** | Separate epics, already tested | Document integration points: sessions for profile fields, call lifecycle for end screen |
| **LiveKit Cloud infrastructure** | External dependency, not testable directly | Monitor LiveKit status; test against documented SLOs |
| **AI embedding model internals** | External dependency (AI SDK) | Test at integration boundary: input language -> correct embedding, not model internals |
| **Native E2E (Expo/Detox)** | No native test framework configured | Web E2E covers core logic; native-specific scenarios marked as P2 manual |

---

## Risk Assessment

### Story Context

**Story 3.2 (Native Language Field)** adds a native language selection field to the onboarding flow. Users select from `bn, hi, ur, en, ta, te`. Defaults to `bn` for Bangladeshi users. The field feeds into profile embedding computation for matching and AI features. Users can change it later from profile settings, triggering embedding recomputation.

**Story 3.3 (Match Timeout with Honest State)** adds real-time matchmaking queue status with animated indicators, 15-second status updates, differentiated messaging at 60s and 5min thresholds, and a fast (<3s) transition to call screen when a match is found.

### High-Priority Risks (Score >= 6)

| Risk ID | Category | Description | P | I | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | - | - | ----- | ---------- | ----- | ------- |
| R3.2-A | DATA | **Embedding staleness**: user updates native language but the matching system uses the old embedding for the next match. Profile embedding recompute is async and may lag behind field update | 3 | 3 | **9** | Embedding recompute must be triggered synchronously on language change; verify new embedding is used in next match cycle. Add `embedding_version` field to profile | Dev | Story 3.2 impl |
| R3.2-B | DATA | **Language mismatch in matching**: AI features use hardcoded `en` instead of the user's actual native language. AC3 explicitly forbids hardcoded values | 3 | 3 | **9** | All AI feature calls must read `profile.nativeLanguage` at runtime — never cache the default. Unit test embedding computation with all 6 language values | Dev | Story 3.2 impl |
| R3.3-A | TECH | **Queue state race**: user exits queue while match is being formed — stale queue entry or inconsistent state. The transition from "looking" to "matched" to "call screen" must be atomic | 3 | 3 | **9** | Queue state machine must handle exit-at-match-time as a known edge case. Server must validate match before transitioning. No orphaned queue entries | Dev | Story 3.3 impl |
| R3.2-C | DATA | **Default language for non-Bangladeshi users**: AC1 default to `bn` only applies to Bangladeshi users. Non-Bangladeshi users may get `bn` incorrectly if location detection fails or is absent | 2 | 2 | **4** | Location detection must have explicit fallback (empty/unset, forcing user to choose). `bn` default only when geo-IP returns BD. Test geo-fallback paths | Dev | Story 3.2 impl |
| R3.2-D | DATA | **Language change not persisted**: user changes language in profile settings but value is lost on page refresh or app restart. Profile update API fails silently | 2 | 2 | **4** | Profile update must return success/failure status. Client must re-fetch profile on mount. Test PATCH profile -> refresh -> verify persistence | Dev | Story 3.2 impl |
| R3.3-B | OPS | **15-second status update timer drift** — setTimeout accumulates drift over 5+ minutes causing >30s gap between updates | 2 | 2 | **4** | Use `setInterval` with clock sync or re-derive from server timestamp rather than cumulative setTimeout. Display remaining time from server-side queue position | Dev | Story 3.3 impl |
| R3.3-C | PERF | **Call screen transition >3s**: match found but navigation to call screen exceeds the 3s AC4 limit due to room creation or token minting latency | 2 | 2 | **4** | Pre-create room or use room pool to reduce latency. Time the match->room->token chain with telemetry. Alert if p95 >3s | Dev | Story 3.3 impl |
| R3.3-D | TECH | **Animated indicator stops or freezes** during long wait — user sees static "Looking..." suggesting the system hung | 2 | 1 | **2** | Animation should use CSS animation (loop) not JS timer. Add failsafe: if animation stops (CSS animationiteration), show static indicator with timestamp | QA | Story 3.3 impl |
| R3.2-E | SEC | **Native language field manipulation** — user or API client sets invalid language value not in allowed set, bypassing frontend validation | 1 | 2 | **2** | Server-side validation of native_language against allowed enum. Reject with 422 on invalid values. Test direct API calls with garbage values | QA | Story 3.2 impl |

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
| Data Integrity | NFR11: Embedding uses actual native language, never hardcoded `en` | R3.2-B | Unit test all 6 language values produce non-identical embedding inputs | CI test report |
| Data Integrity | NFR12: Language change triggers embedding recompute before next match cycle | R3.2-A | Integration test: PATCH language -> verify new embedding in match queue | Test report |
| Performance | NFR5bis: Call screen transition from match found <3s p95 | R3.3-C | Integration test with timing instrumentation; measure match->room->token chain | CI performance report |
| Performance | Status update frequency: max 15s between updates | R3.3-B | Clock-skew tolerant timer test; verify no gap >20s over 5min wait | CI test report |
| Security | Server-side enum validation for native_language | R3.2-E | Direct API call test: POST/PATCH with invalid language values | Security test report |
| Reliability | Queue state: no orphaned entries after exit-at-match-time | R3.3-A | Integration test: exit while match forming -> verify queue clean, no ghost calls | Test report |

**Unknown thresholds:**
- Match transition time p95 (3s is AC spec — refine during implementation)
- Embedding recompute latency (depends on AI SDK model used)

---

## Entry Criteria

- [ ] Story 3.1 (Gender Filter Enforcement) implemented and tested
- [ ] Story 3.2 ACs finalized and approved
- [ ] Story 3.3 ACs finalized and approved
- [ ] Profile API with `native_language` field deployed
- [ ] Matchmaking queue service available
- [ ] Test environment with seed users of different languages

## Exit Criteria

- [ ] All P0 tests passing
- [ ] All P1 tests passing (or failures triaged with waiver)
- [ ] No open HIGH-risk items unmitigated
- [ ] Native language field server-validated against allowed enum
- [ ] Embedding recompute verified on language change
- [ ] Queue state machine handles exit/transition edge cases
- [ ] Match transition timing meets <3s AC

---

## Test Coverage Plan

### P0 — Critical (Must Test)

**Criteria:** Blocks core functionality + High risk (>=6) + No workaround

| Test ID | Scenario | Level | Risk Link | Notes |
| ------- | -------- | ----- | --------- | ----- |
| 3.2-INT-001 | Onboarding: user selects native language from dropdown — value persisted in profile | Integration | R3.2-A | Happy path: selection -> API -> DB |
| 3.2-INT-002 | Onboarding: Bangladeshi user sees `bn` as default pre-selected | Integration | R3.2-C | Geo-IP default test, BD location |
| 3.2-INT-003 | Onboarding: non-Bangladeshi user sees empty selection (no default) | Integration | R3.2-C | Non-BD geo-IP, must choose or get validation error |
| 3.2-INT-004 | Profile settings: user changes native language — PATCH succeeds, new value persisted | Integration | R3.2-D | Update path, verify DB after refresh |
| 3.2-INT-005 | Profile change triggers embedding recompute — new value used in next match cycle | Integration | R3.2-A | Embedding_version bump, match uses new embedding |
| 3.2-INT-006 | AI features use `profile.nativeLanguage` — all 6 languages produce correct embedding inputs | Integration | R3.2-B | 6 test cases: bn, hi, ur, en, ta, te — each maps to correct prompt/weight |
| 3.2-INT-007 | Server rejects invalid native_language value (422) for direct API call | Integration | R3.2-E | Security: enum validation, test garbage values |
| 3.3-INT-001 | Join match queue — "Looking for a partner..." with animated indicator shown | Integration | — | Initial queue state, animation active |
| 3.3-INT-002 | Status updates appear every 15 seconds while waiting | Integration | R3.3-B | Timer accuracy: verify 3 updates over 45s |
| 3.3-INT-003 | 60s timeout — status changes to "No partners online right now — we'll keep trying" with continue/exit options | Integration | — | First timeout threshold |
| 3.3-INT-004 | 5min timeout — offered options to lower filter strictness or exit | Integration | — | Second timeout threshold with filter options |
| 3.3-INT-005 | Match found — transition to call screen within 3 seconds | Integration | R3.3-C | Match->room->token->navigate timing |

**Total P0: 12 tests**

### P1 — High (Should Test)

**Criteria:** Important features + Medium risk (3-5) + Common workflows

| Test ID | Scenario | Level | Risk Link | Notes |
| ------- | -------- | ----- | --------- | ----- |
| 3.2-INT-008 | Onboarding without language selection — validation error shown | Integration | — | Required field enforcement |
| 3.2-INT-009 | Language change: refresh page -> new value still displayed | Integration | R3.2-D | Persistence across navigation |
| 3.2-INT-010 | Language change: embedding recompute fails gracefully — existing embedding used, error logged | Integration | R3.2-A | Degraded mode: fallback to old embedding |
| 3.2-COMP-001 | NativeLanguageSelector renders 6 options (bn, hi, ur, en, ta, te) with labels | Component | — | Visual: all languages visible, scrollable if needed |
| 3.2-COMP-002 | NativeLanguageSelector shows `bn` as default for BD users, empty for non-BD | Component | R3.2-C | Conditional default rendering |
| 3.2-COMP-003 | Profile language editor: current language pre-selected, dropdown works | Component | R3.2-D | Edit mode rendering |
| 3.3-INT-006 | Exit queue while match is forming — no orphaned entries, clean state | Integration | R3.3-A | Race condition: exit at match time |
| 3.3-INT-007 | Queue rejoin after exit — fresh queue state, no stale context | Integration | R3.3-A | Rejoin path |
| 3.3-COMP-001 | MatchmakingStatus: animated indicator renders correctly (spinner/pulse, accessible) | Component | R3.3-D | CSS animation + aria-live region |
| 3.3-COMP-002 | MatchTimeoutWarning (60s) and FilterOptions (5min) components render with correct messaging | Component | — | Both threshold UIs |

**Total P1: 10 tests**

### P2 — Medium (Nice to Test)

| Test ID | Scenario | Level | Notes |
| ------- | -------- | ----- | ----- |
| 3.2-INT-011 | Cross-platform: native language change on web -> reflects on native and vice versa | Integration | Multi-platform consistency |
| 3.2-INT-012 | Language dropdown keyboard navigation (Tab, Arrow keys, Enter) | Component | Accessibility: all 6 options reachable |
| 3.2-INT-013 | Race condition: language change while match cycle in progress — value used for next cycle | Integration | R3.2-A edge |
| 3.3-INT-008 | Animated indicator survives tab switch and return (web) — timer continues | Integration | R3.3-D |
| 3.3-INT-009 | Queue wait persists across app background/foreground (native) — timer continues | Integration | Cross-feature: state preservation |
| 3.3-INT-010 | Long wait (5min+) — animation and timer accuracy over extended period | Integration | R3.3-B |
| 3.3-UNIT-001 | Timeout threshold calculation (60s, 5min, update interval 15s) | Unit | Pure function: timer/state logic |
| 3.2-UNIT-001 | Language enum validation function — accepts 6 valid values, rejects everything else | Unit | R3.2-E: pure validation logic |

**Total P2: 8 tests**

### P3 — Low (Test if Time Permits)

| Test ID | Scenario | Level | Notes |
| ------- | -------- | ----- | ----- |
| 3.2-E2E-001 | Full onboarding flow: register -> select language -> complete -> verify profile | E2E | Full user journey |
| 3.3-E2E-001 | Full queue journey: join -> wait 60s -> see warning -> get matched -> verify call screen <3s | E2E | Full journey with timing |
| 3.2-SEC-001 | XSS attempt in native_language field value | Security | Input sanitization |
| 3.3-PERF-001 | Matchmaking queue under load: 100 concurrent users, verify wait time messages | Perf | Scalability benchmark |

**Total P3: 4 tests**

### Aggregate Coverage

| Priority | Count | Hours Range |
| -------- | ----- | ----------- |
| P0 | 12 | ~18-28h (complex setup: geo-IP mocking, queue state simulation, embedding test fixtures) |
| P1 | 10 | ~10-16h (standard integration + component) |
| P2 | 8 | ~4-8h (edge cases + cross-feature) |
| P3 | 4 | ~2-4h (benchmarks + exploratory) |
| **Total** | **34** | **~32-52h over 2-3 weeks** |

---

## Execution Strategy

**Philosophy:** API integration tests cover core data paths (language field, embedding recompute). Component tests verify UI rendering with different states (defaults, options). Web E2E for full onboarding and queue journeys.

| Cadence | What Runs | Duration Target |
| ------- | --------- | --------------- |
| Every PR (Story 3.2) | P0 integration tests (INT-001 through INT-007), unit tests (COMP-001, COMP-002, COMP-003), embedding unit tests | <10 min |
| Every PR (Story 3.3) | P0 integration tests (INT-001 through INT-005), unit tests (COMP-001, COMP-002), queue state machine tests | <10 min |
| Nightly | P1 integration + P0/component, cross-feature tests, geo-IP mocking, timer accuracy | ~15-20 min |
| Weekly | Full regression (all tags), P2/P3, native manual runs, load test (queue under concurrency) | ~30-45 min |

**CI tagging:** `@ep3-p0` for PR gate, `@ep3-p1` for nightly, `@ep3-regression` for weekly.

```bash
npx playwright test --grep "@ep3-p0"            # PR gate
npx playwright test --grep "@ep3-p0|@ep3-p1"    # Nightly
npx playwright test --grep "@ep3-p0|@ep3-p1|@ep3-p2|@ep3-p3"  # Weekly regression
```

---

## Dependencies & Test Blockers

| Dependency | Type | Affects | Details |
| ---------- | ---- | ------- | ------- |
| Profile API with `native_language` field | Backend | All 3.2 tests | Must exist in DB schema + API endpoint |
| Geo-IP detection service | Infrastructure | R3.2-C tests | Needed for BD vs non-BD default testing; mock in CI |
| Embedding computation service | Backend | R3.2-A, R3.2-B tests | Must accept language field as input parameter |
| Matchmaking queue service | Backend | All 3.3 tests | Must support join/exit/status API calls |
| Room pre-creation or pool | Infrastructure | R3.3-C | Needed for <3s transition timing test |
| Test framework configuration | Infrastructure | All tests | `playwright.config.ts` or equivalent |

---

## Quality Gates

| Gate | Threshold | Enforcement |
| ---- | --------- | ----------- |
| P0 pass rate | 100% | CI blocks PR merge |
| P1 pass rate | >= 95% | CI warning, nightly report |
| Language enum validation coverage | 100% branch (valid + invalid) | Unit test gate |
| Embedding not hardcoded | All 6 languages produce distinct embedding inputs | Integration test |
| HIGH risk mitigations | R3.2-A (sync recompute), R3.2-B (no hardcoded), R3.3-A (queue state machine) verified before release | Epic 3 release checklist |
| Match transition timing | <3s p95 measured in CI | Integration test gate |
| No P0 failures on master | Last 24h | Alert on-call |

---

## Assumptions

1. **Geo-IP detection**: A geo-IP service or middleware is available to detect Bangladeshi users. If not available, default logic falls back to requiring explicit user selection.
2. **Embedding computation**: The AI embedding service accepts `nativeLanguage` as an input field. Confirm interface contract with AI feature implementations.
3. **Queue state machine**: A server-side queue state machine exists with defined states (idle, waiting, matched, in-call, exited). Story 3.3 builds on this.
4. **Room pre-creation**: Room creation latency is the primary risk for the <3s transition. Pre-creation or pooling may be needed.
5. **Web call screen**: Assumes `apps/web/src/app/call/` exists from Epic 2. If missing, web queue-to-call transition tests may be blocked.

---

## Mitigation Plans

### R3.2-A: Embedding staleness (Score: 9)

**Mitigation Strategy:** Trigger embedding recompute synchronously on native language change in profile settings. Add `embedding_version` field to profile for cache invalidation. Verify next match cycle uses latest embedding.
**Owner:** Dev
**Timeline:** Story 3.2 implementation
**Status:** Planned
**Verification:** INT-005 (change -> recompute -> verify), INT-010 (graceful fallback)

### R3.2-B: Language mismatch in AI features (Score: 9)

**Mitigation Strategy:** All AI feature calls must read `profile.nativeLanguage` at runtime — never hardcode `en`. Unit test embedding computation with all 6 language enum values. Integration test that each value produces a distinct embedding input.
**Owner:** Dev
**Timeline:** Story 3.2 implementation
**Status:** Planned
**Verification:** INT-006 (all 6 languages), UNIT-002 (embedding input distinctness)

### R3.3-A: Queue state race condition (Score: 9)

**Mitigation Strategy:** Server must validate match before transitioning queue state. Implement "match_pending" intermediate state during match formation. If user exits during match_pending, cancel the pending match and clean up. No orphaned queue entries.
**Owner:** Dev
**Timeline:** Story 3.3 implementation
**Status:** Planned
**Verification:** INT-006 (exit during match forming), INT-007 (rejoin after exit)

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for Stories 3.2 and 3.3 (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.
- Run `*nfr-assess` for full NFR validation after implementation evidence exists.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Story 3.1 (Gender Filter)** | Native language field may interact with gender filter in matching decisions | Verify filter + language work independently; combined matching test |
| **Epic 1 (Auth/Profile)** | Profile API must expose native_language field; session persistence affects language selection | Verify profile CRUD + embedding pipeline |
| **Epic 2 (Call Reliability)** | Queue->call transition uses room lifecycle from Epic 2 | Verify call screen transition timing not regressed |
| **Epic 6 (State Preservation)** | Queue wait must survive background/foreground on mobile | Verify timer continuity across app lifecycle |
| **Existing Voice Clubs/AI Test/Courses** | AI features use language for prompt customization | Smoke test: existing AI features still work after Epic 3 changes |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework
- `probability-impact.md` — Risk scoring methodology
- `test-levels-framework.md` — Test level selection
- `test-priorities-matrix.md` — P0-P3 prioritization
- `nfr-criteria.md` — NFR validation patterns

### Related Documents

- Epic + Stories: `_bmad-output/planning-artifacts/epics.md` (lines 459-547)
- Story 3.1: `_bmad-output/implementation-artifacts/stories/epic-003-story-031.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Project Context: `_bmad-output/project-context.md`
- Epic 1 Test Design (reference): `_bmad-output/test-artifacts/test-design-epic-1.md`
- Epic 2 Test Design (reference): `_bmad-output/test-artifacts/test-design-epic-2.md`

### Language Enum Reference

```
Allowed values: bn, hi, ur, en, ta, te
Default (BD users): bn
Default (non-BD users): empty (must choose)
```

### Queue State Machine Reference

```
idle -> waiting (join queue)
waiting -> matched (match found) -> connecting -> active
waiting -> timeout_60s -> waiting (continue)
waiting -> timeout_5min -> choosing (lower filter / exit)
choosing -> waiting (continue with lower filter)
choosing -> idle (exit)
waiting -> idle (manual exit)
```

---

### Test ID Index

| Prefix | Count | Level |
| ------ | ----- | ----- |
| 3.2-INT-001 .. 013 | 13 | Integration — Story 3.2 |
| 3.2-COMP-001 .. 003 | 3 | Component — Story 3.2 |
| 3.2-UNIT-001 | 1 | Unit — Story 3.2 |
| 3.2-E2E-001 | 1 | E2E — Story 3.2 |
| 3.2-SEC-001 | 1 | Security — Story 3.2 |
| 3.3-INT-001 .. 010 | 10 | Integration — Story 3.3 |
| 3.3-COMP-001 .. 002 | 2 | Component — Story 3.3 |
| 3.3-UNIT-001 | 1 | Unit — Story 3.3 |
| 3.3-E2E-001 | 1 | E2E — Story 3.3 |
| 3.3-PERF-001 | 1 | Performance — Story 3.3 |
| **Total** | **34** | |

---

**Generated by:** BMad TEA Agent — Test Architect Module
**Workflow:** `bmad-testarch-test-design`
**Version:** 4.0 (BMad v6)
