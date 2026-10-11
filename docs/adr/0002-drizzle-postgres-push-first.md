# 0002. Drizzle ORM on Postgres, with `db:push` as the day-to-day schema workflow

**Status:** Accepted
**Date:** 2026-10-11
**Evidence:** packages/db/src/index.ts, packages/db/drizzle.config.ts, packages/db/package.json, packages/db/src/migrations/meta/_journal.json, README.md

## Context

Every surface writes to the same database: the native client reaches it through the server's
oRPC routers, and the admin panel writes through `adminProcedure` handlers in
`packages/api`. The schema is not small — `packages/db/src/index.ts` registers fourteen
tables spanning auth, calls, subscriptions, moderation, and pgvector embeddings. A schema
change therefore has to be reflected identically in three places at once, and the team needed
a workflow that makes "I changed a column" a fast loop rather than a migration-authoring
exercise. Both `db:push` and `db:migrate` exist as scripts in `packages/db/package.json`,
so the choice between them is real rather than hypothetical.

## Decision

The data layer uses Drizzle ORM (`drizzle-orm: ^0.45.1`) against PostgreSQL over the
`node-postgres` driver, configured in `packages/db/src/index.ts` as
`drizzle(env.DATABASE_URL, { schema: {...} })`. Schema files live in `packages/db/src/schema/`
and are re-exported through `packages/db/src/schema/index.ts` for the Better Auth adapter.
Day-to-day schema sync is **push-based**: `packages/db/package.json` maps `db:push` to
`drizzle-kit push`, and `README.md` instructs that as the setup step. Generated migrations
are also kept — `packages/db/src/migrations/meta/_journal.json` records three entries
(`0000_sturdy_medusa`, `0001_lovely_pyro`, `0002_magical_wilson_fisk`) — and
`_bmad-output/project-context.md` records the split explicitly: `db:push` for development,
`db:generate` + `db:migrate` for production. Postgres runs locally from
`packages/db/docker-compose.yml` (`db:start` / `db:stop`).

## Rationale

Push wins in development because Drizzle infers DDL from the TypeScript schema, so the
edit loop is one file and no migration file — the divergence between "what the schema says"
and "what the database says" is closed by construction. Migrations are still generated
because `0002_magical_wilson_fisk.sql` contains `CREATE EXTENSION IF NOT EXISTS vector` and
HNSW indexes, which is the kind of statement a dev-local push cannot be trusted to reproduce
identically on a production database. **Inference:** the presence of a three-entry journal
alongside a push-first README indicates the team runs both paths deliberately rather than
having abandoned migrations; no file in the repository states this.

## Consequences

**Accepts:**
- A schema edit is a TypeScript edit; there is no separate artifact to keep in sync during
  feature work.
- Types flow from the schema into the routers without a codegen step — `packages/api`
  routers import `callRoom` and `callRecord` directly and use their columns in `where`
  clauses.
- pgvector embeddings are first-class: `vector("embedding", { dimensions: 384 })` in
  `packages/db/src/schema/recommendations.ts` with HNSW cosine indexes from migration `0002`.
- Both admin and learner paths hit one schema object, so a column rename cannot land on one
  surface only.

**Costs:**
- Two schema-application paths exist, and a developer who only ever runs `db:push` will never
  produce the migration that production needs. Nothing in the repo enforces generating one.
- `drizzle.config.ts` reads `DATABASE_URL` from `../../apps/server/.env` via a relative path,
  so running any Drizzle Kit command from a different working directory silently targets an
  empty connection string rather than failing loudly.
- `packages/db/docker-compose.yml` uses an unpinned `image: postgres`, so a fresh clone can
  pull a Postgres major version the schema has never been run against.
- Push is a local-development primitive; there is no recorded rollback story for production.

## Revisit when

The fourth generated migration arrives with a data-migration statement (an `UPDATE` or a
backfill) rather than DDL, or a second datastore is introduced alongside Postgres.
