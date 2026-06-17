---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md
  - _bmad-output/planning-artifacts/prds/prd-community-2026-06-09/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/DESIGN.md
---

# community - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for community, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Persistent session across cold start — [Learner] can cold-open the app after a force-quit, OS reboot, or 7+ day idle period and [reach the home screen without re-entering credentials]. Realizes UJ-2.

FR2: Silent token refresh during active use — [System] refreshes the access token [in the background, ≤60s before expiry] [without user-visible interruption]. Realizes UJ-2, UJ-3.

FR3: Phone-number auth (OTP) — [Learner] can sign up or sign in [using a phone number] [via a one-time password]. Realizes review cluster: "can't log in, it says the number and email attached to the phone number does not match" (DAMPU DULOM, others).

FR4: Google OAuth — [Learner] can sign in [with a Google account] [on web and mobile]. Realizes UJ-2.

FR5: Server-managed Call rooms — [System] creates, joins, and tears down LiveKit Rooms [for 1:1 calls] [in response to match events]. Realizes UJ-3.

FR6: Client-side reconnection on network blip — [Learner] experiences [a network blip of up to 30 seconds] [as a brief "reconnecting" state] [rather than a call drop]. Realizes UJ-3.

FR7: Call-end is always explicit — [Learner] always [sees a clear "Call ended" screen] [when a call ends] [with a reason: "you ended the call", "your partner ended the call", "connection lost"]. Realizes UJ-1, UJ-3.

FR8: Gender filter (premium_plus) — [Learner] can set [a gender preference] [for their matches] [and the system only matches within that preference]. Realizes UJ-4.

FR9: Native language field — [Learner] has [a native language] [set during onboarding] [that informs matching and AI features].

FR10: Match timeout with honest state — [Learner] waiting for a match [for >60s] [sees a real-time status: "Looking for a partner…", then "No partners online right now — we'll keep trying"].

FR11: Graduated strike system — [System] responds to [short, repeated disconnects] [with a graduated sequence: warn → warn → cooldown → cooldown → review-by-human → ban]. Realizes UJ-1, UJ-4.

FR12: Distinguish victim from aggressor — [System] does not count a disconnect [as a strike] [if the user reported the partner for non-participation, abuse, or technical failure within 60s of ending the call]. Realizes UJ-4.

FR13: Visible moderation state — [Learner] can see [their own moderation state] [in profile settings] [with a plain-language explanation of why, and what they can do].

FR14: Visible subscription state — [Learner] can see [their current plan, next billing date, and auto-renew status] [in settings]. Realizes UJ-5.

FR15: Cancellation preserves access until period end — [Learner] who cancels [retains access to paid features] [until the end of the paid period]. Realizes review cluster: "If a user pays for a 1-year subscription and then disables auto-renewal, access should continue until the subscription expires" (preetam pawar).

FR16: In-app support ticket with ticket ID — [Learner] can submit a support issue [from settings] [and receive a ticket ID and an SLA-bound first response]. Realizes review cluster: 3-5 day support waits, no ticket IDs.

FR17: State preservation across app backgrounding — [Learner] who backgrounds the app [for up to 30 minutes] [returns to the same screen with the same call state if a call was active]. Realizes UJ-3.

FR18: Crash resilience — [Learner] who force-quits the app mid-call [returns to a "Call ended — connection lost" state, not a frozen UI]. Realizes UJ-2, UJ-3.

FR19: Reinstall preserves account — [Learner] who uninstalls and reinstalls [signs in with the same phone/email] [and gets their account, subscription, and history back]. Realizes review cluster: "user not registered" on reinstall (Sarati), "after reinstalling they only provide logging using Gmail but previously we logged in using phone number" (KUMAR RAJIV).

FR20: Refund mechanism for non-working product — [Learner] can request [a refund] [for a non-working product] [via in-app flow with a defined decision rule]. Realizes review cluster: Mridu, Ajeet Kumar, preetam pawar, Sumit, Ushama — all describe paying for a product that did not work and being unable to recover the money.

FR21: Skip button (in-call action) — [Learner] can [end the current call] [via a "Skip" button] [without counting as a strike, and return to the match queue]. Realizes UJ-1, UJ-4.

