# Skill Routing — AceFluency

Four skill families overlap in this repo. The `## Skill routing` block in `AGENTS.md`
holds the routing rule; this file holds the catalog behind it. Read this when the rule
points here, or when a scenario below matches.

## The rule

**Stack all four.** They run as layers, not competitors: BMAD holds the product track, Matt
Pocock the engineering loop, Impeccable the UI craft, Superpowers the process gate. On any
task spanning more than one, run all of them.

Only genuine **substitutes** need a pick-one — a small set of pairs that occupy the identical
step, where running both means doing the same work twice or contradicting yourself.

| Layer | Family | Owns |
|---|---|---|
| Product track | BMAD | PRD, epics, stories, architecture, sprint scope, retrospectives |
| Engineering loop | Matt Pocock | idea → spec → tickets → TDD → review → retro |
| UI craft | Impeccable | every surface with pixels |
| Process gate | Superpowers | the skill check before any action, plus the execution protocol: isolate → parallelise → verify → integrate |

Superpowers is a **full rung, not a passenger**. Its skills bracket the build step on both
sides — isolation before, verification and integration after. Nothing about the build is
correct without it.

### The only substitutes

| Rung | Options | Note |
|---|---|---|
| Shape an idea | `/grill-with-docs` · `/grill-me` · `/bmad-brainstorming` · `/bmad-cis-brainstorming` | Running two in sequence is fine — grilling then BMAD elicitation deepens rather than repeats. `/grill-with-docs` leaves the paper trail. |
| Plan | `/to-spec` + `/to-tickets` · `/bmad-architecture` + `/bmad-create-epics-and-stories` · `/superpowers:writing-plans` | **Different altitudes, not substitutes.** BMAD plans the epic, Matt plans the ticket, SP plans the session. Running BMAD then Matt is the intended composition. |
| Test-first | `/tdd` · `/superpowers:test-driven-development` · `/bmad-testarch-atdd` | `/tdd` and the SP one are true duplicates — pick one. `/bmad-testarch-atdd` is acceptance-level and *adds* to unit TDD rather than replacing it. |
| Debug | `/diagnosing-bugs` · `/superpowers:systematic-debugging` · `/bmad-review` | Matt's and SP's are near-identical — pick one, Matt's is stricter (demands a red command first). `/bmad-review` after the fix is an adversarial pass, not a substitute. |
| Review | `/code-review` · `/superpowers:requesting-code-review` · `/bmad-code-review` · `/bmad-review` | Matt = Standards + Spec against the diff. BMAD = edge cases and adversarial critique. Complementary — run both. |
| Close | `/retro` · `/bmad-retrospective` | Different scope: session environment vs epic outcome. Run both. |
| Execute | `/implement` · `/implement-spec` · `/bmad-build` · `/bad` | Pick by scope. `/implement` per ticket, `/implement-spec` for the whole graph in parallel, `/bmad-build` when the story came from the BMAD backlog, `/bad` for autonomous batches. |

## Repo-specific routing facts

### Commands

| Command | Runs |
|---|---|
| `pnpm test` | Everything: `bun test packages/api` + `bun test --cwd apps/native utils` + native Jest |
| `pnpm test:api` | `packages/api` Bun suites |
| `pnpm test:native` | Native Bun unit suites + native Jest component suites |
| `pnpm check-types` | Turbo across all 10 packages |
| `pnpm check` / `pnpm fix` | Ultracite (Biome) |

**Two test runners, deliberately.** `bun:test` covers pure logic and DB-adjacent code;
Jest covers React Native component tests. They cannot share a run — Bun cannot parse
`react-native/index.js.flow`, and Jest has no `bun:test` module.

`apps/native/bunfig.toml` preloads `utils/test-setup.ts`, which mocks Expo native modules.
Bun resolves `bunfig.toml` from **cwd**, so native suites must run with
`bun test --cwd apps/native`, not from the repo root. Dropping `--cwd` silently loses the
mock and crashes.

### Three surfaces, three roles

`apps/native` is the **client application** and the **main focus** — learners practice there.
`apps/web` is the **admin panel** operators use. `apps/server` **serves both**.
`packages/*` are the **shared layers** both surfaces build on.

| Path | Role | Reads | Primary user |
|---|---|---|---|
| `apps/native` | **Main focus.** Client application | root pair | Learners |
| `apps/web` | Admin panel | root pair | Operators |
| `apps/server` | Serves both surfaces | root pair | — |
| `packages/api` `auth` `config` `db` `env` `models` `ui` | Shared layers | root pair | — |

**Impeccable target selection.** Default to `apps/native` — it is the main focus. Aim at
`apps/web` only for operator surface: moderation, users, content, subscriptions. Admin-panel
work lands in **Operate** mode; learner-facing work gets the native visual world.

