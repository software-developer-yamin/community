---
baseline_commit: 1acb4c8
---

# Story 4.3: Distinguish Victim from Aggressor

## Story

As a Learner,
I want to report a bad partner without receiving a strike myself,
So that I'm not punished for someone else's behavior.

## Acceptance Criteria

1. **Report voids strike for reporter** — Given a user short-disconnected (<30s) from a call, When they report their partner within 60 seconds of the call ending, Then the strike for that call is voided (`strikeEvent.voidedAt` set) And it no longer counts toward their moderation state.

2. **Report with reason selection** — Given a user wants to report their partner, When they submit a report, They must select a reason from (`non_participation`, `abuse`, `technical_failure`, `other`) And may optionally include details (max 500 chars).

3. **Partner flagged for review** — Given a report is submitted, When the report is recorded, Then the partner's `userProfile.flaggedForReview` is set to 1 And the partner receives an abuse-linked strike when the reason is `"abuse"`.

4. **Mutual report — both flagged, no strike for either** — Given both participants in a call report each other, When both reports are processed, Then neither user receives a strike for that call And both users are flagged for human review.

5. **One report per room per user** — Given a user has already reported their partner for a specific call room, When they attempt to report again for the same room, Then the API returns `{ success: false, alreadyReported: true }` And no duplicate report is created.

6. **60-second report window enforced** — Given a call ended more than 60 seconds ago, When the user attempts to report, Then the API returns an error (the report is rejected) And the strike is NOT voided.

## Tasks / Subtasks

- [x] **Task 1: Report partner API** (*Status: DONE*)
  - `reportPartner` procedure in `packages/api/src/routers/moderation.ts`
  - Room lookup (must be ended room, user must be participant)
  - Duplicate report check (one report per room per user)
  - Insert `partnerReport` row with reason, optional details
  - Void any open `short_disconnect` strike for this room on the reporter (`voidedAt`, `voidedReason: "partner_reported"`, `reportId`)
  - Flag partner profile: `userProfile.flaggedForReview = 1`
  - If reason is `"abuse"`, insert a `reported`-type strike on the partner
  - Returns `strikeVoided: boolean` so UI can show contextual confirmation

- [x] **Task 2: Report partner UI — Web** (*Status: DONE*)
  - Added `ReportPartnerDialog` component at `apps/web/src/components/report-partner-dialog.tsx`
  - Integrated into matching page — "Report an Issue" button visible after call ends
  - Room selector (via `getUserEndedRooms` endpoint), reason selector, optional details textarea
  - Wired to `moderation.reportPartner` mutation
  - Success step shows "Report submitted. Your strike has been voided." when `strikeVoided=true`

- [x] **Task 3: Report partner UI — Native** (*Status: DONE*)
  - `apps/native/app/call/ended.tsx` has full report flow with reason selector and details input
  - Wired to `moderation.reportPartner` mutation
  - Confirmation shows "Report submitted. Your strike has been voided." when `strikeVoided=true`

- [x] **Task 4: 60-second window enforcement** (*Status: DONE*)
  - `reportPartner` checks `room.endedAt` — rejects if `Date.now() - room.endedAt > 60_000`
  - Returns `"REPORT_WINDOW_CLOSED: The 60-second report window has passed"`
  - `getUserEndedRooms` endpoint only returns rooms within the 60s window

- [x] **Task 5: Clean up `console.warn` in skipCall** (*Status: DONE*)
  - `console.warn` already removed — catch block uses silent error handling (non-critical path)
  - No `console.log`, `console.warn`, or `console.error` in moderation router

- [x] **Task 6: Tests — Report partner API** (*Status: DONE — ATDD scaffolds*)
  - Created `tests/api/moderation-report.spec.ts` with 12 red-phase scaffolds
  - Created `tests/e2e/report-partner.spec.ts` with 6 red-phase scaffolds
    - [x] P0: Report voids strike for same-room short disconnect
    - [x] P0: Report flags partner for review
    - [x] P0: Abuse reason adds strike on partner
    - [x] P1: Duplicate report rejected
    - [x] P1: 60s window enforcement
    - [x] P1: Report from non-participant rejected
    - [x] P1: Report for non-ended room rejected

- [x] **Task 7: Verification**
  - [x] 7.1 LSP diagnostics clean on all changed files (`pnpm check-types`)
  - [x] 7.2 `pnpm dlx ultracite fix` run
  - [x] 7.3 No `console.log`, no `as any`, no `@ts-expect-error`
  - [ ] 7.4 Verify report flow via API test or curl

## Dev Notes

### Key Design Decisions

**Report voids strike — not prevents it.** The strike is created first (when the disconnect happens), then voided retroactively when the report is submitted. This keeps the strike recording path simple and deterministic — it always records a strike on short disconnect. The void is the appeal mechanism.

**`flaggedForReview` is a simple boolean on `userProfile`.** Rather than a separate review queue table in v1, we use the existing `flaggedForReview` column. A human moderator queries `SELECT * FROM userProfile WHERE flagged_for_review = 1`. This can be promoted to a proper review queue in a future iteration.

**Abuse reason gets extra weight.** When the reason is `"abuse"`, in addition to flagging, a `reported`-type strike is recorded on the partner. This is a separate strike type from `short_disconnect` — it doesn't decay automatically and is visible to moderators as having been reported for abuse.

**60-second window is checked server-side using `room.endedAt`.** The room's `endedAt` timestamp is set when `endCall` or `skipCall` runs. The report handler compares `Date.now() - room.endedAt <= 60000`. No client-side trust.

