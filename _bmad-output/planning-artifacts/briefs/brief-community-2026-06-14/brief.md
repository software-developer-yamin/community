---
title: "Product Brief: AceFluency — Practice English with Peers"
status: ready
created: 2026-06-14
updated: 2026-06-14
---

# Product Brief: AceFluency — Practice English with Peers

## Executive Summary

AceFluency is a peer-to-peer English-speaking practice app for South Asian learners, primarily targeting Bangladesh where 4 of 5 adults report spoken-English fluency anxiety. The product pairs learners for short, structured voice conversations (10–25 minutes), matches them with the right partner by level and intent, and gets out of the way of the actual practice. It is not a lesson app, not a teacher marketplace, not a content feed — it is the gym for spoken English: a place to show up, talk to a real person, and leave measurably better than you arrived.

This rebuild exists because the current build has earned sustained 1- and 2-star reviews (12+ of 50+ sampled) over a single, repeating failure pattern: **the technology fails the user at the moment the user is most motivated.** Calls drop on network hiccups. Auth loops users back to login. A disconnect counter punishes users for leaving a bad call. The gender filter is purchased but not enforced. The subscription auto-renews and there is no in-app escape. The rebuild exists to make every one of those failure moments stop, and when they still happen, handle them visibly — not silent, not punishing, not a three-day wait for an email reply.

## Why Now

The product has been live for two years and accumulated a user base that wants to practice. The reviews are not from people who hate the concept — they are from people who *paid* and got locked out, dropped, or ignored. The window to recover this trust is narrow: every 1-star review is a permanent public signal, and every auto-renew chargeback is a user who will never return.

The timing is right because:
- The infrastructure is already wired (LiveKit token mint, Better-Auth, Drizzle schema, Expo + Next.js). The rebuild is a UX and reliability layer, not a greenfield build.
- The review pattern is *concentrated* — 12 reviews cite the same six failures. Fixing six things closes the majority of the complaint surface.
- The team is small (3–4 engineers) and can move fast on a focused scope. The rebuild is 14–16 weeks (Phase 1 + Phase 2), not a year-long rewrite.

## The Problem

The status quo for spoken English practice in Bangladesh and India is expensive tutoring, passive app consumption, or no practice at all. Learners who try AceFluency hit a wall of technology failures that turn motivation into frustration:

- **Calls drop on 1-second network blips** — users on Bangladeshi/Indian cellular networks lose the call and have to re-queue, re-match, and restart the conversation.
- **Auth loops users back to login** — users who paid for premium cannot reliably reach the product because sessions expire unpredictably and token refresh fails silently.
- **The disconnect counter punishes users for leaving bad calls** — a user who ends three calls because partners won't speak gets a 48-hour calling ban. The only way to avoid a strike is to stay in a bad call.
- **Paid features don't work** — users who pay for gender filtering are still matched with the wrong gender, and then punished for disconnecting.
- **No transparency on billing** — users cannot see their renewal date, cannot cancel auto-renew in-app, and cannot request a refund when the product doesn't work.
- **Support is a black hole** — emails go unanswered for 3–5 days with no ticket ID and no acknowledgment.

The cost of the status quo is churn, 1-star reviews, chargebacks, and a brand that promises "practice English" but delivers "fight the app."

## User Voice

These are real quotes from Play Store reviews (March–May 2026), not invented personas:

> *"Whenever there is a very brief network disturbance (just 1 second), the call gets disconnected completely. Although my network reconnects immediately, the call does not resume automatically."* — **Vemireddy**, 24 March 2026

> *"I'm facing issues with the login and authentication since 1 week. Once the app is logged in it should automatically redirect user to home page, but every time need login credentials. I took subscribtion model, what's the use if a connot have experience with it."* — **Tahiniyath**, 30 April 2026

> *"Very poor experience with Ace Fluency. I took a subscription to improve my speaking skills, but the app keeps connecting me with the same users and there are very few serious learners. If I cancel calls due to poor matching, my account gets penalized or suspended. My account was suspended for 2 days despite being a premium user. Subscription auto-renewed, and no refund was provided."* — **Sumit**, 27 April 2026

