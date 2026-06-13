---
name: AceFluency
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md
  - _bmad-output/planning-artifacts/prds/prd-community-2026-06-09/addendum.md
  - docs/about.md
  - docs/ratings-and-reviews.md
  - docs/livekit.md
updated: 2026-06-13
run: ux-community-2026-06-10
project: community
inherits:
  ui_system: shadcn/ui
  source_of_truth:
    - _bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/.decision-log.md
    - _bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/DESIGN.md
---

# EXPERIENCE.md — IA, behavior, interactions, accessibility

> *Populated at Finalize. Frontmatter only at boot.*

## Foundation

**Multi-surface product.** Primary: **Expo native (Android-first, iOS follow)**. Secondary: **Next.js web** (onboarding, billing/refunds, account management, desktop practice). The native surface is the hero experience; web is parity for auth and money-mechanics.

**UI system:** shadcn/ui on web via `packages/ui`; Nativewind on native via Tailwind classes referencing the same CSS variable tokens. The component library does most of the work; brand discipline is "respect the defaults except where the brand layer overrides them." `DESIGN.md` is the visual identity reference; this spine is the experience.

**Form factor:** Mobile-first. Android 5.5"–6.7" screens are the design baseline. Tablet and web surfaces relax the layout but do not add new functionality.

**Locale:** English only at v1. Bangla UI strings (`i18n` slot) reserved for v1.1. All copy is written for English-first users, but the voice is calibrated for South Asian English proficiency levels (clear, direct, no idioms, no phrasal-verb-heavy microcopy).

## Information Architecture

### Visible surfaces (13)

| # | Surface | Platforms | Reached from | Primary purpose | PRD refs |
|---|---|---|---|---|---|
| S1 | Cold-start / Home | Native, Web | App open, return | Status overview, entry to calling, streaks | FR-1, FR-2, FR-7, FR-17 |
| S2 | Onboarding | Native-first | First install | Phone OTP, profile, native-lang, CEFR | FR-3, FR-4, FR-9 |
| S3 | Matchmaking queue | Native | S1 "Start Calling" | Find partner, set filters, wait | FR-8, FR-9, FR-10, FR-11 |
| S4 | Call screen | Native | S3 match resolved | 1:1 voice call with controls | FR-5, FR-6, FR-7, FR-12, FR-17 |
| S5 | Call-ended | Native | S4 end | Reason, duration, next action | FR-7 |
| S6 | Post-call rating | Native | S5 | Rate partner, report, skip | OQ-7, FR-7, FR-23 |
| S7 | Settings | Native, Web | S1 avatar / S1 menu | Account, sub, moderation, tickets, language | FR-13, FR-14, FR-16, FR-19 |
| S8 | Subscription detail | Native, Web | S7 | Plan, renew date, auto-renew toggle | FR-14, FR-15 |
| S9 | Refund request | Native, Web | S8 | Three-path refund flow | FR-20 |
| S10 | Support tickets | Native, Web | S7 | Submit ticket, view my tickets, SLA | FR-16 |
| S11 | Account standing | Native, Web | S7 / S1 banner | Visible moderation state | FR-13 |
| S12 | Auth | Native, Web | Sign-out / reinstall | Sign-in, sign-up, OTP, Google OAuth | FR-1, FR-2, FR-3, FR-4, FR-19 |
| S16 | Pricing / paywall | Native, Web | S3 (queue blocked) | Tier comparison, purchase entry | FR-14, FR-15, FR-20 |

### Composed into S4 (not separate surfaces)

- **S13. In-call affordances** — Mute, Skip, Report, End. Always visible. Skip is first-class (FR-21 dependency).
- **S14. Network-status banner** — "Reconnecting…" / "Connection lost" / signal-strength pill. Visible to affected user; partner sees silent indicator only.

### Named-deferred (now resolved at Finalize)

- **New User** → S2 first; lands on S1 home after.
- **Warned User** → lands on S11 (cooldown-until-X) when re-entering app; redirected to S1 with banner.
- **Reinstaller** → S12 (sign-in with same email/phone) → S1 (full restore).
- **In-call micro-journey** → S4 composed. Mute / Skip / Report / End transitions.

### Explicit non-surfaces (v1)

Voice Clubs, AI conversation partner, Friend list / re-match, Push re-engagement, Video call, iOS-specific native polish, In-app paywall A/B testing, Bangla UI strings, Biometric unlock — all out of scope per PRD §5 and §6.3.