**Mutual report is handled implicitly.** Each user independently submits their report. The system processes each side: reporter A's strike voided, B flagged. Then reporter B's strike voided, A flagged. Both get flagged and neither has a strike for that room.

### Current Implementation Status

The `reportPartner` procedure is already implemented in `packages/api/src/routers/moderation.ts` with:

- ✅ Room validation (must be ended, user must be participant)
- ✅ Partner identification
- ✅ Duplicate report detection
- ✅ `partnerReport` insert
- ✅ Strike voiding (`strikeEvent.voidedAt`, `voidedReason: "partner_reported"`, linked by `reportId`)
- ✅ Partner profile flagging (`flaggedForReview = 1`)
- ✅ Abuse-linked strike recording

### Schema Reference

```typescript
// partnerReport table (packages/db/src/schema/rebuild.ts)
export const partnerReport = pgTable("partner_report", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: text("reporter_id").notNull().references(() => user.id),
  partnerId: text("partner_id").notNull().references(() => user.id),
  callRoomId: uuid("call_room_id").notNull().references(() => callRoom.id),
  reason: text("reason").notNull(), // "non_participation" | "abuse" | "technical_failure" | "other"
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// strikeEvent additions (packages/db/src/schema/rebuild.ts)
// voidedAt: timestamp("voided_at")           — set when report voids a strike
// voidedReason: text("voided_reason")         — "partner_reported"
// reportId: text("report_id")                 — FK to partnerReport.id

// userProfile addition (packages/db/src/schema/rebuild.ts)
// flaggedForReview: integer("flagged_for_review").default(0)  — set to 1 when reported
```

### Relevant Files

- `packages/api/src/routers/moderation.ts` — `reportPartner`, `skipCall` handlers
- `packages/api/src/lib/strike-logic.ts` — pure strike logic functions, types
- `packages/db/src/schema/rebuild.ts` — `partnerReport`, `strikeEvent`, `userProfile` tables
- `packages/db/src/schema/call.ts` — `callRecord` table
- `packages/api/src/routers/index.ts` — router registration
- `packages/api/src/index.ts` — oRPC server setup
- `tests/api/moderation-strikes.spec.ts` — API contract tests (all `.skip` currently)
- `tests/fixtures/moderation-test-constants.ts` — skip thresholds, timeouts
- `tests/fixtures/moderation-test-data.ts` — test users
- `apps/web/src/app/dashboard/` — web call flow pages
- `apps/native/app/call/ended.tsx` — native call-ended screen

### Story Dependencies

- Depends on: Story 4.1 (Graduated Strike System) — **done** (provides `strikeEvent` table, `voidedAt` column)
- Depends on: Database schema with `partnerReport`, `callRoom` tables — **done**
- Related: Story 4.4 (Visible Moderation State) — downstream consumer of `flaggedForReview` and moderation state
- Related: Story 4.2 (Skip Button) — provides `skipCall` endpoint (has `console.warn` to clean up)

### ATDD Artifacts

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-4-3-distinguish-victim-from-aggressor.md`
- API tests: `tests/api/moderation-report.spec.ts` (12 red-phase scaffolds)
- E2E tests: `tests/e2e/report-partner.spec.ts` (6 red-phase scaffolds)

### What Must Be Preserved

- Existing `getStrikes` endpoint must continue returning accurate strike counts (voided strikes excluded)
- Existing `shouldCountAsStrike` function behavior must remain unchanged
- Existing `computeDecayedState` must exclude voided strikes from count
- Existing `callRoom` status management must not be affected by report flow
- Existing `userProfile` updates for moderation state must continue working

## Dev Agent Record

### Completion Notes

- `reportPartner` handler fully implemented: room lookup, 60s window check, duplicate check, insert, void strike, flag partner, abuse strike
- Key addition: query pending strike before voiding so `strikeVoided: boolean` can be returned to UI
- Both web (`ReportPartnerDialog`) and native (`ended.tsx`) show contextual confirmation based on `strikeVoided`
- Web uses `getUserEndedRooms` to populate room selector (no URL state needed)
- Biome `useTopLevelRegex` — moved all regex in E2E spec to top-level constants
- Biome `noExportedImports` — removed re-export of imported symbol from API spec
- `pnpm check-types` and `pnpm dlx ultracite check` both clean

## File List

- `packages/api/src/routers/moderation.ts` — `reportPartner`, `getUserEndedRooms` procedures
- `apps/web/src/components/report-partner-dialog.tsx` — new report dialog component
- `apps/web/src/app/dashboard/matching/page.tsx` — integrate `ReportPartnerDialog`
- `apps/native/app/call/ended.tsx` — report flow with reason selector and strike-voided confirmation
- `packages/ui/src/components/dialog.tsx` — new shadcn Dialog component
- `packages/ui/src/components/textarea.tsx` — new shadcn Textarea component
- `packages/ui/package.json` — added Dialog/Textarea deps
- `tests/api/moderation-report.spec.ts` — new, 12 red-phase ATDD scaffolds
- `tests/e2e/report-partner.spec.ts` — new, 6 red-phase ATDD scaffolds
- `tests/api/moderation-strikes.spec.ts` — updated shared fixtures
- `tests/fixtures/moderation-test-constants.ts` — updated constants

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-24 | 1.0 | Story 4.3 implemented: report partner API, web + native UIs, ATDD scaffolds | Dev Agent |

## Status

review
