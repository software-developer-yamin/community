# Story RE-1.3: Secure Content Creation

Status: ready-for-dev

**GH Issue:** [#45](https://github.com/software-developer-yamin/community/issues/45)

## Story

As the System,
I want to ensure only admin users can create content items,
So that the content library quality is maintained and unauthorized content is prevented.

## Acceptance Criteria

1. **Given** I am an admin user
   **When** I call the `createContent` endpoint
   **Then** the item is created successfully

2. **Given** I am a non-admin authenticated user
   **When** I call the `createContent` endpoint
   **Then** I receive a 403 Forbidden response
   **And** the content is not created

3. **Given** I am an unauthenticated user
   **When** I call the `createContent` endpoint
   **Then** I receive a 401 Unauthorized response

4. **Given** the `createContent` endpoint is gated to admin
   **When** the admin deletes the content they just created
   **Then** the `adminDeleteContent` endpoint still works as expected

## Design / Approach

The change is minimal — `createContent` is currently `protectedProcedure` (only checks auth).
Changing it to `adminProcedure` (checks auth + admin role) satisfies all ACs:

- `adminProcedure` = `publicProcedure.use(requireAuth).use(requireAdmin)`
- `requireAuth`: unauthenticated → 401 UNAUTHORIZED
- `requireAdmin`: non-admin → 403 FORBIDDEN
- Both pass for admin → content created successfully

The `.input()` schema and `.handler()` stay identical — only the procedure base changes.

## Tasks / Subtasks

- [ ] Task 1: Change `createContent` from `protectedProcedure` to `adminProcedure` (AC: 1, 2, 3, 4)
  - [ ] Change `createContent: protectedProcedure` → `createContent: adminProcedure`
  - [ ] No changes to `.input()` schema (already valid)
  - [ ] No changes to `.handler()` logic (already correct)
  - [ ] `adminDeleteContent` already uses `adminProcedure` → AC4 is automatically satisfied

- [ ] Task 2: Write tests (AC: 1, 2, 3)
  - [ ] Test: admin user → createContent succeeds (200 / returns created item)
  - [ ] Test: non-admin authenticated user → 403 Forbidden
  - [ ] Test: unauthenticated user → 401 Unauthorized

## Files Changed

- `packages/api/src/routers/recommendations.ts` — change procedure base only (~1 line)
- New test file for the createContent admin gating

## Definition of Done

- [ ] `createContent` uses `adminProcedure`
- [ ] Admin users can create content
- [ ] Non-admin users receive 403
- [ ] Unauthenticated users receive 401
- [ ] All existing tests pass
- [ ] `pnpm check-types` passes