## Voice and Tone

AceFluency speaks like a calm, patient practice partner — not a cheerleader, not a corporate bot, not a teacher. The voice is **reassuring, direct, and never apologetic for the user's own behavior.**

Microcopy rules:

| Do | Don't |
|---|---|
| "Finding a partner for you…" | "Searching for matches! 🎉" |
| "You ended the call. Want to try again?" | "Call disconnected! Please retry!" |
| "We noticed you ended 3 calls quickly. If partners aren't a good fit, use Skip." | "Warning: excessive disconnects detected!" |
| "Your plan renews on 14 July. Auto-renew is on." | "Your subscription is active!" |
| "Connection lost. Reconnecting…" | "Error: network failure!" |
| "We're still looking — no partners online right now." | "No matches found. Please try later!" |
| "Refund approved. Processing with your payment provider." | "Refund successful! 🎉" |
| "Account standing: Clean" | "Your account is in good standing!" |
| Manager-facing: counts and verbs. Employee-facing: same. | Different tone per audience — the app talks to everyone the same way. |

Key principle: **The app never blames the user for network failures, partner mismatches, or system errors.** The language is always "the system is handling this" or "here is what is happening," never "you did something wrong."

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Call card | S4 | Partner avatar, call timer, network banner, mute/skip/report/end controls. Timer counts up from 0. Skip is tap-and-hold 0.5s to prevent accidental taps. End is tap once. Report is tap → reason sheet → confirm. |
| Match queue card | S3 | CEFR filter badge, gender filter toggle (premium), intent tag ("Practice interview"), waiting animation. After 60s: honest "No partners online" state. After 5min: offer to drop filter or exit. |
| Post-call rating | S6 | 1–5 stars, optional comment, "Did this partner help you practice?" yes/no. Submit is optimistic; if offline, queues. Skipping the rating is always allowed (tap "Skip"). |
| Subscription detail card | S8 | Plan name, price, next billing date, auto-renew toggle. Toggle edit is immediate (no "Save" button). Cancel auto-renew shows confirmation: "You'll keep access until [date]." |
| Support ticket form | S10 | Category picker, description text, attach screenshot. Submit returns ticket ID + SLA estimate. Form is scrollable; keyboard does not obscure the submit button. |
| Account standing banner | S11, S1 | Clean / Warned / Cooldown / Suspended / Banned. Each state has a plain-language explanation and a "Contact support" link. If warned or cooldown, the banner appears on S1. |
| Settings list | S7 | Grouped by category: Account, Subscription, Support, Language, Legal. Each group has a header and separated by `{spacing.section-gap}`. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold app load | S1 | Skeleton rows (3–4) for the calling queue status. Resolves on data. If session is valid, home loads in ≤2.5s. |
| No session | S1 | Redirect to S12 (auth). No "blocked" screen. |
| Match queue waiting | S3 | Animated pulse on the queue card (not the whole screen). Status updates every 15s. No full-screen spinner. |
| No matches available | S3 | Honest state: "No partners online right now — we'll keep trying." Below: option to drop filter or exit. |
| Call connecting | S4 | "Connecting…" with partner avatar and a 3-second timeout before showing "Partner not responding." |
| Call active | S4 | Partner avatar, timer, mute/skip/report/end. Network banner only if needed. |
| Reconnecting (1–5s blip) | S4 | Amber banner to affected user only: "Reconnecting…" Partner sees no change. Audio drops briefly. |
| Reconnecting (5–30s blip) | S4 | Amber banner: "Connection lost. Reconnecting…" Below: "End call" option always available. |
| Reconnect failed (>30s) | S4 | Banner changes to muted red: "Connection lost." CTA: "Retry" or "End call." Call is not silently destroyed. |
| Call ended by partner | S5 | "Your partner ended the call." Duration shown. CTA: "Rate partner" or "Find new partner." |
| Call ended by user | S5 | "You ended the call." Same CTAs. |
| Call ended — connection lost | S5 | "Call ended — connection lost." No strike assessed. CTA: "Find new partner." |
| Post-call rating pending | S6 | Optimistic submit. If offline, "Rating saved. It will sync when you're back online." Toast. |
| Warned moderation state | S1, S11 | Banner on S1: "We noticed you ended a few calls quickly. Use Skip to find a better match." Link to S11. |
| Cooldown moderation state | S1, S11 | Banner on S1: "You're in a cooldown until [time]. You can still use free features." Queue button disabled. |
| Suspended / Banned | S11 | Full-screen S11. "Account suspended." Explanation + "Contact support" + "Learn more." |
| Offline (global) | All | Bottom banner (not toast): "You're offline. Some features are unavailable." Read-only: view settings, view tickets. Queue and call are blocked. |
| Low bandwidth | S4 | Signal-strength pill (1–4 bars) in the call card. 1 bar = amber. No interruptive UI. |
| Backgrounding during call | S4 | Call continues. UI hides. Returning to app restores call card in <1s. |
| OS-killed during call | S1 | On relaunch: S1 with "Call ended — connection lost." No strike. |
| Crash recovery | S1 | On relaunch: S1. No frozen call UI. Moderation state unchanged. |

