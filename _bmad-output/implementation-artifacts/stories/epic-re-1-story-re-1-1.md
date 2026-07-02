# Story RE-1.1: Update Content Item

Status: ready-for-dev

**GH Issue:** [#43](https://github.com/software-developer-yamin/community/issues/43)

## Story

As an Admin,
I want to update an existing content item's metadata,
so that I can correct mistakes or refresh content without losing all associated interactions and scores.

## Acceptance Criteria

1. **Given** I am an admin on the content management page  
   **When** I select a content item and edit its title, description, type, CEFR level, tags, or metadata  
   **Then** the item is updated in place  
   **And** all existing interactions, embeddings, and recommendation scores are preserved

2. **Given** I update a content item's title or description  
   **When** the save is confirmed  
   **Then** the content embedding is flagged for recomputation  
   **And** the old embedding remains active until the new one is computed

3. **Given** I am a non-admin user  
   **When** I attempt to access the update endpoint  
   **Then** I receive a 403 Forbidden response

4. **Given** I attempt to update a content item with invalid data (e.g., title > 200 chars)  
   **When** the request is submitted  
   **Then** the update is rejected with a validation error

## Tasks / Subtasks

- [ ] Task 1: Add `updateContent` procedure to `recommendationsRouter` (AC: 1, 3, 4)
  - [ ] Use `adminProcedure` (enforces admin-only access → AC3)
  - [ ] Input: `id` (uuid) + all updatable fields as optional (title, description, type, cefrLevel, sourceUrl, thumbnailUrl, duration, tags, metadata)
  - [ ] Validate: title max 200 chars, description max 2000 chars, type enum, cefrLevel enum, tags array max 10 items (→ AC4)
  - [ ] Fetch existing item; throw `ORPCError("NOT_FOUND")` if missing
  - [ ] Run `db.update(contentItem).set(patch).where(eq(contentItem.id, input.id)).returning()`
  - [ ] Preserve all interactions/embeddings/scores (they FK to contentItem.id which is unchanged → AC1)

- [ ] Task 2: Flag embedding for recomputation on title/description change (AC: 2)
  - [ ] After update, check if `input.title !== undefined || input.description !== undefined`
  - [ ] If yes: set `contentEmbedding.modelVersion = "pending"` for that `contentId` via `db.update(contentEmbedding).set({ modelVersion: "pending" }).where(eq(contentEmbedding.contentId, input.id))`
  - [ ] If no `contentEmbedding` row exists yet, skip (no-op is safe)
  - [ ] Old embedding remains queryable (still in DB) until recomputed → AC2 satisfied

- [ ] Task 3: Register procedure in router index (AC: 1)
  - [ ] Add `updateContent` to `recommendationsRouter` export in `packages/api/src/routers/recommendations.ts`
  - [ ] Verify it's accessible via oRPC client at `orpc.recommendations.updateContent`

- [ ] Task 4: Write unit tests (AC: 1, 3, 4)
  - [ ] Test: admin can update title → returns updated item
  - [ ] Test: non-admin gets 403
  - [ ] Test: invalid title (>200 chars) → validation error
  - [ ] Test: updating title flags embedding as "pending"
  - [ ] Test: updating tags only does NOT flag embedding

## Dev Notes

### What to implement

Add a single new `adminProcedure` called `updateContent` in `packages/api/src/routers/recommendations.ts`. No new files needed. No schema changes (the `contentItem` table already has all fields). No DB migration needed.

### Existing code to understand first

**`packages/db/src/schema/recommendations.ts`** — `contentItem` table:
```
id: text (PK, uuid)
title: text NOT NULL
description: text NOT NULL
type: text NOT NULL  — "video" | "article" | "exercise" | "dialogue"
cefrLevel: text NOT NULL  — "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
sourceUrl: text nullable
thumbnailUrl: text nullable
duration: integer nullable (seconds)
tags: text[] NOT NULL default []
metadata: jsonb nullable
createdAt: timestamp
updatedAt: timestamp (auto-updated via $onUpdate)
```

`contentEmbedding` table:
```
contentId: text PK (FK → contentItem.id, cascade delete)
embedding: real[] NOT NULL
modelVersion: text NOT NULL   ← set to "pending" to flag for recomputation
updatedAt: timestamp
```

Interactions (`userInteraction`), scores (`recommendationScore`) all FK to `contentItem.id` — updating the item's fields leaves them intact (AC1).

**`packages/api/src/routers/recommendations.ts`** — existing patterns to follow:
- `createContent` uses `protectedProcedure` — our new `updateContent` MUST use `adminProcedure` (stricter, enforces `user.role === "admin"`)
- `adminDeleteContent` is the only existing `adminProcedure` that touches content — follow its pattern
- All procedures import from `"../index"`: `{ adminProcedure, protectedProcedure, publicProcedure }`
- Zod v4 — use `z.object({ ... })` for inputs
- Error codes are `SCREAMING_SNAKE_CASE` ORPCError strings: `throw new ORPCError("NOT_FOUND")`

### Implementation pattern (copy from adminDeleteContent, extend)

```typescript
updateContent: adminProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().min(1).max(2000).optional(),
      type: z.enum(["video", "article", "exercise", "dialogue"]).optional(),
      cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
      sourceUrl: z.string().url().optional().nullable(),
      thumbnailUrl: z.string().url().optional().nullable(),
      duration: z.number().int().min(1).optional().nullable(),
      tags: z.array(z.string().min(1).max(50)).max(10).optional(),
      metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    })
  )
  .handler(async ({ input }) => {
    const { id, ...patch } = input;

    // Verify exists
    const existing = await db
      .select({ id: contentItem.id })
      .from(contentItem)
      .where(eq(contentItem.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Content item not found" });
    }

    // Update the item (updatedAt auto-updated by $onUpdate)
    const rows = await db
      .update(contentItem)
      .set(patch)
      .where(eq(contentItem.id, id))
      .returning();

    // Flag embedding for recomputation if title or description changed
    if (patch.title !== undefined || patch.description !== undefined) {
      await db
        .update(contentEmbedding)
        .set({ modelVersion: "pending" })
        .where(eq(contentEmbedding.contentId, id));
    }

    return rows[0];
  }),
```

### Critical rules from project-context.md

- **`adminProcedure`** — already defined in `packages/api/src/index.ts`. Enforces `user.role === "admin"`. Non-admins get 403 (AC3).
- **Never use `any`** — all types must be explicit or inferred from Drizzle's `$inferSelect`/`$inferInsert`
- **No `console.log`** — use `evlog` if logging needed (not needed here)
- **Zod v4** — `z.string().min(1).max(200)` syntax (not `.trim()` — not needed unless specified)
- **`$onUpdate(() => new Date())`** is already on `contentItem.updatedAt` — no manual timestamp update needed
- **Import style** — `import type { ... }` for type-only imports. Existing imports at top of `recommendations.ts` already include `contentEmbedding`, `contentItem`, `eq` — no new imports needed.
- **ORPCError** — already imported at line 20 of `recommendations.ts`

### What NOT to do

- Do NOT change `contentItem.id` — it's the PK that all FK relationships depend on
- Do NOT delete or nullify `contentEmbedding` when title/description changes — only set `modelVersion = "pending"` (AC2: old embedding stays active)
- Do NOT use `protectedProcedure` — must be `adminProcedure` (AC3)
- Do NOT create a new file — add to existing `recommendations.ts`
- Do NOT touch `userInteraction`, `recommendationScore` — they are preserved automatically (AC1)
- Do NOT add a DB migration — no schema changes needed

### Testing location

Co-locate tests: `packages/api/src/routers/recommendations.test.ts`

The project has no pre-configured test framework per `project-context.md` ("No test framework pre-configured — Project currently has no testing framework. Add per bmad-testarch-framework if needed."). Skip test files unless ATDD step adds them.

### Project Structure Notes

- **File to edit**: `packages/api/src/routers/recommendations.ts` (existing, 1125 lines)
- **Add after**: `adminDeleteContent` procedure (line 878) — keep admin procedures grouped together
- **No new files**
- **No schema changes**
- **No env var changes**

### References

- Story RE-1.1 AC: `_bmad-output/planning-artifacts/epics-recommendation-engine.md` §Story RE-1.1
- Schema: `packages/db/src/schema/recommendations.ts` — `contentItem`, `contentEmbedding` tables
- Router: `packages/api/src/routers/recommendations.ts` — `adminDeleteContent` pattern (line 878), `createContent` pattern (line 390)
- Auth procedures: `packages/api/src/index.ts` — `adminProcedure`
- Project rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (coordinator direct execution, BAD manual mode)

### Debug Log References

N/A

### Completion Notes List

- Story created from epics-recommendation-engine.md §RE-1.1 + full codebase analysis
- No schema changes required — `contentItem` table already has all necessary columns
- `contentEmbedding.modelVersion = "pending"` chosen as embedding recomputation flag (reversible, queryable, no schema change)
- Embedding recomputation job (story RE-2.2) will pick up "pending" rows

### File List

- `packages/api/src/routers/recommendations.ts` — ADD `updateContent` adminProcedure
