---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-28'
---

# Test Design Progress — Epic 6

## Step 1: Mode Detection

- Mode selected: **Epic-Level**
- Reason: `sprint-status.yaml` exists; user explicitly provided "Epic 6 (Native App Resilience & Data Persistence)"
- Stories loaded: 6.1 (in-progress), 6.2 (backlog), 6.3 (backlog)

## Step 2: Context Loaded

- Project context loaded from `_bmad-output/project-context.md`
- Epic 6 story requirements loaded from `_bmad-output/planning-artifacts/epics.md`
- Sprint status loaded from `_bmad-output/implementation-artifacts/sprint-status.yaml`
- New utility files inspected: `apps/native/utils/callStateStorage.ts`, `apps/native/utils/networkState.ts`
- Existing tests scanned — no Epic 6 tests exist yet (all coverage is net-new)
- Stack detected: fullstack (Next.js web + Expo native + Hono server)
- Config: `tea_use_playwright_utils: true`, `tea_browser_automation: auto`, `tea_execution_mode: auto`
- Knowledge fragments loaded: `risk-governance.md`, `probability-impact.md`, `test-levels-framework.md`

## Step 3: Risk & Testability Assessment

- 11 risks identified
- 2 critical (score = 9): R-001 (OS-kill before saveCallState completes), R-002 (stale/expired token auth loop)
- 6 high (score = 6): R-003 (duplicate account on reinstall), R-004 (iOS/Android lifecycle mismatch), R-005 (crash logger misses ANR/black_screen), R-007 (isStateStale TTL 5min vs 30min spec), R-008 (subscription stale cache after reinstall), R-011 (Android foreground service not declared)
- 2 medium (score = 4): R-006 (backgrounding disconnect gets strike), R-009 (no Detox native E2E)
- 1 low (score = 3): R-010 (wrong-user call state after reinstall)
- NFR categories in scope: Reliability (FR17, FR18, NFR10), Performance (NFR2), Data Integrity (FR19), Maintainability

## Step 4: Coverage Plan

- P0: 15 scenarios (~25–35 hours) — 9 unit, 5 API, 1 config/static
- P1: 9 scenarios (~9–15 hours) — 2 unit, 7 API
- P2: 5 scenarios (~2.5–7.5 hours) — 5 API
- P3: 3 scenarios (~1.5–3 hours) — 1 performance, 2 exploratory/manual
- Total: 32 scenarios, ~38–60 hours (~5–7.5 days)

## Step 5: Output Generated

- Output: `_bmad-output/test-artifacts/test-design/test-design-epic-6.md`
- Execution mode: sequential (single output artifact)
- Validated against checklist: all sections populated
- Key gate: R-001 and R-002 (score-9) must both be mitigated with passing tests before Story 6.1 merge
