---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate']
lastStep: 'step-04c-aggregate'
lastSaved: '2026-06-24T01:50:00+06:00'
storyId: '4.3'
storyKey: '4-3-distinguish-victim-from-aggressor'
storyFile: '_bmad-output/implementation-artifacts/stories/epic-004-story-043.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-4-3-distinguish-victim-from-aggressor.md'
generatedTestFiles:
  - tests/api/moderation-report.spec.ts
  - tests/e2e/report-partner.spec.ts
---

# ATDD Checklist: Story 4.3 — Distinguish Victim from Aggressor

## TDD Red Phase (Current)

✅ Red-phase test scaffolds generated

- API Tests: 12 tests (all `test.skip()`) — `tests/api/moderation-report.spec.ts`
- E2E Tests: 6 tests (all `test.skip()`) — `tests/e2e/report-partner.spec.ts`
- Total: 18 skipped scaffolds

## Acceptance Criteria Coverage

| AC | Description | API Tests | E2E Tests | Priority |
|----|-------------|-----------|-----------|----------|
| AC1 | Report voids reporter's strike within 60s | ✅ `[P0] should void reporter's short-disconnect strike` | ✅ `[P0] should show confirmation...strike voided` | P0 |
| AC2 | Reason selection (4 options) + optional details ≤500 chars | ✅ `[P0] should accept all valid report reasons` + `[P0] details` + `[P1] reject >500 chars` | ✅ `[P0] should display reason selector` + `[P0] details input` | P0 |
| AC3 | Partner flagged for review; abuse adds strike | ✅ `[P0] flag partner` + `[P0] abuse strike` + `[P1] no strike non-abuse` | — | P0 |
| AC4 | Mutual report: both flagged, neither gets strike | ✅ `[P1] mutual report` | — | P1 |
| AC5 | One report per room per user | ✅ `[P1] reject duplicate` | ✅ `[P1] hide button after submit` | P1 |
| AC6 | 60s window enforced server-side | ✅ `[P1] reject after 60s` + `[P1] accept at boundary` | ✅ `[P1] expired-window message` | P1 |
| Edge | Non-participant cannot report | ✅ `[P1] non-participant rejected` | — | P1 |
| Edge | Non-ended room rejected | ✅ `[P1] non-ended room rejected` | — | P1 |
| Edge | Auth required | ✅ `[P2] require authentication` | ✅ `[P2] keyboard-navigable dialog` | P2 |

## Priority Summary

| Priority | Count | Coverage |
|----------|-------|---------|
| P0 | 7 tests | All critical ACs covered |
| P1 | 9 tests | All secondary ACs + security edge cases |
| P2 | 2 tests | Auth + accessibility |

## Execution Mode

- Mode: SEQUENTIAL (API → E2E)
- Stack: fullstack (Next.js + Expo + Hono/oRPC)
- Framework: Playwright

## Next Steps (Task-by-Task Activation)

As each implementation task completes:

1. **Remove `test.skip()`** from the relevant test(s) for the completed task
2. **Run the activated test**: `cd tests && npx playwright test moderation-report` or `report-partner`
3. **Verify RED → GREEN**: activated test should fail first (implementation missing), then pass after implementation
4. **Commit passing tests** before starting the next task

### Activation Map

| Task | Activate Tests |
|------|----------------|
| Task 1: `reportPartner` API (room lookup, partner ID, report insert) | `[P0] should void`, `[P0] reason acceptance`, `[P0] flag partner` |
| Task 4: 60-second window enforcement | `[P1] reject after 60s`, `[P1] boundary`, `[P1] reject non-ended room` |
| Task 2: Web UI (call-ended report flow) | All E2E tests in `report-partner.spec.ts` |
| Task 3: Native UI (confirm complete) | Manual verification via `apps/native/app/call/ended.tsx` |
| Task 6: Tests (RED → GREEN for API) | `[P1] duplicate`, `[P1] non-participant`, `[P2] auth` |

## Implementation Guidance

### API Endpoint

`POST /rpc/moderation/reportPartner`

Input schema:
```typescript
{
  roomName: string;          // min 1, max 100 chars
  reason: "non_participation" | "abuse" | "technical_failure" | "other";
  details?: string;          // max 500 chars
}
```

Response (success):
```typescript
{
  success: true;
  strikeVoided: boolean;
  partnerFlagged: boolean;
  partnerStrikeAdded?: boolean;  // only true when reason === "abuse"
}
```

Response (already reported):
```typescript
{ success: false; alreadyReported: true }
```

Error cases: `NOT_FOUND`, `REPORT_WINDOW_CLOSED`, `BAD_STATE`

### Web UI Components

- `apps/web/src/app/dashboard/matching/page.tsx` — call-ended screen
- `apps/web/src/components/report-partner-dialog.tsx` — report dialog (new)

### Native UI

- `apps/native/app/call/ended.tsx` — confirm report flow is complete
