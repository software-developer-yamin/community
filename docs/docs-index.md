# AceFluency Project Documentation Index

**Purpose:** This index catalogs all project documentation, provides quick-reference summaries, and maps docs to PRD sections and validation findings.

**Last updated:** 2026-06-13

---

## Documentation Inventory

| Document | Type | Purpose | Used By |
|----------|------|---------|---------|
| `about.md` | Marketing copy | Product description, target audience, key features | PRD §1 (Vision), PRD §2.2 (Non-Users) |
| `livekit.md` | Technical reference | LiveKit SDK docs, connection patterns, reconnection strategies | PRD §4.2 (Call Reliability), Addendum §A |
| `ratings-and-reviews.md` | Primary signal source | 50+ Play Store reviews with user complaints | PRD §2.3 (User Journeys), §9 (Assumptions) |
| `screenshots/` | Visual reference | UI screenshots of the live app | PRD §4.5 (Billing), Addendum §H |

---

## `about.md` — Product Marketing Summary

**Key claims:**
- Target audience: Bangladeshi learners ("4 out of 5 individuals face challenges with spoken English fluency")
- Core value: Peer-to-peer English speaking practice
- Features: 1:1 conversations, Voice Clubs, structured courses, AI features
- Positioning: "Gym for spoken English" — practice, not lessons

**PRD references:**
- §1 Vision: Uses the "4 of 5 adults" anxiety claim (flagged in §9 as unverified)
- §2.2 Non-Users: Corporate/B2B explicitly excluded, matching the product's consumer focus

**Validation note:** The "4 of 5" statistic is sourced from `about.md` but not independently verified. Consider adding a research task to validate this claim before using it in investor materials.

---

## `livekit.md` — Technical Reference Summary

**Key sections for this project:**

### Connection & Reconnection
- LiveKit handles network changes automatically (WiFi → cellular, ICE restart)
- `Room.disconnect()` terminates cleanly; 15s timeout if unclean
- `Reconnecting` → `Reconnected` events for UI state management
- ICE restart path: UDP → TURN/UDP → TCP → TURN/TLS (fallback chain)