## Interaction Primitives

**Touch-first.** The primary audience is on mid-range Android devices. All primary actions are reachable by thumb on a 6" screen.

- **Tap** — primary action (Start Calling, End Call, Skip, Submit)
- **Tap-and-hold (0.5s)** — Skip button. Prevents accidental skips during call.
- **Swipe down** — dismiss bottom sheets, dismiss network banners
- **Swipe up** — open bottom sheets (filter picker, report reason)
- **Pull-to-refresh** — S1 home only. Other surfaces do not use pull-to-refresh.
- **Back button (Android)** — navigates up. On S4 (call), back button is disabled (must tap End).
- **Hardware volume** — controls call volume during S4. System volume UI is not suppressed.

**Keyboard (web only):**
- `Tab` order matches reading order.
- `Enter` submits forms.
- `Esc` closes modals and sheets.
- No vim-style shortcuts (the product is not a power-user tool).

**Banned everywhere:**
- Infinite scroll (all lists are bounded or paginated)
- Drag-to-reorder (not needed in v1)
- Hover-only affordances (no hover on touch)
- Modal stacks > 2 levels deep
- Shake-to-refresh
- Haptic feedback on errors (haptic is reserved for success states only: call connected, rating submitted, ticket created)

## Accessibility Floor

- **WCAG 2.1 AA** across all surfaces. Minimum contrast ratio 4.5:1 for body text, 3:1 for large text and UI components.
- **Low-bandwidth tolerance:** Defer non-critical assets. Prefer system fonts in loading states. Cold-start JS budget on web: ≤ 100KB. Images in the app are limited to avatars (compressed to < 50KB each).
- **Screen reader:** All interactive elements have `aria-label` or visible text. Call screen announces: "Call with [partner name]. Timer: [duration]." Network banners announce: "Reconnecting."
- **Bangla screen-reader:** Not in v1 floor (no Bangla content in v1).
- **Focus rings:** Visible on web (`ring` token). On native, focus is implicit via selection state.
- **Motion:** Respect `prefers-reduced-motion`. Queue waiting animation is a slow fade (not a spin). Call-state transitions are cross-fades (not slides). No celebratory animations.
- **Font scaling:** All text scales with system font size up to 200%. Layout does not break at 150% (the native default max for most users).
- **Color independence:** No information is conveyed by color alone. Network status uses text + icon + color. Moderation state uses text + icon + color.

## Network & Connectivity States

*Invented section. Product-specific, load-bearing for the rebuild.*

AceFluency is used on Bangladeshi cellular networks with intermittent connectivity. The network-state surface is not an error state — it is a **first-class UI primitive** that appears in the call screen, the match queue, and the global status bar.

**Signal-strength pill (S4, S3):**
- 4 bars = green (stable)
- 3 bars = green (good)
- 2 bars = amber (caution)
- 1 bar = amber (poor)
- 0 bars = red (no connection)
- The pill is small, quiet, and updates every 5s. It never blocks the UI.

**Reconnecting banner (S4):**
- 1–5s blip: "Reconnecting…" (amber, no icon change)
- 5–30s blip: "Connection lost. Reconnecting…" (amber, subtle pulse)
- >30s: "Connection lost." (muted red, stable) + "Retry" or "End call" buttons
- The partner sees **nothing** during a 1–5s blip. During a 5–30s blip, the partner sees a silent "Connection unstable" text under the user's avatar.