> *"This app has a serious problem. It is supposed to help people practice English speaking, but if we disconnect a few calls because the conversation is not good, the app blocks the account. Sometimes after cutting 3–5 calls, the account becomes temporarily deactivated and we must wait for 2 days. This is unfair because the purpose of the app is practice."* — **D Mail**, 12 March 2026

> *"There is no quick response from the support team, even for a minor issue. i have to wait for 3 to 5 days. Every application team focuses on the support team because this is the first face of any application that accommodates the users."* — **Muhammad Ayaan**, 11 April 2026

> *"I have been using this app for 2 years...I took a subscription to improve my speaking skills, but the app keeps connecting me with the same users and there are very few serious learners."* — **Sumit**, 27 April 2026

## The Solution

AceFluency rebuilds the core experience around one principle: **the technology serves the practice, not the other way around.**

- **Reliable calls on flaky networks** — LiveKit Cloud handles ICE restart for 1–5s blips silently, and shows a calm "reconnecting" state for longer blips. Calls only end when a user explicitly ends them.
- **Session that never interrupts** — persistent auth with expo-secure-store on native, httpOnly cookies on web, silent token refresh, and graceful handling of reinstall.
- **A Skip button that replaces punishment** — users can end a bad call without a strike, return to the queue, and find a better partner. The graduated strike system only warns users who repeatedly disconnect without using Skip.
- **Honest matchmaking** — the gender filter is enforced or the system says "no matches available" rather than violating the user's preference. Match wait times are transparent.
- **Transparent billing** — users can see their plan, renewal date, and auto-renew status in-app. Cancellation preserves access until period end. Refunds are auto-approved for clear-cut cases (≥3 crashes in 7 days, zero completed calls within 14 days).
- **In-app support with ticket ID** — users submit issues from the app, get a ticket ID, and see an SLA-bound first-response estimate.

## What Makes This Different

The differentiation is unflattering but real: the category is full of apps that promise "AI tutors" and "fluency in 30 days" and lose to one that *just keeps the call connected and lets two people finish a sentence.*

- **Honest failure modes** — when the pool is empty, the system says so. When a filter can't be honored, the system doesn't bypass it.
- **Punishment-free rejection** — the Skip button lets users leave bad calls without strikes, which is a first-class feature, not a hidden workaround.
- **Transparent moderation** — users can see their own account standing and understand why, instead of discovering a ban through a locked screen.
- **Refund as a feature, not a fight** — clear auto-approval rules for refunds, not a 7-day email chain.
- **No gamification** — no streaks, badges, or achievement animations. Adult learners don't need to be tricked into showing up.

## Competitive Landscape

| Competitor | What they do | Why we don't compete |
|---|---|---|
| **HelloTalk / italki** | 1:1 professional tutoring from native speakers | AceFluency is peer-to-peer, not a teacher marketplace. Users practice with other learners, not with paid tutors. |
| **Duolingo / Babbel** | Structured curriculum, gamified lessons | AceFluency assumes the user already has a baseline and wants reps, not lessons. No gamification, no streaks. |
| **Corporate training platforms** | B2B English training for companies | Out of scope for v1. The product is consumer-first. |
| **Native speaker apps** | English speakers learning Bangla/Hindi | Matching is uni-directional: both partners practice English. |

**The real competition is not other apps — it is the user's decision to give up on practicing.** The product wins by removing friction, not by adding features.

## Who This Serves

**Primary: The Commuter Learner**
- **Who:** Adults in Bangladesh and India (ages 20–40) who need spoken English for career advancement, travel, or social confidence.
- **Device:** Low-end Android (Pixel 4a equivalent) on Bangladeshi/Indian 4G.
- **Context:** Commuting, intermittent connectivity, 10–25 minutes per session.
- **Need:** Practice with a real person at their level, without scheduling friction or per-minute cost.
- **Success:** Completes 3+ calls in the first week, returns for a second week.

**Secondary: The Premium Filter User**
- **Who:** Users who pay for gender filtering or priority matching.
- **Need:** A product that honors the features they paid for.
- **Success:** The filter works, or the system is honest about why it can't.

**Non-Users (v1):** Learners seeking 1:1 professional tutoring, structured curriculum, or corporate training. Native English speakers looking to learn Bangla/Hindi.

## Success Criteria

