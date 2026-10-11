---
status: blocked
---

# BMad Build Auto Result

Status: blocked

Blocking condition: unclear intent

## Notes

The invocation supplied `<command-instruction>@skills/bmad-build-auto</command-instruction>`
with an empty `<user-request>`.

Step 1's intent check requires one of:

- an explicit spec file path with recognized `status` frontmatter — not supplied
- a spec folder plus a story id (folder+id dispatch) — not supplied
- a story ID, ticket ID, file path, short description, or free-form intent — not supplied

No intent was resolved, so the run halted at step-01 before context loading,
version-control sanity check, and routing. No spec file was derived and no
planning, implementation, or review step ran.

Re-invoke with an explicit target, for example:

- `/bmad-build-auto _bmad-output/implementation-artifacts/stories/epic-005-story-053.md`
- `/bmad-build-auto 5-3f provider executor`
- a spec folder plus story id, if a folder-based spec layout is in use