**Queue network state (S3):**
- If network drops while in queue, the queue is paused (not dropped). The user sees: "Waiting for network…" The queue resumes automatically when network returns.
- If network is down for >2min, the queue is dropped and the user is returned to S1 with a banner: "You left the queue because of a network issue. Tap to rejoin."

**Global offline banner (all surfaces):**
- A thin bottom banner: "You're offline." It appears on all surfaces except S4 (where the network banner is the source of truth).
- Actions that require network (Start Calling, Submit ticket, Purchase) are disabled with a tooltip: "This requires an internet connection."

## Trust Surfaces

*Invented section. Product-specific, load-bearing for the rebuild.*

Trust is the product's core differentiator. The following surfaces exist specifically to make the user feel safe, informed, and in control.

**Visible subscription state (S8):**
- Plan name, price, next billing date, auto-renew toggle, payment method last-4, total billed to date.
- The auto-renew toggle is **always visible and always editable**. There is no hidden setting or email-only cancellation.
- If auto-renew is on, the text is neutral: "Renews on [date]." If off, it is also neutral: "Cancels on [date]." No shame language.

**Visible moderation state (S11, S1 banner):**
- Clean: no banner.
- Warned: amber banner on S1. Plain-language explanation + "Use Skip for bad matches."
- Cooldown: amber banner on S1. Time remaining. "You can still use free features."
- Suspended / Banned: full-screen S11. Explanation + "Contact support" + "Learn more."
- The user can always see *why* they are in a state and *what they can do about it.*

**Refund visibility (S9):**
- The refund flow is in-app, not email-only. The three-path structure (auto-approve / auto-deny / human review) is visible to the user.
- If auto-approved, the user sees: "Refund approved. Processing with your payment provider." If auto-denied, they see the reason in plain language. If human review, they see the SLA.

**Support ticket visibility (S10):**
- Ticket ID is shown immediately after submission.
- SLA is shown: "First response expected by [date]."
- Ticket status is visible in "My tickets": Open / In Progress / Resolved / Closed.
- The user never has to wonder if their ticket was received.

**Skip as a trust signal (S4):**
- The Skip button is always visible and always accessible. It is the primary mechanism for saying "this partner is not a good fit" without punishment.
- The existence of Skip is a trust signal: the product trusts the user to know what they need.

## Failure Vocabulary

*Invented section. Product-specific, load-bearing for the rebuild.*

The current app fails users with silent, punishing, or confusing language. The rebuild replaces the failure vocabulary with a **calm, informative, and non-punishing** lexicon.

| Old (current app) | New (rebuild) | Rationale |
|---|---|---|
| "Your partner left the call" | "Connection lost." or "Call ended." | Distinguishes network failure from partner action. |
| "Account suspended for 48 hours" | "You're in a cooldown until [time]. You can still use free features." | "Cooldown" is less punitive than "suspended." Free-feature access preserves engagement. |
| "Excessive disconnects detected" | "We noticed you ended a few calls quickly. If partners aren't a good fit, use Skip." | Non-blaming. Offers a constructive alternative. |
| "No response from support" | "Ticket #[ID] — first response expected by [date]." | Gives the user a handle and a timeline. |
| "Auto-renewal failed" | "Payment could not be processed. Your plan is active until [date]. Tap to update payment method." | Clear, non-alarming, actionable. |
| "Network error" | "You're offline. Some features are unavailable." | Plain language. No technical jargon. |
| "Call dropped" | "Connection lost. Reconnecting…" or "Call ended — connection lost." | Distinguishes temporary blip from permanent loss. |
| "Refund request denied" | "We can't issue a refund because [reason]. If you think this is wrong, reply — a human will look at it within 7 days." | Auto-deny with explanation, not a silent no. |
| "User not registered" (on reinstall) | "Welcome back. Sign in with your phone or email to restore your account." | Reinstall is treated as a return, not a new start. |

## Responsive & Platform

| Breakpoint | Behavior |
|---|---|
| Native (Android 5.5"–6.7") | Single column. Bottom sheets. Thumb-reachable controls. |
| Native (tablet) | Two-column settings only (S7). All other surfaces remain single-column. |
| Web (`≥ lg`, 1024px+) | Two-column settings (S7). Single-column for all other surfaces (`max-w-md`). |
| Web (`< lg`) | Single column. Sheets become dialogs. |

