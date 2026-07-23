# Story RE-1.1: Update Content Item

Status: ready-for-dev

## Story

As an Admin,
I want to update an existing content item's metadata (title, description, type, CEFR level, tags, URLs, duration, metadata),
so that I can correct mistakes or refresh content without losing associated interactions, embeddings, and recommendation scores.

## Acceptance Criteria

1. **Given** I am an admin on the admin content page (`/admin/content`), **When** I select a content item and edit its fields and save, **Then** the item is updated in the database with all changed values preserved.

2. **Given** I update a content item's title, description, or tags (semantic fields), **When** the save is confirmed, **Then** the content embedding row for that item is deleted, flagging it for recomputation by Story RE-2.2.

3. **Given** I update only non-semantic fields (sourceUrl, thumbnailUrl, duration, metadata), **When** the save is confirmed, **Then** the existing content embedding is NOT deleted and remains active.

4. **Given** I am a non-admin authenticated user, **When** I attempt to call the `adminUpdateContent` endpoint, **Then** I receive a 403 Forbidden response.

5. **Given** I am unauthenticated, **When** I attempt to call the `adminUpdateContent` endpoint, **Then** I receive a 401 Unauthorized response.

6. **Given** I submit an update with invalid data (e.g., title over 200 chars), **When** the request is processed, **Then** it is rejected with a validation error and the item is unchanged.

7. **Given** I attempt to update a content item ID that does not exist, **When** the request is processed, **Then** I receive a NOT_FOUND error.

## What Is Already Built — Do NOT Recreate

- **`packages/api/src/routers/recommendations.ts`** — All content procedures live here. Exports `recommendationsRouter`. No separate file needed.
- **`packages/api/src/index.ts`** — Exports `adminProcedure` (requires session + role === "admin"), `protectedProcedure`, `publicProcedure`. Use `adminProcedure` for the update endpoint.
- **`packages/db/src/schema/recommendations.ts`** — `contentItem` table already has all necessary columns: `id`, `title`, `description`, `type`, `cefrLevel`, `sourceUrl`, `thumbnailUrl`, `duration`, `tags`, `metadata`, `createdAt`, `updatedAt`. The `updatedAt` auto-refreshes on any `.update()` via `$onUpdate`. `contentEmbedding` table has `contentId` (PK, cascade-delete ref to `contentItem.id`).
- **`apps/web/src/app/admin/content/page.tsx`** — Admin content management UI. Already has: `listContent` query, `adminDeleteContent` mutation, `createContent` mutation + form, search/filter, delete confirmation dialog. Extend this file — do NOT create a new page or component file.
- **`apps/web/src/utils/orpc.ts`** — oRPC client. The mutation key follows: `orpc.recommendations.adminUpdateContent.mutationOptions()`.
- **`packages/api/src/routers/index.ts`** — `recommendationsRouter` already mounted at `recommendations.*`. No router registration changes needed.

## Tasks / Subtasks

