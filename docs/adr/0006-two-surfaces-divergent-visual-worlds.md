# 0006. Native app as the product, web admin as operations, sharing one contract but not one visual world

**Status:** Accepted
**Date:** 2026-10-11
**Evidence:** PRODUCT.md, DESIGN.md, apps/native/theme.ts, packages/ui/package.json, apps/native/components/ui/button.tsx, docs/archives/native-surface-override/README.md, apps/web/src/app/admin/page.tsx

## Context

The repository builds two user-facing surfaces — an Expo app and a Next.js admin — and they
face opposite constraints. The learner surface is voice-first, gamified, and needs a
persistent "live" register that stays dark regardless of system theme. The operator surface
is a dense moderation and content console where the right answer is quiet, scannable
monochrome. Forcing one component library or one token set across both would make one of them
wrong. The open question is where the line sits: which parts must be shared, and which must
diverge?

## Decision

`apps/native` is the primary product surface and `apps/web` is the operations surface; they
share the API contract and auth but **not** a design system. The native app carries its own
tokens in `apps/native/theme.ts` — a warm-neutrals "Learn" mode and a dark "Stage" mode for
live contexts, with a violet-to-coral practice gradient — wired through
`react-native-unistyles` in `apps/native/unistyles.ts`, and its own component library under
`apps/native/components/ui/` (21 components: `waveform-visualizer.tsx`,
`circular-timer.tsx`, `star-rating.tsx`, `radio-tile.tsx`, and so on) that exist nowhere
else. `packages/ui` is web-shaped: shadcn/`base-lyra` components, Tailwind v4 tokens in
`src/styles/globals.css`, and `next-themes` — imported by 26 files under `apps/web` and by
exactly one component in `apps/native` (`token-refresh-provider.tsx`). The web admin's route
tree under `apps/web/src/app/admin/` (`users`, `content`, `analytics`) is scoped to operator
tasks rather than mirroring any native screen.

## Rationale

The divergence is a decision, not an accident: `PRODUCT.md` states the surfaces "own [their]
own visual world; they are not one skin," and `apps/native/ARCHITECTURE.md` marks existing
screens `[REBUILD]` precisely because they are still Quiet Studio. Keeping a shared component
package for React-but-not-native components would have meant an abstraction layer that
forgave nothing — a `Button` that is correct for an operator table and wrong for a gamified
streak chip. **Inference, and this one is contradicted by the current working tree:** the
repo previously carried a native surface override (`PRODUCT.md` + `DESIGN.md`, now at
`docs/archives/native-surface-override/`); `docs/archives/native-surface-override/README.md` records that they were archived
on 2026-10-11 because two sources of truth had drifted. So the *code-level* divergence stands
(`theme.ts` still implements Golden Hour Studio) while the *documentation* has been
deliberately reconsolidated onto the root `PRODUCT.md` + `DESIGN.md` pair.

## Consequences

**Accepts:**
- Each surface can use the platform idiom that suits it — Tailwind and CSS variables for
  the dense admin tables, Unistyles and a dark "Stage" theme for live voice.
- Native-only components like `waveform-visualizer` and `circular-timer` have no web
  equivalent to contort around.
- One shared contract (`packages/api`, `packages/auth`) carries the behaviour both surfaces
  depend on, so divergence stays visual rather than semantic.

**Costs:**
- `packages/ui` is nearly dead weight for native. It is a web dependency — `react-dom`,
  `next-themes`, Tailwind — carried into `apps/native/package.json` for a single provider, and
  it is the one place the two worlds touch without a reason.
- Any genuinely cross-cutting primitive (a date picker, an accessible dialog) must be built
  twice, and the two copies drift.
- With the surface overrides archived, `apps/native/theme.ts` and `apps/native/unistyles.ts`
  now implement a design system whose written specification no longer sits next to them — the
  root `DESIGN.md` describes Quiet Studio, which native has replaced. `apps/native/ARCHITECTURE.md`
  still refers to screens being rebuilt "in Golden Hour Studio."
- The web admin has no dedicated design-system file of its own, so its tokens are whatever
  `packages/ui/src/styles/globals.css` currently holds.

## Revisit when

A second shared component appears in both surfaces, or the archived native design system is
either deleted outright or merged into the root `DESIGN.md` — the latter is the
documented recommendation in `docs/archives/native-surface-override/README.md`.