The root `PRODUCT.md` + `DESIGN.md` pair is the **single source of truth** for every surface.
Per-surface overrides were retired 2026-10-11 and archived to
`docs/archives/native-surface-override/`. Do not reintroduce them without first folding the
scope into the root record — the archived native override widened the product scope and the
root `PRODUCT.md` does not carry that widening yet. That scope lives as planned work under
the `epic-native` phases in `sprint-status.yaml`.

**Matt skills read three config files**, all created 2026-10-11:

- `docs/agents/issue-tracker.md` — GitHub Issues via `gh`
- `docs/agents/triage-labels.md` — five canonical labels
- `docs/agents/domain.md` — single-context glossary + ADR layout

**BMAD state lives in** `_bmad-output/implementation-artifacts/sprint-status.yaml`.
Read it for current position; `/bmad-help` interprets it.

## The full loop

All four families, one feature. Superpowers brackets it:

```
/bmad-help                              BMAD:  sprint state, epic context
/to-spec → /to-tickets                  Matt:  spec + tracer-bullet tickets
/impeccable shape <route>               Impec: UI direction before code
/impeccable harden <route>              Impec: empty states, errors, i18n
/using-git-worktrees                    SP:    isolate before executing
/subagent-driven-development            SP:    parallel per ticket
  (or /executing-plans inline, or /implement single-ticket)
/impeccable audit <route>               Impec: a11y + perf + responsive evidence
/impeccable polish <route>              Impec: final pass
/impeccable document                    Impec: regenerate DESIGN.md from what shipped
/code-review                            Matt:  Standards + Spec
/bmad-review                            BMAD:  adversarial + edge cases
/requesting-code-review                 SP:    fresh-eyes pass
/verification-before-completion         SP:    evidence before the done claim
/finishing-a-development-branch         SP:    decide the integration
/pr                                     Matt:  shapes the body, auto-invoked
/retro                                  Matt:  fix the session environment
/bmad-retrospective                     BMAD:  epic-level outcome
```

Every step above is reachable. None is skipped because another family is also present.

## Scenario recipes

### New feature, has UI, multi-session

```
/to-spec → /to-tickets
/impeccable shape <route>
/implement
/impeccable harden <route>
/impeccable audit <route>
/code-review → /bmad-review → /pr → /retro
```

### Bug, hard to pin

```
/diagnosing-bugs
```
Refuses to theorize until one command goes red on this specific bug. Then fixes with a
regression test. Add `/bmad-review` as an adversarial pass once fixed. Run `/retro` in the same
session — if the finding is "no good seam to lock this down", hand off to
`/improve-codebase-architecture`.

Simple bug with an obvious fix: fix it, then `/code-review` + `/bmad-review`. Skip the ceremony.

### Redefining product direction, epic scope, or architecture

```
/bmad-prd → /bmad-architecture → /bmad-create-epics-and-stories → /bmad-sprint-planning
  ↓ epic is now carved
/to-spec → /to-tickets          ← Matt refines at ticket altitude
```

### Redesigning an existing surface

```
/impeccable critique <route>
```
Score the incumbent before touching it, then pick exactly one refinement — `distill`,
`quieter`, or `bolder`. Never stack all three. Finish with `/impeccable document` to
regenerate `DESIGN.md`, then `/impeccable polish`.

### Greenfield landing page

```
/bmad-prfaq → /impeccable shape → /impeccable overdrive|typeset|animate
```

### Docs or reading surfaces

```
/to-spec → /implement → /impeccable typeset|clarify
```
Impeccable mode here is **Read** — structure for comprehension first.

### Incoming issue avalanche

```
/triage → /implement
```
`/triage` turns raw reports into agent-ready issues. Tickets from `/to-tickets` are already
agent-ready, so they go straight to `/implement`.

### Huge foggy effort, more than one session

```
/wayfinder
```
Produces decisions, not deliverables. When the map clears it hands off to `/to-spec` — not
to `/implement`, which would discard the linked detail.

### Test strategy

```
/bmad-testarch-test-design → /bmad-testarch-framework → /bmad-testarch-ci
  → /bmad-testarch-atdd → /bmad-testarch-automate → /bmad-testarch-trace
```
Composites with `/tdd` — acceptance-level red phases sit above unit-level slices.

### Autonomous sprint

```
/bad
```
Dependency graph, parallel subagents, one git worktree per story, create → dev → review → PR,
auto-merge. Reserve for a large backlog with independent stories.

## Catalog

### BMAD — `_bmad/` + `.agents/skills/bmad-*`

Product track: `/bmad-product-brief` · `/bmad-prfaq` · `/bmad-prd` · `/bmad-architecture` ·
`/bmad-create-epics-and-stories` · `/bmad-sprint-planning` · `/bmad-spec` · `/bmad-build` ·
`/bmad-code-review` · `/bmad-qa-generate-e2e-tests` · `/bmad-walkthrough` ·
`/bmad-retrospective` · `/bmad-correct-course` · `/bmad-ux` · `/bmad-project-context`

Orientation: `/bmad-help`

Anytime: `/bmad-brainstorming` · `/bmad-advanced-elicitation` · `/bmad-forge-idea` ·
`/bmad-deep-recon` · `/bmad-review` · `/bmad-party-mode` · `/bmad-customize`