- [ ] **T1 — Backend: Add `adminUpdateContent` procedure** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] In `packages/api/src/routers/recommendations.ts`, add `adminUpdateContent` to `recommendationsRouter` using `adminProcedure`
  - [ ] Input schema: `id` (uuid, required) + all content fields as optional (`title`, `description`, `type`, `cefrLevel`, `sourceUrl`, `thumbnailUrl`, `duration`, `tags`, `metadata`)
  - [ ] Verify item exists; throw `ORPCError("NOT_FOUND")` if not
  - [ ] Build partial update object from provided (non-undefined) fields only
  - [ ] Detect semantic field change: check if `title`, `description`, or `tags` are in the update
  - [ ] If semantic fields changed: delete the `contentEmbedding` row for this `contentId` (cascade won't trigger — use explicit `db.delete(contentEmbedding).where(eq(contentEmbedding.contentId, input.id))`)
  - [ ] Execute `db.update(contentItem).set(updateData).where(eq(contentItem.id, input.id)).returning()`
  - [ ] Return the updated item row

- [ ] **T2 — Frontend: Add edit capability to admin content page** (AC: 1, 6)
  - [ ] In `apps/web/src/app/admin/content/page.tsx`, add state: `editItem: ContentItem | null` (null = no modal open)
  - [ ] Add `updateMutation` using `orpc.recommendations.adminUpdateContent.mutationOptions()`
  - [ ] Add pencil/edit icon button (use `Pencil` from `lucide-react`) next to the Delete button for each content row; `onClick` → set `editItem` to that item
  - [ ] Add edit modal/form (similar to create form): a `div` with `fixed inset-0 z-50 flex items-center justify-center bg-black/50` overlay, pre-populated with `editItem` values
  - [ ] Edit form fields: title (text, max 200), description (textarea), type (select), cefrLevel (select), duration (number), tags (text, comma-separated), sourceUrl (url, optional), thumbnailUrl (url, optional)
  - [ ] On form submit: call `updateMutation.mutate({ id: editItem.id, ...changed fields }, { onSuccess: () => { setEditItem(null); refetch(); } })`
  - [ ] Show loading state on submit button while `updateMutation.isPending`
  - [ ] Cancel button closes modal (`setEditItem(null)`)

## Dev Notes

### Backend Implementation Detail (T1)

Add this procedure to `recommendationsRouter` in `packages/api/src/routers/recommendations.ts`, **after `adminDeleteContent`** and before the `seed` procedure:

```typescript
adminUpdateContent: adminProcedure
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
    const { id, ...fields } = input;

    // Verify item exists
    const existing = await db
      .select({ id: contentItem.id })
      .from(contentItem)
      .where(eq(contentItem.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Content item not found" });
    }

    // Build update payload from defined fields only
    const updateData: Partial<typeof contentItem.$inferInsert> = {};
    if (fields.title !== undefined) updateData.title = fields.title;
    if (fields.description !== undefined) updateData.description = fields.description;
    if (fields.type !== undefined) updateData.type = fields.type;
    if (fields.cefrLevel !== undefined) updateData.cefrLevel = fields.cefrLevel;
    if (fields.sourceUrl !== undefined) updateData.sourceUrl = fields.sourceUrl;
    if (fields.thumbnailUrl !== undefined) updateData.thumbnailUrl = fields.thumbnailUrl;
    if (fields.duration !== undefined) updateData.duration = fields.duration;
    if (fields.tags !== undefined) updateData.tags = fields.tags;
    if (fields.metadata !== undefined) updateData.metadata = fields.metadata;

    // Delete embedding if semantic fields change (Story RE-2.2 will recompute)
    const semanticChanged =
      fields.title !== undefined ||
      fields.description !== undefined ||
      fields.tags !== undefined;
    if (semanticChanged) {
      await db
        .delete(contentEmbedding)
        .where(eq(contentEmbedding.contentId, id));
    }

    const updated = await db
      .update(contentItem)
      .set(updateData)
      .where(eq(contentItem.id, id))
      .returning();

    return updated[0];
  }),
```

**Import note:** `contentEmbedding` is already imported at the top of `recommendations.ts` — no new imports needed.

### Frontend Implementation Detail (T2)

In `apps/web/src/app/admin/content/page.tsx`:

1. Add `Pencil` to the lucide-react import line (already imports `Trash2`).

2. Add state variable near the other `useState` calls:
   ```typescript
   const [editItem, setEditItem] = useState<ContentItem | null>(null);
   ```

3. Add mutation near other mutations:
   ```typescript
   const updateMutation = useMutation(
     orpc.recommendations.adminUpdateContent.mutationOptions()
   );
   ```

4. Add handler:
   ```typescript
   const handleEdit = (item: ContentItem) => {
     setEditItem(item);
   };

   const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (!editItem) return;
     const form = e.currentTarget;
     const formData = new FormData(form);
     const tags = (formData.get("tags") as string)
       .split(",")
       .map((t) => t.trim())
       .filter(Boolean);

     updateMutation.mutate(
       {
         id: editItem.id,
         title: formData.get("title") as string,
         description: formData.get("description") as string,
         type: formData.get("type") as "video" | "article" | "exercise" | "dialogue",
         cefrLevel: formData.get("cefrLevel") as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
         duration: Number(formData.get("duration")) || undefined,
         tags,
       },
       {
         onSuccess: () => {
           setEditItem(null);
           refetch();
         },
       }
     );
   };
   ```

5. Add Pencil button in the actions column next to Trash2:
   ```tsx
   <button
     className="rounded-md p-2 text-muted-foreground hover:bg-accent"
     onClick={() => handleEdit(item)}
     title="Edit"
     type="button"
   >
     <Pencil className="h-4 w-4" />
   </button>
   ```

6. Add edit modal (place it alongside the existing delete modal):
   ```tsx
   {editItem && (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
       <div className="mx-4 w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
         <h3 className="mb-4 font-semibold">Edit Content</h3>
         <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleUpdate}>
           <div className="sm:col-span-2">
             <label className="mb-1 block font-medium text-sm" htmlFor="edit-title">Title</label>
             <input className="w-full rounded-md border px-3 py-2" defaultValue={editItem.title} id="edit-title" maxLength={200} name="title" required type="text" />
           </div>
           <div className="sm:col-span-2">
             <label className="mb-1 block font-medium text-sm" htmlFor="edit-description">Description</label>
             <textarea className="w-full rounded-md border px-3 py-2" defaultValue={editItem.description} id="edit-description" name="description" required rows={3} />
           </div>
           <div>
             <label className="mb-1 block font-medium text-sm" htmlFor="edit-type">Type</label>
             <select className="w-full rounded-md border px-3 py-2" defaultValue={editItem.type} id="edit-type" name="type">
               <option value="video">Video</option>
               <option value="article">Article</option>
               <option value="exercise">Exercise</option>
               <option value="dialogue">Dialogue</option>
             </select>
           </div>
           <div>
             <label className="mb-1 block font-medium text-sm" htmlFor="edit-cefrLevel">CEFR Level</label>
             <select className="w-full rounded-md border px-3 py-2" defaultValue={editItem.cefrLevel} id="edit-cefrLevel" name="cefrLevel">
               <option value="A1">A1</option>
               <option value="A2">A2</option>
               <option value="B1">B1</option>
               <option value="B2">B2</option>
               <option value="C1">C1</option>
               <option value="C2">C2</option>
             </select>
           </div>
           <div>
             <label className="mb-1 block font-medium text-sm" htmlFor="edit-duration">Duration (seconds)</label>
             <input className="w-full rounded-md border px-3 py-2" defaultValue={editItem.duration ?? ""} id="edit-duration" name="duration" type="number" />
           </div>
           <div>
             <label className="mb-1 block font-medium text-sm" htmlFor="edit-tags">Tags (comma separated)</label>
             <input className="w-full rounded-md border px-3 py-2" defaultValue={editItem.tags.join(", ")} id="edit-tags" name="tags" type="text" />
           </div>
           <div className="flex gap-2 sm:col-span-2">
             <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={updateMutation.isPending} type="submit">
               {updateMutation.isPending ? "Saving..." : "Save Changes"}
             </button>
             <button className="rounded-md border px-4 py-2" onClick={() => setEditItem(null)} type="button">Cancel</button>
           </div>
         </form>
       </div>
     </div>
   )}
   ```

### Project Structure Notes

- All changes are confined to **2 files** — no new files needed.
- `packages/api/src/routers/recommendations.ts` — add 1 procedure (`adminUpdateContent`)
- `apps/web/src/app/admin/content/page.tsx` — add edit state + mutation + button + modal
- No DB schema changes required. The `contentEmbedding` row deletion approach uses the existing `contentId` PK reference. Drizzle's `db.delete()` on `contentEmbedding` where `contentId = id` is safe even if no embedding exists (returns 0 rows deleted without error).
- The `updatedAt` column on `contentItem` has `$onUpdate(() => new Date())` — Drizzle auto-sets it on any `.update()` call. Do NOT manually set `updatedAt` in the update payload.
- **Do not change `createContent`** — it remains `protectedProcedure`. Story RE-1.3 handles gating it to admin-only.

### Semantic Field Definition

Fields that affect embedding quality and MUST trigger embedding deletion when changed:
- `title`
- `description`
- `tags`

Fields that do NOT affect embeddings (no deletion needed):
- `type`, `cefrLevel`, `sourceUrl`, `thumbnailUrl`, `duration`, `metadata`

### Error Codes

Follow existing oRPC patterns in this codebase:
- Not found: `throw new ORPCError("NOT_FOUND", { message: "Content item not found" })`
- Auth errors: handled automatically by `adminProcedure` middleware (`UNAUTHORIZED`, `FORBIDDEN`)

### ContentItem Interface

The `ContentItem` interface in the frontend page is currently:
```typescript
interface ContentItem {
  cefrLevel: string;
  createdAt: string;
  description: string;
  duration: number | null;
  id: string;
  tags: string[];
  title: string;
  type: string;
}
```
This does not include `sourceUrl`, `thumbnailUrl`, or `metadata`. For the edit form, it is sufficient to only pre-populate the fields already in this interface. If editing those optional URL fields is desired, extend the interface — but that is outside this story's scope.

### References

- Existing admin procedure pattern: `packages/api/src/index.ts` — `adminProcedure` definition
- Existing admin content endpoint: `packages/api/src/routers/recommendations.ts` — `adminDeleteContent`
- Content schema: `packages/db/src/schema/recommendations.ts` — `contentItem`, `contentEmbedding`
- Admin UI page: `apps/web/src/app/admin/content/page.tsx` — extend this file
- Epic source: `_bmad-output/planning-artifacts/epics-recommendation-engine.md` — Epic RE-1, Story RE-1.1

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `packages/api/src/routers/recommendations.ts`
- `apps/web/src/app/admin/content/page.tsx`