FR22: Existing features continue working — [System] ensures [the following existing features] [continue to function] [after the rebuild's infrastructure changes]: Voice Clubs, AI Speaking Test, Recorded Courses, Tutor Marketplace, Drama Tab, Daily Speaking Streaks, Friend Graph / Communities.

FR23: Post-call rating — [Learner] can [rate a partner after a call] [via a 1–5 star rating + optional comment] [and the rating feeds into the matching service]. Realizes OQ-7.

### Non-Functional Requirements

NFR1: Auth failure rate (login button → home screen) ≥ 99% on first attempt for valid credentials; ≥ 95% within 3 attempts for valid credentials.

NFR2: Cold-start-to-home-screen p95 ≤ 2.5s on a mid-range Android device (Pixel 4a equivalent).

NFR3: Audio round-trip p95 ≤ 400ms on a 4G connection with 200ms jitter; p99 ≤ 700ms.

NFR4: Reconnection success rate (1s blip → fully resumed) ≥ 95%.

NFR5: Reconnection success rate (5s blip → fully resumed) ≥ 80%.

NFR6: All paid state changes (purchase, renewal, cancel, refund) are reflected in the app within 60s.

NFR7: Refund requests for a non-working product are processed within 7 days.

NFR8: Match-wait-time p95 ≤ 45s for unfiltered queue, ≤ 90s for gender-filtered queue.

NFR9: Premium gender-filter fulfillment rate ≥ 90%.

NFR10: Disconnect-during-call rate (calls ended by network or unexplained disconnect / total calls) ≤ 5%.

NFR11: Support first-response time p95 ≤ 24h (paying) / 72h (free).

NFR12: False-positive strike rate — % of strikes issued to users who reported a partner within 60s of the disconnect. Target: ≤ 1%.

NFR13: Paid-filter violation rate — % of matches where a paid gender filter is not honored. Target: 0%.

NFR14: Auto-renew cancellation completion rate — % of users who start the cancellation flow and successfully turn off auto-renew. Target: ≥ 95%.

NFR15: D7 retention for users who complete ≥3 calls in first week. Target: ≥ 50%.

### Additional Requirements

- Infrastructure: PostgreSQL 15+ with Drizzle ORM, relational schema with foreign key constraints
- Authentication: Better-Auth extended with phone OTP + Google OAuth
- Session: Native via expo-secure-store, web via httpOnly+secure+SameSite=strict cookies
- Refresh token rotation on every use
- Real-time: LiveKit Cloud WebRTC for voice calls
- Queue state: Polling every 15s (not WebSocket)
- Call signaling: LiveKit built-in signaling (not custom WebSocket)
- Payment: Dual PSP — SSLCommerz (BD) + India PSP (Razorpay/Cashfree/PayU)
- Payment webhooks: HMAC signature verification required
- Error handling: Structured errors with { code, message, retryable } format
- Rate limiting: Token bucket per user, stricter for auth and payment endpoints
- Rate limit on auth endpoints: 10 req/min
- LiveKit tokens: Short-lived (5min expiry), room-scoped
- API design: oRPC with OpenAPI, Zod for all inputs
- State management: TanStack Query for server state, React Context for local state
- Styling: Tailwind CSS v4 with CSS variables, dark-mode-first
- Database naming: snake_case for tables/columns, PascalCase for enums
- API naming: camelCase for routers/procedures, PascalCase+Input/Output for schemas
- Code naming: PascalCase for components, camelCase for functions, SCREAMING_SNAKE_CASE for constants
- Testing: Co-located tests (*.test.ts), integration tests per app, E2E tests at root
- Monitoring: evlog for structured logging, every NFR needs measurement path
- CI/CD: GitHub Actions for type checking, linting, testing
- Deployment: Vercel (web), Railway/Render (server), EAS Build (native)

### UX Design Requirements

UX-DR1: Dark mode default on all surfaces — light mode is secondary. Respects commuter context (low-end OLED, sun glare, battery life).

UX-DR2: Color system implementation — background (#0F1419), elevated (#161B22), foreground (#F0F0F0), primary (#4A9B8E), accent (#D4A574), destructive (#C75B5B). Light mode warm inversion.

UX-DR3: Typography system — Inter font family, weight-driven ramp (display 32px/600, display-sm 24px/600, heading 20px/600, body 16px/400, label 14px/500, caption 12px/400).

UX-DR4: Spacing scale — gutter 16px, margin-mobile 16px, margin-tablet 24px, margin-desktop 32px, section-gap 24px, card-gap 12px.

UX-DR5: Elevation via tonal layering — background vs elevated difference as primary depth signal. No heavy shadows on native.

UX-DR6: Corner radii — sm 4px (inputs, pills), md 8px (cards, buttons), lg 12px (call cards, sheets), xl 16px (onboarding), full 9999px (avatars).

UX-DR7: Button component variants — primary (teal), secondary (muted), destructive (muted red). All with mapped color tokens.

UX-DR8: Skip Button component — first-class in-call action, visually secondary but always accessible. Muted fill, foreground text, border, md radius. Load-bearing for moderation system.

UX-DR9: Call Card component — elevated background, foreground text, border, lg radius. Contains partner avatar, call timer, mute/skip/report/end controls, network-status banner.

UX-DR10: Network Banner component — accent (amber) fill, accent-foreground text, sm radius. "Attention without alarm" for reconnecting states.

UX-DR11: Status Pill component — muted fill, muted-foreground text, full radius. For CEFR badges, tier labels, moderation state indicators.

UX-DR12: Input component — elevated background, foreground text, border, md radius. For phone OTP, support forms, profile edits.

UX-DR13: Mobile-first layout — single-column on native (5.5"–6.7" screens), max-w-md (448px) on web.

UX-DR14: Bottom-sheet modals on native — slide up from bottom, 85% height, dismiss by drag or scrim tap.

UX-DR15: Dialogs on web — standard modal overlay pattern.

UX-DR16: No gamification — no streaks, badges, achievement animations, or celebratory toasts.

UX-DR17: Warm off-white (#F0F0F0) text on dark — never pure white (#FFFFFF) for low-end screen comfort.

UX-DR18: Three-color discipline — teal (primary), amber (accent), muted red (destructive). No chromatic flourishes, gradients, neon accents.

UX-DR19: Accessibility: contrast compliance, semantic HTML, ARIA patterns where needed. Focus on reducing anxiety for adult learners.

UX-DR20: Skip button always visible in-call — never hidden behind menu or secondary action.

### FR Coverage Map

FR1: Epic 1 — Persistent session across cold start
FR2: Epic 1 — Silent token refresh during active use
FR3: Epic 1 — Phone-number auth (OTP)
FR4: Epic 1 — Google OAuth
FR5: Epic 2 — Server-managed Call rooms
FR6: Epic 2 — Client-side reconnection on network blip
FR7: Epic 2 — Call-end is always explicit
FR8: Epic 3 — Gender filter (premium_plus)
FR9: Epic 3 — Native language field
FR10: Epic 3 — Match timeout with honest state
FR11: Epic 4 — Graduated strike system
FR12: Epic 4 — Distinguish victim from aggressor
FR13: Epic 4 — Visible moderation state
FR14: Epic 5 — Visible subscription state
FR15: Epic 5 — Cancellation preserves access until period end
FR16: Epic 5 — In-app support ticket with ticket ID
FR17: Epic 6 — State preservation across app backgrounding
FR18: Epic 6 — Crash resilience
FR19: Epic 6 — Reinstall preserves account
FR20: Epic 5 — Refund mechanism for non-working product
FR21: Epic 4 — Skip button (in-call action)
FR22: All Epics — Existing features continue working (regression)
FR23: Epic 7 — Post-call rating

## Epic List

### Epic 1: Reliable Authentication & Session Management
Users can sign up, sign in, and stay signed in across app restarts, network blips, and call sessions. The session becomes the most boring part of the app — it never interrupts, never logs out unexpectedly, and survives device reinstalls.
**FRs covered:** FR1, FR2, FR3, FR4

### Epic 2: Call Reliability & Reconnection
Users on a flaky network can survive a 1-second blip without losing the call. A 5-second blip triggers a visible-but-quiet reconnection state, not a "your partner left" dead-end. Calls only end when a user explicitly ends them.
**FRs covered:** FR5, FR6, FR7

### Epic 3: Matchmaking & Filtering
Users are matched with a partner at the right level, with the right filters, in a reasonable time. The gender filter is enforced and the system is honest when the pool is empty. The native language field informs matching and AI features.
**FRs covered:** FR8, FR9, FR10

### Epic 4: Moderation & Trust System
Users who disconnect many calls in a row are not instantly banned. Instead, the system uses a graduated response that distinguishes the user being malicious from the user being the victim of bad matches. The Skip button provides a strike-free way to reject a bad match.
**FRs covered:** FR11, FR12, FR13, FR21

### Epic 5: Billing, Support & Refund Transparency
Users can see what they are paying for, when they are paying next, and how to stop. They can submit a support ticket with a ticket ID and an SLA-bound first response. They can request a refund via a defined three-path decision rule.
**FRs covered:** FR14, FR15, FR16, FR20

### Epic 6: Mobile Stability & State Preservation
Users on a mid-range Android device on a Bangladeshi cellular network have an app that does not freeze, does not lose state on backgrounding, and does not corrupt the auth state on reinstall. The call survives backgrounding; a crash ends gracefully; a reinstall restores the account.
**FRs covered:** FR17, FR18, FR19

### Epic 7: Post-Call Rating & Quality
Users can rate a partner after a call with a 1-5 star rating and an optional comment. The rating feeds into the matching service as a quality signal, helping future users find better partners.
**FRs covered:** FR23

---

## Epic 1: Reliable Authentication & Session Management

**Goal:** Users can sign up, sign in, and stay signed in across app restarts, network blips, and call sessions. The session becomes the most boring part of the app — it never interrupts, never logs out unexpectedly, and survives device reinstalls.

**FRs covered:** FR1, FR2, FR3, FR4

### Story 1.1: Persistent Session with Secure Storage

**GH Issue:** [#1](https://github.com/software-developer-yamin/community/issues/1)

As a Learner,
I want my session to survive app restarts, OS reboots, and 7+ day idle periods,
So that I never have to re-enter my credentials when I open the app.

**Acceptance Criteria:**

**Given** I am logged in on the mobile app
**When** I force-quit the app and reopen it
**Then** I reach the home screen without re-entering credentials
**And** my session is stored in expo-secure-store with a rolling refresh token

**Given** I am logged in on the web app
**When** I close the browser and reopen it after 7 days
**Then** I reach the home screen without re-entering credentials
**And** my session is stored in an httpOnly+secure+SameSite=strict cookie

**Given** a refresh token is used
**When** the system validates it
**Then** the token is rotated and the previous token is invalidated

### Story 1.2: Silent Token Refresh

**GH Issue:** [#2](https://github.com/software-developer-yamin/community/issues/2)

As a Learner,
I want my access token to refresh automatically in the background,
So that I never see a login screen or get dropped from a call due to token expiry.

**Acceptance Criteria:**

**Given** I am actively using the app
**When** my access token is ≤60s from expiry
**Then** the system refreshes it silently without user-visible interruption

**Given** I am in the middle of a call
**When** my access token expires
**Then** the call continues without interruption
**And** the token is refreshed in the background

**Given** I am navigating between screens
**When** a token refresh fails
**Then** the system retries silently up to 3 times
**And** only redirects to login if all retries fail

### Story 1.3: Phone Number Authentication with OTP

**GH Issue:** [#3](https://github.com/software-developer-yamin/community/issues/3)

As a Learner,
I want to sign up and sign in using my phone number with a one-time password,
So that I can authenticate without relying on email or passwords.

**Acceptance Criteria:**

**Given** I am a new user
**When** I enter my phone number and request an OTP
**Then** I receive an SMS with a one-time password within 30 seconds
**And** I can use the OTP to complete registration

**Given** I am an existing email user
**When** I add a phone number to my account
**Then** my account data is preserved
**And** I can sign in with either email or phone

**Given** SMS delivery fails
**When** the system attempts voice call fallback
**Then** I receive an automated voice call with the OTP

**Given** I enter an incorrect OTP
**When** I have 3 failed attempts
**Then** I can request a new OTP after a 60-second cooldown

### Story 1.4: Google OAuth Integration

**GH Issue:** [#4](https://github.com/software-developer-yamin/community/issues/4)

As a Learner,
I want to sign in with my Google account,
So that I can skip the password step and authenticate quickly.

**Acceptance Criteria:**

**Given** I am a new user
**When** I tap "Sign in with Google"
**Then** I can complete registration using my Google account
**And** my profile is populated with my Google name and email

**Given** I am an existing email user
**When** I link my Google account
**Then** my account data is preserved
**And** I can sign in with either email or Google

**Given** I am on the web app
**When** I use Google OAuth
**Then** the authentication flow works on desktop and mobile web

**Given** I am on the native app
**When** I use Google OAuth
**Then** the authentication flow works via the native Google Sign-In SDK

---

## Epic 2: Call Reliability & Reconnection

**Goal:** Users on a flaky network can survive a 1-second blip without losing the call. A 5-second blip triggers a visible-but-quiet reconnection state, not a "your partner left" dead-end. Calls only end when a user explicitly ends them.

**FRs covered:** FR5, FR6, FR7

### Story 2.1: Server-Managed Room Lifecycle

**GH Issue:** [#5](https://github.com/software-developer-yamin/community/issues/5)

As a Learner,
I want the system to create, manage, and clean up my call rooms,
So that I don't have to worry about room management or stale connections.

**Acceptance Criteria:**

**Given** a match is found
**When** the system creates a room
**Then** the room is named call-{matchId}
**And** both participants receive a join token

**Given** both participants disconnect
**When** 30 seconds pass
**Then** the room is automatically closed
**And** all resources are cleaned up

**Given** a call is explicitly ended
**When** the end call action is triggered
**Then** the room is closed within 30 seconds
**And** a call record is saved with end reason

**Given** a room exists
**When** it is reused across matches
**Then** the system prevents reuse
**And** each match gets a fresh room

### Story 2.2: ICE Restart Reconnection (1-5s Blips)

**GH Issue:** [#6](https://github.com/software-developer-yamin/community/issues/6)

As a Learner,
I want to survive 1-5 second network blips without losing my call,
So that brief connectivity issues don't disrupt my practice session.

**Acceptance Criteria:**

**Given** I am in an active call
**When** a 1-second network blip occurs
**Then** the call resumes within 500ms
**And** my partner experiences no audio dropout or UI change

**Given** I am in an active call
**When** a 5-second network blip occurs
**Then** a "reconnecting..." indicator appears to me only
**And** my partner sees no change
**And** the call resumes if connectivity returns

**Given** the network recovers
**When** the ICE restart completes
**Then** the "reconnecting..." indicator disappears
**And** the call continues without requiring a new room or token

### Story 2.3: Full Reconnection (5-30s Blips)

**GH Issue:** [#7](https://github.com/software-developer-yamin/community/issues/7)

As a Learner,
I want to survive longer network blips with a clear reconnection UI,
So that I know what's happening and can choose to wait or end the call.

**Acceptance Criteria:**

**Given** I am in an active call
**When** a 10-second network blip occurs
**Then** the "reconnecting..." indicator remains visible
**And** a countdown shows elapsed reconnection time

**Given** a 30-second blip occurs
**When** the connection is not restored
**Then** a "connection lost" prompt appears
**And** I can choose to retry or end the call

**Given** I choose to retry
**When** the reconnection attempt begins
**Then** the system attempts a full reconnection
**And** my partner is notified that I am reconnecting

**Given** I choose to end the call
**When** the end action is triggered
**Then** the call ends with reason "connection lost"
**And** no strike is issued for the disconnect

### Story 2.4: Explicit Call End

**GH Issue:** [#8](https://github.com/software-developer-yamin/community/issues/8)

As a Learner,
I want to always see a clear "Call ended" screen with a reason,
So that I understand why the call ended and whether it was my choice, my partner's, or a network issue.

**Acceptance Criteria:**

**Given** I end the call
**When** I tap "End Call"
**Then** I see "Call ended — you ended the call"
**And** a post-call rating prompt appears

**Given** my partner ends the call
**When** the call ends
**Then** I see "Call ended — your partner ended the call"
**And** a 10-second "waiting..." window appears before the screen

**Given** the connection is lost
**When** the call ends
**Then** I see "Call ended — connection lost"
**And** "connection lost" is never labeled as "your partner left"

**Given** the call ends
**When** the end screen appears
**Then** I have options to rejoin the queue, report an issue, or return home

---

## Epic 3: Matchmaking & Filtering

**Goal:** Users are matched with a partner at the right level, with the right filters, in a reasonable time. The gender filter is enforced and the system is honest when the pool is empty. The native language field informs matching and AI features.

**FRs covered:** FR8, FR9, FR10

### Story 3.1: Gender Filter Enforcement

**GH Issue:** [#9](https://github.com/software-developer-yamin/community/issues/9)

As a premium learner,
I want to set a gender preference for my matches,
So that I only practice with partners I'm comfortable with.

**Acceptance Criteria:**

**Given** I have a premium_plus subscription
**When** I set a gender filter (male, female, nonbinary, undisclosed)
**Then** the system only matches me with partners matching that preference
**And** I never receive a match that violates my filter

**Given** no valid match exists for my gender filter
**When** I wait for 60 seconds
**Then** I see "No matches available right now"
**And** the system does not force a match

**Given** I wait for 5 minutes with no matches
**When** the system offers options
**Then** I can choose to keep waiting or drop the filter for this session
**And** the system never auto-bypasses my filter

**Given** the system rejects a match due to my filter
**When** this happens
**Then** the event is logged for pool health analysis

### Story 3.2: Native Language Field

**GH Issue:** [#10](https://github.com/software-developer-yamin/community/issues/10)

As a Learner,
I want to set my native language during onboarding,
So that matching and AI features are informed by my actual background.

**Acceptance Criteria:**

**Given** I am a new user
**When** I complete onboarding
**Then** I select my native language (bn, hi, ur, en, ta, te)
**And** it defaults to bn (Bangla) for Bangladeshi users

**Given** I have set my native language
**When** profile embedding is computed
**Then** the system uses my actual native language
**And** not a hardcoded value

**Given** I want to change my language
**When** I edit my profile settings
**Then** I can update my native language
**And** the embedding recomputes on the next match

### Story 3.3: Match Timeout with Honest State

**GH Issue:** [#11](https://github.com/software-developer-yamin/community/issues/11)

As a Learner,
I want to see real-time status while waiting for a match,
So that I know the system is working and I'm not stuck in an invisible queue.

**Acceptance Criteria:**

**Given** I join the matchmaking queue
**When** I wait for a match
**Then** I see "Looking for a partner..." with an animated indicator
**And** status updates every 15 seconds

**Given** I wait for more than 60 seconds
**When** no match is found
**Then** the status changes to "No partners online right now — we'll keep trying"
**And** I can choose to continue waiting or exit the queue

**Given** I wait for 5 minutes
**When** no match is found
**Then** I am offered options to lower filter strictness or exit
**And** the system is transparent about the wait time

**Given** the matchmaking queue
**When** the system finds a match
**Then** the transition to the call screen happens within 3 seconds

---

## Epic 4: Moderation & Trust System

**Goal:** Users who disconnect many calls in a row are not instantly banned. Instead, the system uses a graduated response that distinguishes the user being malicious from the user being the victim of bad matches. The Skip button provides a strike-free way to reject a bad match.

**FRs covered:** FR11, FR12, FR13, FR21

### Story 4.1: Graduated Strike System

**GH Issue:** [#12](https://github.com/software-developer-yamin/community/issues/12)

As a Learner,
I want to receive warnings and cooldowns before being banned,
So that I understand my behavior and have a chance to correct it.

**Acceptance Criteria:**

**Given** I disconnect 3 short calls (<30s) in a row
**When** the third disconnect occurs
**Then** I receive a non-blocking warning: "We noticed you ended 3 calls quickly. If partners aren't a good fit, use the 'Skip' button."
**And** no queue block is applied

**Given** I disconnect 5 short calls in 24h
**When** the fifth disconnect occurs
**Then** I receive a 1-hour cooldown (queue-blocked, not banned)
**And** I can still use free features and chat

**Given** I disconnect 10 short calls in 24h
**When** the tenth disconnect occurs
**Then** I receive a 24-hour cooldown
**And** my account is flagged for automatic human review

**Given** I have not disconnected a call in 30 days
**When** the system evaluates my strikes
**Then** my strike count is zero
**And** my moderation state is clean

**Given** a disconnect lasts ≥30s
**When** it ends
**Then** it does not count as a strike
**And** it is treated as a normal call end

### Story 4.2: Skip Button (In-Call Action)

**GH Issue:** [#13](https://github.com/software-developer-yamin/community/issues/13)

As a Learner,
I want to end a bad call and find a new partner without receiving a strike,
So that I have a safe way to reject a mismatch.

**Acceptance Criteria:**

**Given** I am in an active call
**When** I tap the "Skip" button
**Then** the call ends immediately
**And** I see "Finding a new partner..."
**And** I return to the match queue within 3 seconds

**Given** I skip a call
**When** the action completes
**Then** the skip does not increment my strike counter
**And** the skipped partner sees "Call ended by partner"

**Given** I skip multiple times rapidly
**When** I attempt more than 1 skip per 5 seconds
**Then** the skip button is temporarily disabled
**And** a message shows: "Please wait before skipping again"

**Given** I skip 3 times in a single session
**When** the third skip occurs
**Then** I see: "We notice you're skipping partners. Try adjusting your filters or come back later."
**And** this is a UX nudge, not a strike

### Story 4.3: Distinguish Victim from Aggressor

**GH Issue:** [#14](https://github.com/software-developer-yamin/community/issues/14)

As a Learner,
I want to report a bad partner without receiving a strike myself,
So that I'm not punished for someone else's behavior.

**Acceptance Criteria:**

**Given** I report a partner within 60s of ending a call
**When** the report is submitted
**Then** my strike for that call is automatically voided
**And** the reported partner is flagged for review

**Given** I report a partner for non-participation
**When** the report is submitted
**Then** I select a reason: "non_participation", "abuse", "technical_failure", "other"
**And** I can optionally add details

**Given** my partner reports me
**When** the report is submitted
**Then** my account is flagged for review
**And** I do not receive a strike for the reported call

**Given** a report is submitted
**When** the system processes it
**Then** the report is logged in the moderation system
**And** a human moderator can review it

### Story 4.4: Visible Moderation State

**GH Issue:** [#15](https://github.com/software-developer-yamin/community/issues/15)

As a Learner,
I want to see my account standing and understand why,
So that I know my status and what I can do about it.

**Acceptance Criteria:**

**Given** I navigate to profile settings
**When** I open "Account standing"
**Then** I see my current moderation state: clean, warned, cooldown, suspended, or banned
**And** a plain-language explanation of what it means

**Given** I am in a warned state
**When** I view my account standing
**Then** I see: "You have a warning for ending calls quickly. Use the Skip button to avoid this."
**And** a "Contact support" link is available

**Given** I am in a cooldown state
**When** I view my account standing
**Then** I see the cooldown end time
**And** I can still access free features and chat

**Given** I am in a banned state
**When** I view my account standing
**Then** I see the reason for the ban
**And** I can submit an appeal via support

---

## Epic 5: Billing, Support & Refund Transparency

**Goal:** Users can see what they are paying for, when they are paying next, and how to stop. They can submit a support ticket with a ticket ID and an SLA-bound first response. They can request a refund via a defined three-path decision rule.

**FRs covered:** FR14, FR15, FR16, FR20

### Story 5.1: Visible Subscription State

**GH Issue:** [#16](https://github.com/software-developer-yamin/community/issues/16)

As a Learner,
I want to see my current plan, next billing date, and auto-renew status,
So that I always know what I'm paying for and when.

**Acceptance Criteria:**

**Given** I have a paid subscription
**When** I navigate to Settings → Subscription
**Then** I see: current tier, started-on date, renews-on date, auto-renew status
**And** payment method last 4 digits and total billed to date

**Given** I want to turn off auto-renew
**When** I toggle the auto-renew switch
**Then** the change takes effect at the end of the current billing period
**And** I see: "Your plan is paid until [date]"

**Given** I have a free tier
**When** I view subscription settings
**Then** I see upgrade options
**And** a clear comparison of tier benefits

**Given** my subscription changes
**When** any paid state change occurs (purchase, renewal, cancel, refund)
**Then** the app reflects the change within 60 seconds

### Story 5.2: In-App Support Ticket

**GH Issue:** [#17](https://github.com/software-developer-yamin/community/issues/17)

As a Learner,
I want to submit a support issue from the app and receive a ticket ID,
So that I know my issue is tracked and will be responded to.

**Acceptance Criteria:**

**Given** I have a support issue
**When** I navigate to Help → Contact support
**Then** I see an in-app form with subject, description, and category

**Given** I submit a support ticket
**When** the form is submitted
**Then** I receive a ticket ID (e.g., TKT-20260613-001)
**And** an estimated first-response time

**Given** I am a paying user
**When** I submit a ticket
**Then** the SLA is 24 hours for first response

**Given** I am a free user
**When** I submit a ticket
**Then** the SLA is 72 hours for first response

**Given** I want to check my ticket status
**When** I navigate to Settings → My tickets
**Then** I see all my tickets with status and response history

**Given** the support team responds
**When** I receive a response
**Then** I see it in the ticket thread
**And** I can reply to continue the conversation

### Story 5.3: Refund Mechanism

**GH Issue:** [#18](https://github.com/software-developer-yamin/community/issues/18)

As a Learner,
I want to request a refund for a non-working product through a clear in-app flow,
So that I can recover my money when the product doesn't work.

**Acceptance Criteria:**

**Given** I have a paid subscription
**When** I navigate to Subscription → Request refund
**Then** I see a refund request form with my purchase history

**Given** I have ≥3 critical crashes in my first 7 days
**When** I request a refund
**Then** the system auto-approves within 24 hours
**And** I see: "Refund approved — processing with payment provider"

**Given** I have never connected to a completed call
**When** I request a refund within 14 days
**Then** the system auto-approves within 24 hours

**Given** I have >5 completed sessions or request >14 days after charge
**When** I request a refund
**Then** the system auto-denies with a plain-language explanation
**And** I can appeal for human review

**Given** my refund request is in a gray area
**When** the system classifies it
**Then** it goes to human review with a 7-day SLA
**And** the decision is shown in-app

**Given** a refund is approved
**When** the payment provider processes it
**Then** the system retries up to 3 times over 24 hours on failure
**And** the user is notified of processing status

---

## Epic 6: Mobile Stability & State Preservation

**Goal:** Users on a mid-range Android device on a Bangladeshi cellular network have an app that does not freeze, does not lose state on backgrounding, and does not corrupt the auth state on reinstall. The call survives backgrounding; a crash ends gracefully; a reinstall restores the account.

**FRs covered:** FR17, FR18, FR19

### Story 6.1: State Preservation Across Backgrounding

**GH Issue:** [#19](https://github.com/software-developer-yamin/community/issues/19)

As a Learner,
I want to return to my app after backgrounding it and still be in my call or queue,
So that I don't lose my place when I switch apps briefly.

**Acceptance Criteria:**

**Given** I am in an active call
**When** I background the app for up to 30 minutes
**Then** the call continues
**And** when I return, I am still in the call

**Given** I am in the matchmaking queue
**When** I background the app
**Then** I remain in the queue
**And** when I return, my queue position is preserved

**Given** the OS terminates the app while backgrounded
**When** I reopen the app
**Then** I see "Call ended — connection lost"
**And** no strike is assessed for the disconnect

**Given** I return to the app after backgrounding
**When** the app resumes
**Then** the UI state is restored (same screen, same data)
**And** no re-authentication is required

### Story 6.2: Crash Resilience

**GH Issue:** [#20](https://github.com/software-developer-yamin/community/issues/20)

As a Learner,
I want the app to handle crashes gracefully,
So that I don't see frozen UIs or lose my account standing.

**Acceptance Criteria:**

**Given** the app crashes mid-call
**When** I relaunch the app
**Then** I see the home screen, not a frozen call UI
**And** my moderation state is unchanged

**Given** the app crashes mid-call
**When** the system detects the crash
**Then** the call ends gracefully
**And** my partner sees "Call ended — connection lost"

**Given** the app crashes
**When** the system logs the crash
**Then** the crash type is recorded (force_close, anr, black_screen)
**And** app version, OS version, and device model are captured

**Given** I have multiple crashes
**When** the system evaluates my account
**Then** my account standing is not affected
**And** crashes are used for refund auto-approval only

### Story 6.3: Reinstall Account Preservation

**GH Issue:** [#36](https://github.com/software-developer-yamin/community/issues/36)

As a Learner,
I want to reinstall the app and get my account back,
So that I don't lose my subscription, history, and progress.

**Acceptance Criteria:**

**Given** I uninstall and reinstall the app
**When** I sign in with the same email or phone
**Then** my account is fully restored
**And** my subscription state is preserved

**Given** I reinstall the app
**When** I sign in
**Then** my call history, ratings, and CEFR placements are restored
**And** my profile settings are preserved

**Given** I sign in with a different method after reinstall
**When** I use a different auth method (e.g., Google instead of phone)
**Then** the system links to my existing account if the email matches
**And** no duplicate account is created

**Given** my subscription is active
**When** I reinstall and restore my account
**Then** my subscription state is server-authoritative
**And** it is never lost on reinstall

---

## Epic 7: Post-Call Rating & Quality

**Goal:** Users can rate a partner after a call with a 1-5 star rating and an optional comment. The rating feeds into the matching service as a quality signal, helping future users find better partners.

**FRs covered:** FR23

### Story 7.1: Post-Call Rating Flow

**GH Issue:** [#37](https://github.com/software-developer-yamin/community/issues/37)

As a Learner,
I want to rate my partner after a call,
So that I can provide feedback and help improve matching quality.

**Acceptance Criteria:**

**Given** a call has ended
**When** the end screen appears
**Then** a "Rate your partner" prompt is shown
**And** I can give 1-5 stars

**Given** I am rating a partner
**When** I submit the rating
**Then** I can optionally add a text comment
**And** I answer "Did this partner help you practice?" (yes/no)

**Given** I submit a rating
**When** the system processes it
**Then** the rating is stored with userId, partnerId, callId, stars, comment, helpedPractice
**And** it is retained for 90 days before anonymization

**Given** I choose not to rate
**When** I dismiss the rating prompt
**Then** the call ends without a rating
**And** I can still rate later from my call history

### Story 7.2: Rating Integration with Matching

**GH Issue:** [#38](https://github.com/software-developer-yamin/community/issues/38)

As a Learner,
I want ratings to improve my future matches,
So that I am paired with higher-quality partners.

**Acceptance Criteria:**

**Given** a partner has multiple ratings
**When** the matching service evaluates them
**Then** the average rating is computed
**And** partners with average < 2.5 stars surface lower in the queue

**Given** a partner has no ratings
**When** the matching service evaluates them
**Then** they are treated neutrally
**And** they are not penalized for being new

**Given** ratings are anonymized after 90 days
**When** the matching service uses them
**Then** aggregate quality metrics are preserved
**And** individual ratings are no longer linked to users

**Given** the matching service ranks partners
**When** ratings are integrated
**Then** the quality signal is combined with CEFR and embedding similarity
**And** no single metric dominates the ranking

