# Story RE-1.2: Bulk Content Import

Status: ready-for-dev

**GH Issue:** [#44](https://github.com/software-developer-yamin/community/issues/44)

## Story

As an Admin,
I want to import multiple content items from a JSON array payload,
So that I can populate the library efficiently without creating items one by one.

## Acceptance Criteria

1. **Given** I am an admin calling the `bulkImportContent` endpoint with a JSON array of items  
   **When** each item has valid fields (title, description, type, cefrLevel, tags, optional sourceUrl/thumbnailUrl/duration)  
   **Then** all valid items are created with UUIDs and timestamps  
   **And** the response includes a summary: `{ created: N, failed: N, errors: [...] }`

2. **Given** my import payload contains 50 items with 3 invalid rows  
   **When** the import is processed  
   **Then** 47 valid items are created  
   **And** the response lists the 3 invalid rows with their index and specific validation error message

3. **Given** I am a non-admin authenticated user  
   **When** I call the `bulkImportContent` endpoint  
   **Then** I receive a 403 Forbidden response

4. **Given** a content item in the import has the same title as an existing item  
   **When** it is processed  
   **Then** it is flagged in the error list as a potential duplicate (error: "Duplicate title: {title}")  
   **And** it is NOT created (skip behavior — no overwrite)

5. **Given** my import payload exceeds 200 items  
   **When** the request is submitted  
   **Then** the request is rejected with a validation error: "Batch size exceeds limit of 200"

## Tasks / Subtasks

- [ ] Task 1: Add `bulkImportContent` adminProcedure to `recommendationsRouter` (AC: 1, 2, 3, 4, 5)
  - [ ] Use `adminProcedure` (enforces admin-only access → AC3)
  - [ ] Input: `z.array(itemSchema).max(200)` where itemSchema matches createContent fields (title required, description required, type enum, cefrLevel enum, all optional fields optional)
  - [ ] Validate each item individually — collect errors rather than reject the whole batch
  - [ ] Check for duplicate titles against existing DB (single query: `SELECT title FROM content_item WHERE title = ANY(inputTitles)`)
  - [ ] Insert all valid, non-duplicate items via `db.insert(contentItem).values([...]).returning()`
  - [ ] Return `{ created: number, failed: number, errors: Array<{ index: number, title: string, error: string }> }`
  - [ ] Batch size > 200 → Zod rejects with validation error (AC5)

- [ ] Task 2: Write unit tests (AC: 1, 2, 3, 4, 5)
  - [ ] Test: all valid items → created count matches, errors empty
  - [ ] Test: mixed valid/invalid → partial success with error list
  - [ ] Test: duplicate title → flagged in errors, not created
  - [ ] Test: batch > 200 items → validation error
  - [ ] Co-locate in `packages/api/src/routers/__tests__/bulk-import.test.ts`

## Dev Notes

### What to implement

Add a single new `adminProcedure` called `bulkImportContent` in `packages/api/src/routers/recommendations.ts`. No new files needed. No schema changes.

### Existing code to follow

**`createContent`** (line ~390 in recommendations.ts) — single-item insert pattern to follow for each valid item.

**`updateContent`** (adminProcedure pattern) — use same `adminProcedure` guard.

**Item schema** — mirrors `createContent` input exactly:
```
title: z.string().min(1).max(200)
description: z.string().min(1).max(2000)
type: z.enum(["video", "article", "exercise", "dialogue"])
cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"])
sourceUrl: z.string().url().optional()
thumbnailUrl: z.string().url().optional()
duration: z.number().int().min(1).optional()
tags: z.array(z.string().min(1).max(50)).max(10).default([])
metadata: z.record(z.string(), z.unknown()).optional()
```

### Duplicate detection

```ts
const inputTitles = items.map(i => i.title);
const existing = await db
  .select({ title: contentItem.title })
  .from(contentItem)
  .where(inArray(contentItem.title, inputTitles));
const existingTitles = new Set(existing.map(r => r.title));
```

### Batch insert

Insert all valid items in one `db.insert(contentItem).values([...]).returning()` call for efficiency. Do NOT loop with individual inserts.

### Error format

```ts
type ImportError = { index: number; title: string; error: string };
```

Validation errors: `"Invalid: title must be ≤200 chars"`, `"Invalid: type must be one of video|article|exercise|dialogue"`, etc.
Duplicate errors: `"Duplicate title: {title}"`

### Return type

```ts
{ created: number; failed: number; errors: ImportError[] }
```