Platform-specific notes:
- **Android:** Back button navigates up. Hardware volume controls call audio. Notification shade does not end the call.
- **iOS:** Home swipe does not end the call (background audio continues). Call continues in background for up to 30min.
- **Web:** Notifications are browser-based (not push). Call is not supported on web (v1); web is auth, settings, billing, and support only.

## Key Flows

### Flow 1 — Sumit, the premium user punished for leaving bad calls (UJ-1)

1. Sumit opens the app at 9:45pm. S1 loads with persistent session (FR-1). No login screen.
2. He taps "Start Calling." S3 opens. His CEFR is B1, gender filter is off. He joins the queue.
3. After 12 seconds, he is matched with a partner. S4 opens. The partner is silent. Sumit waits 20 seconds.
4. He taps and holds the **Skip** button (0.5s). The call ends. S5 appears: "You skipped the call." No strike.
5. He taps "Find new partner." Returns to S3. Queue resumes. New match in 8 seconds.
6. This partner is engaged. They speak for 18 minutes. Sumit backgrounds the app to check a message; the call continues (FR-17).
7. He returns to the app. S4 is restored. He ends the call. S5: "You ended the call." S6: rating screen. He rates 5 stars.
8. **Climax:** Sumit practiced for 18 minutes, skipped one bad match without punishment, and never once saw a warning, a ban, or a login screen. The app was invisible except when it helped.

Failure: If Sumit had tapped "End call" instead of "Skip" on the silent partner, the call duration was <30s, so it counts as a short disconnect. The system notes it but does not warn on the first one. On the third short disconnect in 24h, the warned banner appears on S1: "We noticed you ended 3 calls quickly. If partners aren't a good fit, use Skip." The banner is informative, not punitive. Sumit learns the Skip mechanic.

### Flow 2 — Tahiniyath, the user who cannot stay logged in (UJ-2)

1. Tahiniyath opens the app at 7:30am. The app has been backgrounded for 14 hours. FR-1 ensures she reaches S1 without credentials.
2. She navigates to S7 (Settings). She taps "Subscription." S8 loads. Her plan is active. Auto-renew is on. Renews on 14 July.
3. She backgrounds the app for 2 hours. Returns. Still on S8. No re-auth.
4. At 2pm, her access token is 60 seconds from expiry. FR-2 triggers a silent refresh in the background. She does not see it.
5. At 3pm, she starts a call. Mid-call, the token refreshes. The call does not drop. She does not know it happened.
6. **Climax:** Tahiniyath has used the app three times today and has not seen a login screen once. The session is the most boring part of the app — which is exactly the goal.

Failure: If the silent refresh fails (network blip), the app queues the refresh and retries on the next network opportunity. If the refresh fails 3 times, the app shows a non-blocking toast: "Please sign in again to continue." Tapping it goes to S12. Her session is not instantly destroyed.

### Flow 3 — Vemireddy, the user on flaky Indian 4G (UJ-3)

1. Vemireddy is on a train, commuting home. He opens the app. S1 loads. He taps "Start Calling."
2. S3 queue. Match in 20 seconds. S4 opens. He is matched with a B1 partner.
3. At 3:22pm, the train passes under a bridge. Network drops for 1.5 seconds.
4. S4 shows a brief amber banner: "Reconnecting…" to Vemireddy only. His partner sees nothing. Audio resumes in 500ms. The banner disappears.
5. At 3:25pm, the train switches towers. Network drops for 8 seconds.
6. S4 shows: "Connection lost. Reconnecting…" The amber banner pulses gently. The partner now sees "Connection unstable" under Vemireddy's avatar. Audio is paused.
7. At 3:25:08, network returns. The call resumes. The banner disappears. The partner sees no further indicator.
8. Vemireddy and his partner continue speaking for 12 more minutes. He ends the call.
9. **Climax:** Two network blips, zero call drops, zero re-queues, zero lost time. The 1.5s blip was invisible. The 8s blip was visible but quiet. The call never ended.

Failure: If the 8s blip had extended to 35s, the banner would change to "Connection lost." with "Retry" and "End call" buttons. The call is not silently destroyed. Vemireddy taps "Retry." If network returns, the call resumes. If it does not, he taps "End call." S5: "Call ended — connection lost." No strike. He can re-queue immediately.

### Flow 4 — Hari, the user who paid for gender filtering (UJ-4)