### Mobile SDKs
- **Expo:** `npm install @livekit/react-native @livekit/react-native-webrtc livekit-client`
- **React Native:** Session API for 1:1 agents (recommended)
- Permissions: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` on iOS

### LiveKit Cloud
- Global mesh SFU (users connect to nearest edge)
- 99.99% uptime SLA
- BD/IN border roaming is a known use case
- TURN servers with TLS maintained by LiveKit Cloud

### Relevant for PRD §4.2
- FR-6 reconnection strategy: ICE restart is the right path (not fresh token/new Room)
- FR-5 room lifecycle: Rooms auto-close after last participant leaves
- 1s blip recovery: LiveKit SDK handles this automatically via ICE restart

**PRD references:**
- §4.2 FR-6: "Reconnection uses LiveKit's ICE-restart path, not a fresh token / new Room"
- §4.2 FR-7: "Your partner left" vs. "Connection lost" distinction
- §8 OQ-6: LiveKit Cloud resolved (2026-06-09)

---

## `ratings-and-reviews.md` — User Pain Signal Analysis

### Review Cluster Summary (by complaint type)

| Category | Count | Severity | PRD Response |
|----------|-------|----------|--------------|
| **Network disconnects** | 8+ | High | FR-6 (reconnection), FR-7 (explicit end states) |
| **Login/session issues** | 6+ | High | FR-1 (persistent session), FR-2 (silent refresh), FR-3 (phone OTP) |
| **Account bans (strikes)** | 5+ | Critical | FR-11 (graduated strikes), FR-12 (victim/aggressor), FR-21 (Skip button) |
| **Gender filter not working** | 3+ | High | FR-8 (gender filter with empty-pool fallback) |
| **Support no response** | 6+ | High | FR-16 (in-app tickets with SLA) |
| **Auto-renewal / refunds** | 4+ | Critical | FR-14 (visible subscription), FR-15 (cancellation), FR-20 (refund) |
| **App crashes / freezes** | 4+ | Medium | FR-17 (backgrounding), FR-18 (crash resilience) |
| **Reinstall issues** | 2+ | Medium | FR-19 (reinstall preserves account) |
| **Call quality (audio)** | 4+ | Medium | FR-6 (NFRs: 400ms p95 round-trip) |
| **Positive reviews** | 10+ | — | Validates product-market fit; note: many positive reviews are from 2021–2023 |

### Named Personas in PRD

| UJ | Name | Review Date | Complaint | PRD Section |
|----|------|-------------|-----------|-------------|
| UJ-1 | Sumit Upase | 27 Apr 2026 | Suspended for canceling bad matches, auto-renewed, no refund | §2.3 UJ-1 |
| UJ-2 | Tahiniyath Shereen | 30 Apr 2026 | Login loops, session expires constantly | §2.3 UJ-2 |
| UJ-3 | Vemireddy Paddhu | 24 Mar 2026 | 1s blip disconnects, no auto-resume | §2.3 UJ-3 |
| UJ-4 | Hari Krishna | 6 May 2025 | Paid for gender filter, matched with males, blocked | §2.3 UJ-4 |
| UJ-5 | Mridu Kant Das Guru | 24 May 2024 | Subscription stopped working, no refund, screenshots as proof | §2.3 UJ-5 |

### Additional Reviewers Referenced
- **D Mail** (12 Mar 2026): 3–5 disconnects → 2-day ban (FR-11)
- **Riyal Tank** (17 Dec 2025): Same pattern — cut call 3–5 times → account deactivated
- **Imteyaz Asgar** (24 Jan 2026): Long connection time, gender filter empty pool, auto-logout
- **Ajeet Kumar** (19 Mar 2026): ₹399 subscription, app not opening, no support
- **preetam pawar** (4 Feb 2026): Auto-renewal blocks access immediately after cancellation
- **DAMPU DULOM** (19 Apr 2026): Can't log in, phone/email mismatch
- **Abdul Rehman Khan** (12 May 2026): Auto-redirecting to login page
- **Pranav** (5 May 2026): App lags after subscription
- **Ansa** (6 May 2026): Can't make calls after reinstalling
- **Ruchika Khandelwal** (14 May 2026): App freezes on Pixel 8 Pro

**Positive reviewers (validates product-market fit):**
- **Yashbeer Singh** (20 Jun 2021): 931 helpful — praises free 25min talk time, affordable plans
- **mohd amer** (1 Jun 2021): 372 helpful — boosted confidence, improved communication
- **SOUMI SEN** (26 Jul 2021): 1,082 helpful — great environment, good experience
- **Divyanshu Shekhar** (26 Sep 2021): 44 helpful — subscription plans affordable, good discount
- **muskan saher** (11 Apr 2026): 14 helpful — room feature, made good friends

**Note:** Positive reviews skew 2021–2023; recent 2024–2026 reviews are predominantly negative. This suggests a degradation in product quality over time, not a market-fit problem.

---

## `screenshots/` — Visual Reference

**Contents:** UI screenshots of the live app.

**Used in:**
- PRD Addendum §H: Screenshot-derived surface map
- Confirmed two markets: Bangladesh (BDT 800/1600/2500) and India (INR 99/206/2500)
- Confirmed existing features: 6 call types, Voice Clubs, AI Speaking Test, Recorded Courses, Tutor Marketplace, Drama Tab, Daily Streaks, Friend Graph, Communities

**PRD reference:**
- §4.5: Multi-market note (BD + IN) based on screenshot evidence
- OQ-9: India PSP added after screenshot review
- §4.7 FR-22: Existing features listed from screenshot inventory

---

## Cross-Reference Map

### PRD §1 (Vision) → Docs
- "4 of 5 adults" → `about.md` line 21
- "1- and 2-star reviews" → `ratings-and-reviews.md` (Sumit, D Mail, Riyal, Hari, Mridu)

### PRD §2.3 (User Journeys) → Reviews
- UJ-1 Sumit → `ratings-and-reviews.md` line 20–24
- UJ-2 Tahiniyath → `ratings-and-reviews.md` line 37–44
- UJ-3 Vemireddy → `ratings-and-reviews.md` line 5–8
- UJ-4 Hari → `ratings-and-reviews.md` line 769–772
- UJ-5 Mridu → `ratings-and-reviews.md` line 556–563

### PRD §4.2 (Call Reliability) → LiveKit Docs
- FR-6 reconnection → `livekit.md` line 865–882 (ICE restart, network changes)
- FR-5 room lifecycle → `livekit.md` line 672–674 (auto-create, auto-close)
- FR-7 explicit end → `livekit.md` line 838–844 (disconnection reasons)

### PRD §4.5 (Billing) → Screenshots
- Multi-market pricing → `screenshots/` (BD + INR prices)
- SSLCommerz → `about.md` (BD target market)

---

## Usage Guidelines

**For new team members:**
1. Start with `about.md` to understand the product positioning
2. Read `ratings-and-reviews.md` to understand why the rebuild exists
3. Review `livekit.md` §"Network changes and reconnection" for technical context
4. Check `screenshots/` for the current app surface

**For PRD maintenance:**
- Any change to §2.3 (User Journeys) should verify against `ratings-and-reviews.md`
- Any change to §4.2 (Call Reliability) should verify against `livekit.md` reconnection section
- Any change to §4.5 (Billing) should verify against `screenshots/` for market scope

**For validation:**
- All named personas in UJs trace back to `ratings-and-reviews.md`
- All LiveKit claims in FR-6/FR-7 trace back to `livekit.md` technical docs
- The "4 of 5" statistic traces back to `about.md` but is unverified (§9 Assumption)

---

*Generated 2026-06-13. Maintained alongside PRD updates.*
