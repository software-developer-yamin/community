# Archived — native surface override

**Archived:** 2026-10-11
**Reason:** the root `PRODUCT.md` + `DESIGN.md` pair is the single source of truth for every
surface. Per-surface overrides were retired to remove a source of drift.

## What these were

| File | Was |
|---|---|
| `PRODUCT.md` | A surface override for `apps/native`, created 2026-07-30. It claimed to supersede the root `PRODUCT.md` scope for the native app and widen it to the full consumer-social product — voice clubs, trainer marketplace, recorded courses, gamification, social. |
| `DESIGN.md` | A 19 KB native-specific design system, generated 2026-07-08. |
| `surface-apps-native.md` | The Impeccable surface manifest at `apps/native/.impeccable/surfaces/apps-native.md`, which caused the Impeccable launcher to prefer these files over the root pair for `--target apps/native`. |

## Why archived

Two sources of truth for one product had drifted apart. The root `PRODUCT.md` recorded a
narrow v1 slice dated 2026-06-14; the native override recorded a widened scope dated
2026-07-30. Neither pointed at the other, so a reader landing on the root file silently
missed the newer decision.

The root pair won. The widened scope it described — trainer marketplace, voice clubs,
recorded courses, gamification, social — is not discarded; it survives as planned work in
`_bmad-output/implementation-artifacts/sprint-status.yaml` under the `epic-native` phase
breakdown (`native-phase-2` through `native-phase-6` are all `backlog`). If that scope is
confirmed, fold it back into the root `PRODUCT.md` so the scope and the backlog agree again.

## Restoring

If the widened native scope turns out to be the intended one, do not just move these files
back. Merge the scope section into the root `PRODUCT.md`, then either regenerate the native
design system from the merged record or keep `DESIGN.md` here and cite it explicitly as the
native-specific companion. Two truths for one product is what caused the drift.