1. Hari is a premium_plus user. He opens S3 and sets gender filter to "Female." He joins the queue.
2. After 45 seconds, he is matched with a female partner. S4 opens. The call proceeds normally.
3. The next day, he sets the filter again. This time, no female partners are online for 3 minutes.
4. S3 shows: "No partners match your filter right now." Below: two options: (a) "Keep waiting" or (b) "Drop filter for this session." Hari chooses (b).
5. He is matched with a male partner. S4 opens. The call is good. He does not disconnect.
6. **Climax:** The system never matched Hari against his filter. It never silently bypassed the filter. It never punished him for the system's empty pool. The honest fallback preserved both the filter contract and the user's trust.

Failure: If Hari had tapped "End call" on a male partner (before the empty-pool fallback), the call duration would be <30s, counting as a short disconnect. But Hari has the Skip button — he should use Skip. If he uses End instead, the warned banner appears after 3 short disconnects, teaching him to use Skip for filter mismatches.

### Flow 5 — Mridu, the user who got auto-renewed (UJ-5)

1. Mridu opens the app on 1 July. He taps S7 → S8. His plan renewed on 30 June. He did not know.
2. S8 shows: "Premium plan. Renews on 30 July. Auto-renew is on." He toggles auto-renew off.
3. A confirmation sheet appears: "You'll keep Premium until 30 July. After that, your plan will not renew." He confirms.
4. S8 updates: "Auto-renew is off. Cancels on 30 July." Mridu still has full access.
5. On 3 July, the app crashes 3 times in one day. Mridu goes to S8 → "Request refund."
6. The refund flow (S9) classifies his request: 3 crashes in 7 days = auto-approve. He sees: "Refund approved. Processing with your payment provider."
7. On 4 July, the refund is processed. S8 shows: "Refund issued. Premium access until 30 July."
8. **Climax:** Mridu stopped paying, got his money back, and never wrote an email. Every money-mechanics surface was visible, editable, and in-app.

Failure: If Mridu's refund had fallen into the "human review" path (e.g., 1 crash, 2 sessions), he would see: "We're reviewing your request. A decision will be made within 7 days." He receives a push notification (or email) when the decision is made. The status is visible in S10 (My tickets). He is never left wondering.

### Flow 6 — New User onboarding (deferred, now resolved)

1. A new user installs the app. S2 opens. Language is auto-detected as English.
2. Step 1: Phone number. User enters +880 1XXX XXXXXX. OTP is sent via SMS. Voice fallback if SMS fails.
3. Step 2: Profile. Name (optional), native language (default: Bangla), English level (CEFR self-rating: A1/Beginner, A2, B1, B2, C1, C2). One-tap selection, no test.
4. Step 3: Community Guidelines. Plain-language summary: "Be respectful. Use Skip for bad matches. Report abuse." User taps "I agree."
5. S1 loads. The user sees "Welcome to AceFluency." A "Start your first call" CTA is primary.
6. **Climax:** The user is on S1, ready to call, in under 90 seconds. No tutorial overlay, no forced walkthrough, no gamified onboarding.

### Flow 7 — Warned User re-entering the app (deferred, now resolved)

1. A warned user opens the app. S1 loads with an amber banner at the top: "We noticed you ended a few calls quickly. If partners aren't a good fit, use Skip." The banner is dismissible (swipe up).
2. The user taps the banner. Goes to S11 (Account standing). S11 shows: "Status: Warned. Reason: 3 short disconnects in 24 hours. This is not a ban. No action needed."
3. The user taps "Contact support." S10 opens. They submit a ticket: "I keep getting matched with silent partners." Ticket ID returned.
4. The user returns to S1. The banner is still there but does not block any action. They can still queue, call, and use all features.
5. **Climax:** The user knows why they are warned, what they can do about it, and how to get help. The warning is information, not punishment.

### Flow 8 — Reinstaller (deferred, now resolved)

1. A user uninstalls the app, then reinstalls it a month later.
2. S12 opens. "Welcome back. Sign in with your phone or email to restore your account."
3. User enters the same phone number. OTP sent. Signed in.
4. S1 loads. Full account restored: subscription status, CEFR level, call history, tickets, streaks. Everything is server-authoritative.
5. **Climax:** The user did not lose anything. The reinstall felt like returning home, not starting over.

---

*End of EXPERIENCE.md. Cross-references DESIGN.md tokens via `{path.to.token}` syntax. Spines win on conflict with any mock, wireframe, or import.*