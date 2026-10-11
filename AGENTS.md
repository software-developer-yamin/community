# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **community** (5424 symbols, 6212 relationships, 46 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/community/context` | Codebase overview, check index freshness |
| `gitnexus://repo/community/clusters` | All functional areas |
| `gitnexus://repo/community/processes` | All execution flows |
| `gitnexus://repo/community/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- skill-routing:start -->
## Skill routing — stack all four, one per rung

Four skill families run here. They **stack by default**: BMAD holds the product track, Matt
Pocock the engineering loop, Impeccable the UI craft, Superpowers the process gate. On any
task spanning more than one of those, run all of them.

**Full loop — all four families, in order**

`/bmad-help` → `/to-spec` → `/to-tickets` → `/impeccable shape <route>` →
`/impeccable harden <route>` → `/using-git-worktrees` →
`/subagent-driven-development` (or `/implement` inline) → `/impeccable audit <route>` →
`/impeccable polish <route>` → `/code-review` → `/bmad-review` →
`/verification-before-completion` → `/finishing-a-development-branch` → `/pr` →
`/bmad-retrospective` + `/retro`

**Superpowers is a full rung, not an add-on.** `using-superpowers` fires every turn and
its execution protocol governs the build step: `/using-git-worktrees` to isolate,
`/dispatching-parallel-agents` or `/subagent-driven-development` when tickets are
independent, `/verification-before-completion` before any claim of done/fixed/passing,
`/requesting-code-review` after a major feature, `/receiving-code-review` before acting on
feedback, `/finishing-a-development-branch` once tests pass.

**Same rung → pick one.** Only these pairs are true substitutes, occupying the identical
step. Everything else composes.

| Rung | Reach for |
|---|---|
| Shape an idea | `/grill-with-docs` **and** `/bmad-brainstorming` **and** `/superpowers:brainstorming` |
| Plan | `/bmad-architecture` + `/bmad-create-epics-and-stories` **and** `/to-spec` + `/to-tickets` **and** `/superpowers:writing-plans` — epic altitude, ticket altitude, session altitude |
| Execute | `/superpowers:executing-plans` inline · `/subagent-driven-development` across subagents · `/implement` per ticket · `/implement-spec` for the whole graph · `/bmad-build` for BMAD-backlog stories · `/bad` for autonomous batches |
| Test-first | `/tdd` **and** `/bmad-testarch-atdd` **and** `/superpowers:test-driven-development` — acceptance-level and unit-level red phases stack |
| Debug | `/diagnosing-bugs` **and** `/superpowers:systematic-debugging` — near-identical, Matt's demands a red command first |
| Review | `/code-review` **and** `/bmad-review` **and** `/superpowers:requesting-code-review` — Standards+Spec, edge cases, fresh-eyes pass |
| Close | `/retro` **and** `/bmad-retrospective` — session environment vs epic outcome |

**Three surfaces, three roles.** `apps/native` is the client application and the **main
focus** — learners practice there. `apps/web` is the admin panel operators use.
`apps/server` serves both. `packages/*` are the shared layers both surfaces build on.

| Path | Role | Reads |
|---|---|---|
| `apps/native` | **Main focus.** Client application — learners practice here | root pair |
| `apps/web` | Admin panel — moderation, users, content, subscriptions | root pair |
| `apps/server` | Serves both surfaces | root pair |
| `packages/*` | Shared layers — api, auth, config, db, env, models, ui | root pair |

The root `PRODUCT.md` + `DESIGN.md` pair is the single source of truth for every surface.
Per-surface overrides were retired 2026-10-11 and live in
`docs/archives/native-surface-override/`.

**Every Impeccable command takes a target.** Default to `apps/native` — it is the main
focus. Aim at `apps/web` only for operator surface.

**Branch on entry**

| Situation | Reach for |
|---|---|
| Bug report | `/diagnosing-bugs` + `/superpowers:systematic-debugging`, `/bmad-help` for the epic it belongs to |
| Sprint state or epic scope | `/bmad-help` |
| Raw incoming issues | `/triage` → `/implement` |
| Effort larger than one session, no visible path | `/wayfinder` |
| Surface with pixels | `/impeccable shape` before any UI code |
| Independent tickets ready | `/superpowers:dispatching-parallel-agents` |
| Any completion claim | `/superpowers:verification-before-completion` |
| A session went sideways | `/retro` + `/superpowers:diagnosing-superpowers` |
| Finished a build | `/code-review` + `/bmad-review` + `/retro` |

Catalog and scenario recipes: `docs/agents/skill-routing.md`.
Repo skill config: `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md`.
<!-- skill-routing:end -->
