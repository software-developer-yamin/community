# AceFluency — Product Truth

<!-- impeccable:product-schema 1 -->

> Mobile-first English speaking practice app for South Asian learners.
> The "community" monorepo is a v2 rebuild.
>
> _This record was authored from codebase evidence only, with no user interview. Facts not directly confirmed by the repository are labeled `[inferred]`. Substitute a real interview before treating any `[inferred]` fact as confirmed._

## Platform

adaptive

The product ships two surfaces with genuinely different design languages: a React Native + Expo native app as the primary product surface, and a Next.js + shadcn/ui web admin as the operations surface. Each owns its own visual world; they are not one skin.

## Users

South Asian adults and young professionals who understand English grammar but lack confidence and practice partners for spoken fluency. Concentrated in Bangladesh and India. 4 out of 5 Bangladeshi individuals face spoken English fluency challenges `[inferred — cited stat, not re-verified in this audit]`.

Primary: learners practicing speaking. Secondary: moderators/hosts running voice clubs, and operators using the web admin for moderation, user management, content, and subscriptions.

## Product Purpose

AceFluency connects English learners — primarily in Bangladesh and India — for real-time voice practice so they can build spoken fluency through conversation, not textbooks. Success means a learner who could read English but not speak it confidently gains talk-time, consistent practice, and measurable progress through CEFR placement and pronunciation scoring.

## Positioning

Mechanism a neighboring product could not truthfully copy: LiveKit WebRTC voice calls that match co-learners for real 1:1 and group practice, paired with CEFR-based AI assessment, pronunciation scoring, and AI chat practice — built specifically for South Asian learners with local payment rails (SSLCommerz, Razorpay) `[inferred as positioning — repository confirms the components; the exact market claim is not]`.

## Operating Context

Learners practice on mobile, often on unstable South Asian mobile networks; call reliability and reconnection are product-critical, not nice-to-have. Typical session: queue → match → 1:1 call or voice club → post-call feedback → progression. Moderators and operators use the web admin alongside the live product. Rituals: daily streaks, talk-time tracking, level advancement `[inferred as ritual — progression tables exist in the schema; the exact streak cadence is not verified here]`.

## Capabilities and Constraints

### Core loops

1. **Practice Call** — User joins queue → matched with a co-learner → 1:1 voice call via LiveKit WebRTC → post-call feedback & pronunciation score.
2. **Voice Clubs** — User browses or creates topic-based rooms → joins group voice discussion → moderated by host.
3. **AI Assessment** — CEFR placement test → pronunciation scoring → personalized content recommendations → AI chat partner for solo practice.
4. **Progression** — Talk-time tracking → level advancement → streaks and engagement hooks.

### Surfaces

| Surface | Role | Tech |
|---|---|---|
| **Native App** (`apps/native/`) | Primary product. Where learners practice. | Expo 56, React Native 0.85.3, `react-native-unistyles`, `@livekit/react-native`, TanStack Query + oRPC |
| **Web Admin** (`apps/web/`) | Operations dashboard. Manage users, moderation, content, subscriptions. | Next.js 16 (App Router), React 19, shadcn/ui from `packages/ui` |
| **API Server** (`apps/server/`) | Shared backend for both surfaces. | Hono, oRPC, Bun runtime |

### Key Systems

- **Auth** — Better-Auth. Email/password today. Phone OTP and Google OAuth planned.
- **Voice** — LiveKit WebRTC. 1:1 calls and multi-participant rooms.
- **AI/ML** — CEFR placement, pronunciation scoring, content embeddings, recommendations, AI chat. Local model serving configured via `apps/server/docker-compose.models.yml`.
- **Moderation** — Strikes, cooldowns, suspensions, bans. Automated + manual review.
- **Support** — In-app ticket system.

### Tech Stack

TypeScript end-to-end. Drizzle ORM + PostgreSQL. Turborepo monorepo with pnpm 10.9.0. Ultracite 7.8.1 / Biome 2.4.15 for lint/format. Husky for git hooks. TailwindCSS for styling. Playwright 1.61.0 for E2E tests. Local LiveKit via Docker Compose at `docker/livekit`.

### Packages

| Package | Purpose |
|---|---|
| `packages/api` | oRPC router definitions |
| `packages/auth` | Better-Auth config shared across surfaces |
| `packages/config` | Shared configs (TypeScript, Tailwind, etc.) |
| `packages/db` | Drizzle schema, migrations, queries |
| `packages/env` | Environment variable validation |
| `packages/models` | Shared TypeScript types/models |
| `packages/ui` | shadcn/ui component library (web) |

### Dev Ports

- API: `localhost:3000`
- Web: `localhost:3001`

### Business Model

Freemium subscription:

- **Free tier** — Limited daily talk time, basic features.
- **Premium tiers** — Unlimited calls, priority matching, advanced AI features, club creation.
- **Payment providers** — SSLCommerz (Bangladesh), Razorpay (India). _Not yet integrated._

## Brand Commitments

- Product name: **AceFluency**. Repository name: `community` (v2 rebuild).
- No confirmed visual brand assets in-repo yet `[inferred — no logo, palette, or typography commit was found in this audit]`.
- Voice is treated as the product — voice quality and call reliability are non-negotiable.
- Moderation must be fair and transparent; users should understand why they are suspended.

## Evidence on Hand

- Live API routers for the four core loops (`packages/api`, `apps/server/src`) — ~90% complete.
- Drizzle schema covering users, calls, clubs, assessment, moderation, support, progression (`packages/db`) — ~90% complete.
- Native surface scaffolding: Expo Router `app/`, `theme.ts`, `unistyles.ts`, `breakpoints.ts`, LiveKit RN integration — core flows (queue, onboarding, call controls, settings) still missing.
- Web admin at ~40% (Next.js 16 + shadcn/ui primitives from `packages/ui`).
- Local AI model stack via `apps/server/docker-compose.models.yml`.
- Play Store reviews documenting real user pain (call drops, login bugs, slow support, unfair suspensions, billing confusion).
- _Absences future work must not fabricate_: no live testimonials, no published case studies, no pricing page, no integrated billing flow, no completed test suite (~5% coverage).

## Current State (as of 2026-06-14)

~60-70% complete overall.

**Strong:** Infrastructure (95%), DB schema (90%), API routers (90%), moderation (75%).

**Gaps:** Billing/payments (30%), testing (5%), native UI missing core flows (queue, onboarding, call controls, settings), no phone OTP/Google OAuth, web admin at 40%.

`[inferred — these percentages are carried from the prior PRODUCT.md; not recomputed in this codebase audit]`

## Known User Pain Points (from Play Store reviews)

- Call disconnections and network instability
- Login and account access bugs
- Slow or absent support responses
- Account suspensions for disconnecting calls (perceived as unfair)
- Subscription/billing confusion

## Product Principles

1. **Voice is the product.** Anything that degrades call quality or reliability on South Asian mobile networks must be treated as a P0.
2. **Native app is primary; web admin serves it.** Decisions for the web admin must not force the native app to bend.
3. **Practice over polish.** The killer metric is real talk-time and progression, not surface aesthetics.
4. **Fair and transparent moderation.** Users must understand strikes, cooldowns, and suspensions — especially when disconnects are not their fault.
5. **Local-first rails.** SSLCommerz and Razorpay are not optional integrations; they are the path to monetization in this market.

## Accessibility & Inclusion

`[inferred — no confirmed WCAG conformance level or accessibility commitment was found in the repository. Treat as open until confirmed.]`