# 0001. Pnpm workspace monorepo with `apps/*` and `packages/*` layers

**Status:** Accepted
**Date:** 2026-10-11
**Evidence:** pnpm-workspace.yaml, package.json, turbo.json, docs/agents/domain.md

## Context

AceFluency needs three deployable surfaces plus shared layers that all move together: an Expo
app and a Next.js admin that must never ship a different auth shape than the server, and a
database schema that three packages read. `docs/agents/domain.md` records the decision that
these are "layers of one product (AceFluency), not separate bounded contexts," which rules out
per-repo versioning and per-app dependency resolution. `packages/api/src/context.ts` and
`apps/native/utils/orpc.ts` show the concrete pressure: the native client imports a
server-side router's type across a package boundary, so a type drift is a compile error only
if the boundary is enforced by the workspace.

## Decision

The repository is a single pnpm workspace declaring `apps/*` and `packages/*`
(`pnpm-workspace.yaml`), orchestrated by Turborepo (`turbo.json`). `apps/` holds the three
deployables — `native`, `web`, `server`; `packages/` holds the shared layers `api`, `auth`,
`db`, `env`, `ui`, `config`, `models`. Every cross-package dependency is declared as
`workspace:*` (for example `apps/native/package.json` depends on `@community/api`,
`@community/auth`, `@community/env`, `@community/ui`). Internal packages export raw
TypeScript source through their `exports` map rather than a build artifact —
`packages/api/package.json` maps `"."` to `"./src/index.ts"` — so consumers typecheck
against live source. `packages/config/tsconfig.base.json` is the single compiler baseline
every package extends.

## Rationale

Exporting source instead of `dist` removes the build-order problem entirely: Turbo can run
`check-types` across the graph with no package needing to be built first, and the server's
`bun run --hot src/index.ts` needs no watch step for a dependency's types. **Inference, not
stated in the repo:** the choice looks like a response to a two-surface codebase where the
cost of a stale `dist` (a native client typechecking against a server build that is one
commit behind) outweighed the cost of recompiling source. The alternative — npm/yarn
workspaces or Nx — is not discussed anywhere in the repository, so there is no recorded
reason for rejecting it.

## Consequences

**Accepts:**
- A type change in `packages/api` or `packages/db` breaks all three consumers at
  `turbo check-types`, with no build step to forget.
- `pnpm dev` starts all three surfaces through one `turbo dev` task.
- One dependency graph, one lockfile, one `node-linker=isolated` setting in `.npmrc`.
- Adding a shared concern is a directory, not a new repository: `packages/models` was added
  this way without touching any app's dependency graph.

**Costs:**
- Raw-TS exports mean every consumer's bundler must parse TypeScript from `node_modules`;
  Metro needs no extra configuration here only because the workspace root is inside the app.
- There is no enforced layer boundary. Nothing in the config prevents `packages/ui` from
  importing `packages/db`, or `packages/db` from importing a React component.
- Turbo caches `build` and `check-types` but caches no `db:*` task (all are `cache: false`),
  so database work never restores from cache even when the schema is unchanged.
- `turbo.json` declares a `lint` task, but no workspace `package.json` defines a `lint`
  script, so `turbo lint` currently runs nothing.

## Revisit when

A shared package's bundler config starts needing per-consumer overrides, or a dependency
graph cycle appears between two `packages/*` entries.