Strategy: `/bmad-cis-innovation-strategy` · `/bmad-cis-problem-solving` ·
`/bmad-cis-design-thinking` · `/bmad-cis-brainstorming` · `/bmad-cis-storytelling` ·
`/bmad-cis-agent-*`

Testing: `/bmad-testarch-teach-me-testing` · `/bmad-testarch-test-design` ·
`/bmad-testarch-test-framework` · `/bmad-testarch-ci` · `/bmad-testarch-atdd` ·
`/bmad-testarch-automate` · `/bmad-testarch-test-review` · `/bmad-testarch-nfr` ·
`/bmad-testarch-trace`

Agents: `/bmad-agent-analyst` · `/bmad-agent-architect` · `/bmad-agent-dev` ·
`/bmad-agent-pm` · `/bmad-agent-ux-designer` · `/bmad-tea`

Design track: `wds-0-alignment-signoff` → `wds-1-project-brief` → `wds-2-trigger-mapping` →
`wds-3-scenarios` → `wds-4-ux-design` → `wds-5-agentic-development` →
`wds-6-asset-generation` → `wds-7-design-system` → `wds-8-product-evolution`

Autonomous: `/bad`

### Matt Pocock — `~/.agents/skills/`

Main flow: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` (or
`/implement-spec`) → `/pr` → `/retro`

On-ramps: `/triage` · `/diagnosing-bugs` · `/wayfinder`

Standalone: `/tdd` · `/code-review` · `/prototype` · `/handoff` ·
`/improve-codebase-architecture` · `/codebase-design` · `/domain-modeling` · `/teach` ·
`/retro` · `/research` · `/plannotator-annotate` · `/plannotator-last` · `/plannotator-review`

Router: `/ask-matt`

Config: `/setup-matt-pocock-skills` — already run

Domain: `/create-auth` · `/hono-api-scaffolder` · `/nextjs-react-typescript` ·
`/turborepo-monorepo` · `/react-native-dev` · `/expo-react-native-performance` ·
`/shadcn` · `/openapi-to-typescript` · `/gitnexus-*` · `/graphify` ·
`/gha-security-review` · `/migrate-to-shoehorn` · `/setup-pre-commit` ·
`/setup-ts-deep-modules`

### Superpowers — `.opencode` plugin, auto-loaded

`using-superpowers` fires every turn and requires a skill check before any response or action.
Invoke the rest as `/superpowers:<name>`. All fifteen are live and reachable.

| Skill | Fires when |
|---|---|
| `using-superpowers` | Every turn, automatically. The gate. |
| `brainstorming` | Creative work starts with no shaping step from BMAD or Matt |
| `writing-plans` | A plan must exist before code and no spec or ticket covers it |
| `executing-plans` | A written plan runs inline in one session, no subagents |
| `subagent-driven-development` | A plan breaks into independent tasks worth fanning out |
| `dispatching-parallel-agents` | 2+ tasks, no shared state, no sequential dependency |
| `test-driven-development` | Unit-level red-green slice, composes with `/bmad-testarch-atdd` |
| `systematic-debugging` | A bug resists first glance — composes with `/diagnosing-bugs` |
| `verification-before-completion` | Before **any** claim of done, fixed, or passing |
| `requesting-code-review` | After a major feature, before merge |
| `receiving-code-review` | Before implementing review feedback, to verify it technically |
| `using-git-worktrees` | Isolating feature work before executing a plan |
| `finishing-a-development-branch` | Tests pass; decide merge, PR, or cleanup |
| `writing-skills` | Creating or editing skills |
| `diagnosing-superpowers` | A session went sideways and you want to know why |

### Impeccable — `.opencode/skills/impeccable/`

Build: `shape` · `init` · `document` · `extract`
Evaluate: `critique` · `audit`
Refine: `polish` · `bolder` · `quieter` · `distill` · `harden` · `onboard`
Enhance: `animate` · `colorize` · `typeset` · `layout` · `delight` · `overdrive`
Fix: `clarify` · `adapt` · `optimize`
Iterate: `live` · `generate [n] [action] [element]`

Modes by surface — **Persuade** (landing, marketing, pricing) · **Operate** (dashboards,
admin, settings) · **Read** (docs, guides, changelogs) · **Experience** (portfolios,
galleries).

## Design-skill precedence

Impeccable is the primary UI skill. Narrow exceptions, chosen deliberately:

- `design-taste-frontend` — greenfield landing page, wants an opinionated visual direction
- `gpt-taste` — specifically wants GSAP scroll pinning and stacking
- `industrial-brutalist-ui` — specifically wants Swiss-brutalist
- `image-to-code` — a design image exists and must be rebuilt

Everything else that touches UI goes to Impeccable.

## Editing these files

`docs/agents/*.md` is skill configuration, not product documentation. Edit directly when
behaviour needs to change; re-running the setup skill is only necessary to switch issue
trackers or restart from scratch.