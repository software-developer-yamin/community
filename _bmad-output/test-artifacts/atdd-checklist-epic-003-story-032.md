---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-23'
storyId: '3.2'
storyKey: 'epic-003-story-032'
storyFile: '_bmad-output/implementation-artifacts/stories/epic-003-story-032.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-epic-003-story-032.md'
generatedTestFiles:
  - 'tests/api/native-language.spec.ts'
tddPhase: 'RED'
totalTests: 10
apiTests: 10
e2eTests: 0
fixturesCreated: 0
executionMode: 'sequential'
inputDocuments:
  - '_bmad-output/implementation-artifacts/stories/epic-003-story-032.md'
  - '_bmad-output/test-artifacts/test-design-epic-3.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/project-context.md'
---

# ATDD Checklist: Story 3.2 — Native Language Field

## Step 1 — Preflight & Context

**Detected Stack:** fullstack (web/Next.js + server/Bun/Hono + native/Expo)
**Test Framework:** Playwright (existing in `tests/`)
**Story Status:** new
**AC Count:** 7 (AC1-AC7)

### Loaded Context

- Story: Native Language Field — users can set their native language during onboarding, change it in profile settings, and have it reflected in profile embeddings
- Key findings from codebase audit:
  - DB schema already has `nativeLanguage` in `userProfile` table (`packages/db/src/schema/rebuild.ts:79`, default `"bn"`)
  - API already accepts `nativeLanguage` in `updateProfile` (`packages/api/src/routers/rebuild.ts:39`)
  - Embedding computation in `models.ts:242` uses **hardcoded** `native: "Bangla"` instead of loading from `userProfile`
  - No onboarding or profile settings UI exists yet in web or native apps
- Risk: embedding using wrong language (data quality), missing UI (poor UX), no recompute trigger (stale embeddings)

## Step 2 — Generation Mode

**Mode:** AI Generation
**Reason:** Native language field is primarily API-level + frontend data-entry. No network simulation or realtime. All test scaffolds generated from AC analysis and test design.

## Step 3 — Test Strategy

### Acceptance Criteria to Test Mapping

| AC | Description | P0 | P1 | Level |
|---|---|---|---|---|
| AC1 | Native language selectable during onboarding | API-001 | API-002 | API |
| AC2 | Native language editable in profile settings | API-003 | API-004 | API |
| AC3 | Embedding uses actual native language (not hardcoded) | API-005 | API-006 | API |
| AC4 | Default is Bengali (bn) | API-007 | — | API |
| AC5 | Embedding recomputed on language change | API-008 | API-009 | API |
| AC6 | Supported languages validated (flexible input) | API-010 | — | API |
| AC7 | Language code mapped to display name | — | API-006 | API |

### Test Levels

- **API tests** (Playwright API): Direct calls to `updateProfile`, `getProfile`, `recomputeEmbedding` — verify the field persists, embedding uses correct language, and recompute triggers work

### Red Phase Strategy

All tests use `test.skip()` — they will fail until implementation. Tests target the API layer since UI (onboarding/profile) is not yet built.

## Step 4 — Red-Phase Test Scaffolds

### Generated API Tests (`tests/api/native-language.spec.ts`) — 10 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| API-001 | P0 | should update nativeLanguage via updateProfile and persist it | AC1 |
| API-002 | P1 | should update nativeLanguage to each supported language code | AC1 |
| API-003 | P0 | should return nativeLanguage in getProfile | AC2 |
| API-004 | P1 | should allow changing nativeLanguage multiple times | AC2 |
| API-005 | P0 | should use actual nativeLanguage in PROFILE_TEMPLATE instead of hardcoded "Bangla" | AC3 |
| API-006 | P1 | should map 2-letter language code to display name in embedding text | AC3, AC7 |
| API-007 | P0 | should default nativeLanguage to "bn" for new profiles | AC4 |
| API-008 | P0 | should trigger recomputeEmbedding when nativeLanguage is updated | AC5 |
| API-009 | P1 | should NOT block updateProfile response if recomputeEmbedding fails | AC5 |
| API-010 | P0 | should accept any string up to 30 chars for nativeLanguage | AC6 |

## TDD Red Phase (Current)

- Total test scaffolds: 10 (10 API)
- All tests use `test.skip()` — red phase, expected to fail
- All tests include descriptive failure comments explaining why they will fail

## Acceptance Criteria Coverage

| AC | Test Level | Priority | Coverage |
|---|---|---|---|
| AC1: Selectable during onboarding | API | P0/P1 | API-001, API-002 |
| AC2: Editable in profile settings | API | P0/P1 | API-003, API-004 |
| AC3: Embedding uses actual language | API | P0/P1 | API-005, API-006 |
| AC4: Default is "bn" | API | P0 | API-007 |
| AC5: Embedding recomputed on change | API | P0/P1 | API-008, API-009 |
| AC6: Flexible validation | API | P0 | API-010 |
| AC7: Code → display name mapping | API | P1 | API-006 |

## Fixtures Created

None yet — test data is defined inline. Shared fixtures can be extracted during green phase.