- **Auth reliability:** ≥99% first-attempt success rate (login → home screen). ≥95% within 3 attempts.
- **Cold-start time:** p95 ≤ 2.5s on a mid-range Android device.
- **Call resilience:** 1s blip → resume ≥95%. 5s blip → resume ≥80%.
- **Match wait time:** p95 ≤ 45s (unfiltered), ≤ 90s (gender-filtered).
- **Gender filter violation rate:** 0%.
- **False-positive strike rate:** ≤ 1%.
- **Refund auto-approval:** ≥3 crashes in 7 days or zero completed calls in 14 days → approved within 24 hours.
- **Support SLA:** p95 ≤ 24h (paying), ≤ 72h (free).
- **D7 retention:** ≥50% for users who complete ≥3 calls in the first week.
- **Auto-renew cancellation completion rate:** ≥95%.
- **Disconnect-during-call rate:** ≤5%.

## Scope

**In (v1 / this rebuild):**
- Phone OTP + Google OAuth authentication
- Persistent session with secure storage and silent refresh
- 1:1 voice calls via LiveKit Cloud with ICE restart and full reconnection
- Matchmaking queue with CEFR-based matching and honest timeout states
- Skip button (strike-free call end)
- Graduated strike system with visible moderation state
- Gender filter enforcement (premium)
- Native language field (onboarding)
- Subscription management with auto-renew visibility and cancellation
- In-app support tickets with ticket ID and SLA
- Refund mechanism with three-path decision rule
- Post-call rating (1–5 stars + optional comment)
- Regression: existing features (Voice Clubs, AI Speaking Test, Recorded Courses, Tutor Marketplace, Drama Tab, Daily Speaking Streaks, Friend Graph / Communities) continue working

**Out (v1):**
- Native speaker tutoring (teacher marketplace exists but is not rebuilt)
- Structured curriculum or lesson content
- Video calls
- Group calls beyond Voice Clubs (existing feature)
- Corporate / B2B training
- Advanced AI conversation partner (AI Speaking Test exists but is not rebuilt)
- Multi-language practice beyond English

**Deferred:**
- Real-time queue via WebSocket (polling every 15s for v1)
- Self-hosted LiveKit (Cloud for v1)
- Advanced matching algorithm beyond CEFR + embedding similarity

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **LiveKit Cloud connectivity in Bangladesh** | Medium | High | Cloud has global edge nodes; test with BD users in beta. Fallback to self-hosted is architected but not built. |
| **SSLCommerz refund API reliability** | Medium | High | Retry 3 times over 24h before falling to human review. Fallback to human-review path is the safety net. |
| **Support SLA unstaffed** | High | Medium | Measure SLA compliance even if team is offline; separate "did we respond" from "is team staffed." AI-assisted tier-1 as fallback. |
| **Gender filter starves queue** | Medium | Medium | Log "would-have-matched-but-filter-rejected" events. Offer filter-drop option after 5min. Never auto-bypass. |
| **India payment provider delay** | Medium | Medium | Phase 1 ships BD-only. India (INR/UPI) is Phase 2 gated on PSP selection. |
| **Low-end Android performance** | Medium | Medium | Target Pixel 4a equivalent. Test cold-start, backgrounding, and reconnection on real devices. |
| **Skip button abuse** | Low | Medium | 5-second cooldown between skips. After 3 skips in a session, show a UX nudge (not a strike). |

## Vision

If this succeeds, AceFluency becomes the default place for South Asian adults to practice spoken English — not because it has the most features, but because it is the most reliable. In 2–3 years, the platform expands to:
- Additional languages (Hindi, Bangla, Tamil, Telugu practice)
- Structured conversation prompts and role-play scenarios
- Community features that build long-term relationships, not just one-off calls
- Regional expansion to Pakistan, Sri Lanka, and Southeast Asia
- Optional tutoring marketplace integration (native speakers for users who want structured feedback)

The long-term vision is a **global practice network** where language learners at every level can find a partner, have a reliable conversation, and build confidence through repetition — the same way a gym builds physical fitness.

---

*Brief finalized: 2026-06-14*
*Status: ready*
*Source: PRD (AceFluency — Practice-English-with-Peers Rebuild), Epics, Architecture, UX Design, Play Store Reviews*
*Author: Yamin (facilitated by Sisyphus)*
