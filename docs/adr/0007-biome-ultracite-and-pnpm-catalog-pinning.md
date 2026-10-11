# 0007. Biome via Ultracite replaces eslint and prettier, with a pnpm catalog that pins matched pairs exactly

**Status:** Accepted
**Date:** 2026-10-11
**Evidence:** biome.jsonc, package.json, .husky/pre-commit, pnpm-workspace.yaml, .vscode/settings.json

## Context

Three apps and seven packages, including a React Native app whose linting runs against a
different toolchain than the web and server surfaces. Running eslint plus prettier across
that spread means two configs, a plugin matrix that has to stay compatible with both React
and React Native JSX, and formatting that disagrees between editor and pre-commit. The
version story is the second pressure: the same dependencies appear in ten different
`package.json` files, and two of them — `better-auth` and `@better-auth/expo` — are a matched
pair whose versions must never diverge.

## Decision

Linting and formatting run on **Biome through Ultracite**, with no eslint or prettier in the
repository. `biome.jsonc` extends three Ultracite presets — `ultracite/biome/core`,
`ultracite/biome/next`, `ultracite/biome/react` — and excludes only agent-tooling
directories. The root `package.json` pins `@biomejs/biome: 2.4.15` and `ultracite: 7.8.1`
exactly, exposes `check` / `fix` as `ultracite check` / `ultracite fix`, and wires a Husky
`pre-commit` hook that runs `pnpm dlx ultracite fix` on staged files only. Dependency
versions are centralised in the `catalog:` block of `pnpm-workspace.yaml`, consumed by 88
`"catalog:"` references across the workspace; every entry is caret-ranged except
`better-auth: 1.6.11` and `"@better-auth/expo": 1.6.11`, which are pinned exact because
they must move together.

## Rationale

Staging-only formatting was a deliberate correction, not the default: `.husky/pre-commit`
carries the comment "Run formatter on staged files only, so pre-existing issues elsewhere
in the repo don't block commits" and re-stages what it formats. **Inference:** Ultracite
replaces both tools because its preset bundles React, Next, and React Core rules behind one
config, which is what makes a single lint command viable across three apps — no repository
file argues this against eslint explicitly, but the absence of any `.eslintrc`,
`eslint.config.*`, or `.prettierrc` anywhere in the workspace is the evidence. The exact pins
in the catalog are the same reasoning as ADR-0003's exact Better Auth pin, applied at the
manifest level: a caret on a matched pair is a latent version skew.

## Consequences

**Accepts:**
- One tool, one config, one command (`pnpm check` / `pnpm fix`) for every surface,
  including React Native.
- Formatting cannot block a commit for unrelated pre-existing problems elsewhere.
- A single catalog edit changes a dependency everywhere; 88 `catalog:` references mean no
  app can quietly hold a different version.
- Editor and pre-commit agree, since `.vscode/settings.json` sets
  `editor.defaultFormatter` to `biomejs.biome` per language.

**Costs:**
- Catalog enforcement is opt-in per manifest. Nothing fails if someone writes
  `"zod": "^4.1.13"` instead of `"zod": "catalog:"` — the catalog is a convention, and
  `livekit-server-sdk` already drifts from it (`^2.15.4` in `apps/server/package.json` and
  `packages/api/package.json` against a catalogued `^2.13.0`).
- Ultracite's opinions are its own. `apps/native/app/_layout.tsx` and
  `packages/db/src/schema/index.ts` both carry `biome-ignore` suppressions, which is the
  cost of a preset written for the majority case.
- Pinning `@biomejs/biome` and `ultracite` exactly means no automatic patches for the linter
  itself.
- The catalog has no automated enforcement or upgrade tooling visible in the repo; a version
  bump is a hand edit to `pnpm-workspace.yaml`.

## Revisit when

A manifest dependency drifts from its catalog entry in a way that causes a bug rather than
noise, or Ultracite's React rules conflict with a React Native idiom that needs a permanent
suppression.
