# Surface map — AceFluency rebuild

> Derived from named-protagonist journeys (Sumit, Tahiniyath, Vemireddy, Hari, Mridu) + PRD FR-1..FR-27. Source: `.decision-log.md` D-IA (2026-06-10).

## Visible surfaces (13)

| # | Surface | Platforms | Lands here | Primary PRD refs |
|---|---|---|---|---|
| S1 | Cold-start / Home | Native, Web | Tahiniyath, Mridu, Vemireddy return | FR-1, FR-2, FR-7, FR-17 |
| S2 | Onboarding (phone OTP, profile, native-lang, CEFR) | Native-first, Web | New User (deferred) | FR-3, FR-4, FR-9 |
| S3 | Matchmaking queue | Native | Sumit, Vemireddy, Hari | FR-8, FR-9, FR-10, FR-11 |
| S4 | Call screen (composes S13 in-call + S14 network) | Native | All 5 protagonists | FR-5, FR-6, FR-7, FR-12, FR-17 |
| S5 | Call-ended screen | Native | Sumit, Vemireddy, Tahiniyath | FR-7 |
| S6 | Post-call rating | Native | Every call | OQ-7, FR-7 |
| S7 | Settings (account, sub, moderation, tickets, language) | Native, Web | Mridu | FR-13, FR-14, FR-16, FR-19 |
| S8 | Subscription detail | Native, Web | Mridu | FR-14, FR-15 |
| S9 | Refund request flow | Native, Web | Mridu | FR-20 |
| S10 | Support ticket form + My tickets | Native, Web | Mridu | FR-16 |
| S11 | Account standing (visible moderation) | Native, Web | Sumit warning, Warned User | FR-13 |
| S12 | Auth (sign-in / sign-up / phone OTP / Google OAuth) | Native, Web | Tahiniyath historical, Reinstaller | FR-1, FR-2, FR-3, FR-4, FR-19 |
| S16 | Pricing / paywall (tier comparison, in-app purchase entry) | Native, Web | Mridu implicit | FR-14, FR-15, FR-20, BDT/INR dual |

## Composed into S4 (not separate)

- **S13.** In-call affordances — Mute, Skip, Report, End. Always visible. Skip = first-class (FR-11 dependency).
- **S14.** Network-status banner — "Reconnecting…" / "Connection lost" / signal-strength pill. Visible to affected user; partner sees silent indicator only.

## Named-deferred (cast named, surfaces pre-mapped, full walks at Finalize follow-up)

- **New User** → S2 first; lands on S1 home after.
- **Warned User** → lands on S11 (cooldown-until-X) when re-entering app; redirected to S1 with banner.
- **Reinstaller** → S12 (sign-in with same email/phone) → S1 (full restore).
- **In-call micro-journey** → S4 composed. Mute / Skip / Report / End transitions. Spine names these but defers the full step-by-step to Finalize.

## Explicit non-surfaces (v1)

- Voice Clubs (group rooms) — PRD §5.
- AI conversation partner — v2.
- Friend list / re-match — v2.
- Push re-engagement — v2 (PRD OQ-4).
- Video call — v1 voice-only.
- iOS-specific native polish — Expo default.
- In-app paywall A/B testing — v2.
- Bangla UI strings — v1.1 (i18n slot reserved).
- Biometric unlock — FR-1 v2.

## IA closure

- Every PRD FR-1..FR-20, FR-17..FR-19 → at least one surface.
- Every visible surface → at least one named-protagonist journey that lands there.
- No orphan needs, no orphan surfaces.
