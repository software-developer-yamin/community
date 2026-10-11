# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**This repo is single-context.** The `apps/*` and `packages/*` workspace members are
layers of one product (AceFluency), not separate bounded contexts, so there is one
glossary and one ADR directory at the root. If the codebase later grows genuinely
independent vocabularies, switch to multi-context and add a `GLOSSARY-MAP.md`.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If either file doesn't exist, **proceed silently**. Don't flag their absence; don't
suggest creating them upfront. The `/domain-modeling` skill (reached via
`/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when
terms or decisions actually get resolved.

## File structure

```
/
├── GLOSSARY.md
├── docs/
│   ├── adr/
│   │   ├── 0001-record-event-sourced-conversations.md
│   │   └── 0002-postgres-for-write-model.md
│   ├── agents/            ← these files
│   └── ...
├── apps/
│   ├── native/
│   ├── server/
│   └── web/
└── packages/
    ├── api/  auth/  config/  db/  env/  models/  ui/
```

Note: `docs/agents/` (this directory) is skill configuration, not product
documentation. Keep the two apart.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_