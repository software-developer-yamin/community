# AceFluency Native — Product Truth (surface override)

<!-- impeccable:product-schema 1 -->

> This file overrides the root `PRODUCT.md` for the native app surface only. It inherits everything in the root file except the sections below, which record a 2026-07-30 scope decision: the native app rebuild now targets the **full consumer-social product** (the historical AceFluency feature set, see `docs/screenshots.md`), not the narrower v1 slice previously scoped in `_bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/EXPERIENCE.md`.

## Scope decision (supersedes prior v1 deferrals)

The prior UX spec (`_bmad-output/.../EXPERIENCE.md`) explicitly marked the following **out of scope for v1**: Voice Clubs, AI conversation partner, Friend list/re-match, Video call, iOS-specific polish, in-app paywall A/B testing, Bangla UI strings, biometric unlock. That deferral is **superseded** for this rebuild — confirmed by the product owner 2026-07-30. The rebuild's target surface area is the full historical app:

- Live voice rooms (Clubhouse-style: host/speaker/listener, raise hand, moderation)
- Trainer marketplace (1:1 booking, profiles, availability, ratings)
- Recorded video courses + audio courses/podcasts, leveled (Beginner/Intermediate/Advanced)
- Gamification (streaks, stars, achievements, leaderboard)
- Social (friends, communities, messaging)
- AI speaking test (topic bank, timed recording, CEFR/grammar/vocabulary scoring, error correction)
- Full subscription/paywall system (multi-tier, multi-currency: BDT/INR/USD rails already evidenced in `docs/screenshots.md`)
- Vocabulary, translator, daily news modules
- Full support system (FAQ, tickets, WhatsApp counsellor pattern)

Bangla UI strings remain deferred (English-only v1, per root `PRODUCT.md` Operating Context) unless the product owner states otherwise.

## Brand commitment: reference constellation (standing preference)

Per explicit product-owner brief (2026-07-30), the native app's visual and product register is calibrated against this named constellation, synthesized into one coherent world (not five pasted-together looks) — see `DESIGN.md` "Golden Hour Studio" for the resolved system:

- **Duolingo** — gamified warmth, streaks, rounded confidence, celebration.
- **Cambly / italki** — trust-building tutor marketplace: ratings, availability, verified profiles.
- **Clubhouse** — live voice-room social register (dark stage, presence, raise-hand).
- **MasterClass** — premium spotlight register for Pro/paywall and course-detail moments.
- **AI speaking coach** — gradient/waveform vocabulary for AI touchpoints.

This is a standing preference: new screens and flows should default to this constellation's craft level rather than plain platform defaults, until the product owner records a different standing preference.

## Design system override

`apps/native/DESIGN.md` ("Golden Hour Studio") governs this surface and **replaces** the root `DESIGN.md`'s "Quiet Studio" system for native only. `apps/web` (admin) is unaffected and keeps Quiet Studio — the two surfaces are confirmed to diverge further under this decision, consistent with root `PRODUCT.md`'s existing "adaptive" platform stance ("each surface owns its own visual world").

## Everything else

Inherit root `PRODUCT.md` unchanged: users, positioning, operating context, core loops (Practice Call, Voice Clubs, AI Assessment, Progression — now first-class rather than partially deferred), tech stack, business model, product principles (voice is the product; fair moderation; local-first payment rails), and current-state completion estimates. Those percentages will shift materially once `ARCHITECTURE.md`'s roadmap lands — re-audit after Phase 1 of that roadmap ships.
