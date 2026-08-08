# AceFluency Native — App Architecture, Screen Inventory & Roadmap

> Companion to `PRODUCT.md` (product truth) and `DESIGN.md` (visual system). This document is the full-scope rebuild plan confirmed 2026-07-30: complete IA, screen inventory, gap analysis against the current codebase, component library, key flows, UX findings, production checklist, and phased roadmap.
>
> Legend: **[BUILT]** exists in `app/` today and is functional · **[REBUILD]** exists but needs a full visual/UX rebuild in Golden Hour Studio · **[NEW]** does not exist yet.

---

## 1. Information Architecture

### Bottom navigation (5 tabs, per brief)

| Tab | Route | Replaces |
|---|---|---|
| **Home** | `app/(app)/(tabs)/home.tsx` | `(drawer)/(tabs)/index.tsx` |
| **Classes** | `app/(app)/(tabs)/classes/index.tsx` | new — trainer/coaching hub |
| **Rooms** | `app/(app)/(tabs)/rooms/index.tsx` | `(drawer)/(tabs)/rooms.tsx` |
| **Learning** | `app/(app)/(tabs)/learning/index.tsx` | merges `recommendations.tsx` + new course/audio/vocab/AI-test hub |
| **My View** | `app/(app)/(tabs)/my-view/index.tsx` | merges `progress.tsx` + streak/network/community |

The existing `(drawer)` wrapper is dropped: a hamburger drawer is not in the brief's IA and competes with the 5-tab model. `two.tsx` and `ai.tsx` (as a standalone tab) are retired; AI Speaking Test moves under **Learning** as a first-class card, matching its role in the old app's My View / Learning surfaces.

### Global chrome (reachable from Home header / My View, not tabs)

Account, Notifications, Search, Messages, Settings — each a stack route off the tab root, per brief:

- `app/(app)/account/index.tsx`
- `app/(app)/notifications/index.tsx`
- `app/(app)/search/index.tsx`
- `app/(app)/messages/index.tsx`
- `app/(app)/settings/index.tsx`

### Top-level stacks (outside tabs)

- `app/(auth)/…` — splash through onboarding through login
- `app/call/…` — 1:1 calling (existing, extended)
- `app/rooms/[id]/…` — room detail and live session
- `app/classes/…` — trainer discovery, profile, booking
- `app/subscription/…` — pricing, checkout, plan management
- `app/ai-test/…` — AI speaking test flow
- `app/courses/…` — video/audio course library and players
- `app/legal/…` — guidelines, policy, terms

---

## 2. Complete Screen Inventory

### 2.1 Authentication & Onboarding

| Screen | Route | Status |
|---|---|---|
| Splash | `app/(auth)/splash.tsx` | [NEW] |
| App loading | `app/(auth)/loading.tsx` | [NEW] |
| Welcome onboarding (carousel) | `app/(auth)/onboarding/welcome.tsx` | [NEW] |
| Feature introduction | `app/(auth)/onboarding/features.tsx` | [NEW] |
| Language selection | `app/(auth)/onboarding/language.tsx` | [NEW] |
| Learning goal selection | `app/(auth)/onboarding/goal.tsx` | [NEW] |
| Current English level | `app/(auth)/onboarding/level.tsx` | [NEW] |
| Daily goal setup | `app/(auth)/onboarding/daily-goal.tsx` | [NEW] |
| Login | `app/(auth)/login.tsx` | [REBUILD] — `components/sign-in.tsx` exists, unstyled |
| Signup | `app/(auth)/signup.tsx` | [REBUILD] — `components/sign-up.tsx` exists, unstyled |
| Phone verification (OTP) | `app/(auth)/verify-phone.tsx` | [REBUILD] — `components/phone-sign-in.tsx` exists |
| Email verification | `app/(auth)/verify-email.tsx` | [NEW] |
| Forgot password | `app/(auth)/forgot-password.tsx` | [NEW] |
| Reset password | `app/(auth)/reset-password.tsx` | [NEW] |
| Create profile | `app/(auth)/onboarding/profile.tsx` | [NEW] |
| Upload avatar | `app/(auth)/onboarding/avatar.tsx` | [NEW] |
| Permission requests (mic/notifications) | `app/(auth)/onboarding/permissions.tsx` | [NEW] |
| Account recovery | — | [BUILT] `components/account-recovery.tsx` |
| Google sign-in | — | [BUILT] `components/google-sign-in.tsx` |
| States: loading / error / offline / verification-failed | shared components, not routes | [NEW] |

### 2.2 Home

| Screen | Route | Status |
|---|---|---|
| Home dashboard | `app/(app)/(tabs)/home.tsx` | [REBUILD] — `(drawer)/(tabs)/index.tsx` is functional but Quiet Studio |
| Home search | `app/(app)/search/index.tsx` | [NEW] |
| Personalized recommendation detail | `app/(app)/recommendation/[id].tsx` | [NEW] — replaces flat `recommendations.tsx` |
| Feed / content detail | `app/(app)/content/[id].tsx` | [NEW] |
| Announcement detail | `app/(app)/announcement/[id].tsx` | [NEW] |

### 2.3 Subscription

| Screen | Route | Status |
|---|---|---|
| Pricing page | `app/subscription/pricing.tsx` | [REBUILD] — `(drawer)/subscription.tsx` exists |
| Plan comparison | `app/subscription/compare.tsx` | [NEW] |
| Subscription details | `app/subscription/index.tsx` | [NEW] |
| Benefits / membership spotlight | `app/subscription/spotlight.tsx` | [NEW] |
| Coupon application | component within checkout | [NEW] |
| Checkout | `app/subscription/checkout.tsx` | [NEW] |
| Payment method | `app/subscription/payment-method.tsx` | [NEW] — wraps `components/payment-webview-modal.tsx` (built) |
| Payment success / failed / pending | `app/subscription/result/[status].tsx` | [NEW] |
| Invoice | `app/subscription/invoice/[id].tsx` | [NEW] |
| Purchase history | `app/(app)/account/purchase-history.tsx` | [NEW] |
| Active plans | `app/(app)/account/plans.tsx` | [NEW] |
| Cancel subscription | `app/subscription/cancel.tsx` | [NEW] |
| Restore subscription | action from pricing page | [NEW] |

### 2.4 Classes (Coaching + Trainers)

| Screen | Route | Status |
|---|---|---|
| Classes dashboard | `app/(app)/(tabs)/classes/index.tsx` | [NEW] |
| Personal coaching | `app/(app)/(tabs)/classes/coaching.tsx` | [NEW] |
| Group classes | `app/(app)/(tabs)/classes/groups.tsx` | [NEW] |
| Trial booking | `app/classes/trial.tsx` | [NEW] |
| Trainer list / discovery | `app/classes/trainers/index.tsx` | [NEW] |
| Trainer search | `app/classes/trainers/search.tsx` | [NEW] |
| Trainer filters | bottom sheet component | [NEW] |
| Trainer profile | `app/classes/trainers/[id].tsx` | [NEW] |
| Trainer availability / calendar booking | `app/classes/trainers/[id]/book.tsx` | [NEW] |
| Booking confirmation | `app/classes/booking-confirmed.tsx` | [NEW] |
| Upcoming classes | `app/(app)/(tabs)/classes/upcoming.tsx` | [NEW] |
| Completed classes / history | `app/(app)/(tabs)/classes/history.tsx` | [NEW] |
| Cancel class | modal from upcoming | [NEW] |
| Reschedule class | `app/classes/reschedule/[id].tsx` | [NEW] |
| Reviews | component on trainer profile | [NEW] |
| States: no classes / no availability / booking failed / loading | shared states | [NEW] |

### 2.5 Trainer Experience (detail, distinct from booking)

| Screen | Route | Status |
|---|---|---|
| Trainer discovery | see 2.4 | — |
| Introduction video | embedded on profile | [NEW] |
| Ratings / reviews / expertise / languages / experience | profile sections | [NEW] |
| Schedule | profile section | [NEW] |
| Chat with trainer | `app/messages/[trainerId].tsx` | [NEW] |
| Trainer call | reuses `app/call/[room].tsx` | [REBUILD] |

### 2.6 Live Rooms Community

| Screen | Route | Status |
|---|---|---|
| Room discovery | `app/(app)/(tabs)/rooms/index.tsx` | [REBUILD] — `rooms.tsx` is a placeholder today |
| Categories | section on discovery | [NEW] |
| Search rooms | `app/(app)/(tabs)/rooms/search.tsx` | [NEW] |
| Upcoming rooms | section on discovery | [NEW] |
| Live rooms list | section on discovery | [NEW] |
| Create room | `app/rooms/create.tsx` | [NEW] |
| Premium restriction (paywall modal) | shared paywall sheet | [NEW] |
| Room details | `app/rooms/[id]/index.tsx` | [NEW] |
| Join confirmation | modal | [NEW] |
| Live room (in-session) | `app/rooms/[id]/live.tsx` | [NEW] — host/speaker/listener tiles, raise hand, invite, share, chat, report, block, leave, recording indicator |
| Room ended | `app/rooms/[id]/ended.tsx` | [NEW] |
| Room analytics (host) | `app/rooms/[id]/analytics.tsx` | [NEW] |
| Host controls / moderator controls | sheets within live room | [NEW] |

### 2.7 1:1 Calling System

| Screen | Route | Status |
|---|---|---|
| Find learner / matching | `app/call/matching.tsx` | [BUILT], [REBUILD] visual |
| Waiting queue | within matching.tsx | [BUILT] |
| Lobby | `app/call/lobby.tsx` | [BUILT], [REBUILD] visual |
| Active call | `app/call/[room].tsx` | [BUILT] — 1071 lines, most mature screen |
| Call timer / suggested topics | within `[room].tsx` | [BUILT] |
| Safety warning | within `[room].tsx` | [BUILT] |
| End call | `app/call/ended.tsx` | [BUILT] |
| Rate user | within `ended.tsx` | [BUILT] |
| Report user | sheet within call | [NEW] — flag exists per screenshots, verify coverage |
| Call history | `app/(app)/account/call-history.tsx` | [NEW] |
| States: connection failed / poor network / mic denied / camera denied | shared | [NEW] |

### 2.8 AI Speaking Test

| Screen | Route | Status |
|---|---|---|
| AI trainer introduction | `app/ai-test/index.tsx` | [NEW] |
| Topic selection / categories | `app/ai-test/topics.tsx` | [REBUILD] — `(drawer)/ai.tsx` + `(tabs)/ai.tsx` exist, partial |
| Speaking instructions | within topic detail | [NEW] |
| Permission request | shared permission sheet | [NEW] |
| Recording screen (timer, waveform, stop) | `app/ai-test/record/[topicId].tsx` | [NEW] |
| Upload / analysis loading | within record screen | [NEW] |
| Results: transcript, grammar/vocab/fluency/pronunciation scores, feedback, corrections, suggestions | `app/ai-test/results/[attemptId].tsx` | [NEW] |
| Progress graph / history | `app/ai-test/history.tsx` | [NEW] |
| History paywall / upgrade | shared paywall sheet | [NEW] |

### 2.9 Learning Content

| Screen | Route | Status |
|---|---|---|
| Course library | `app/courses/index.tsx` | [NEW] |
| Categories / search | within library | [NEW] |
| Course details | `app/courses/[id].tsx` | [NEW] |
| Instructor | section on course detail | [NEW] |
| Lessons list (locked/unlocked) | within course detail | [NEW] |
| Video player | `app/courses/[id]/lesson/[lessonId].tsx` | [NEW] |
| Progress tracking / continue learning | My View + course detail | [NEW] |
| Audio library | `app/courses/audio/index.tsx` | [NEW] |
| Audio categories / levels | within audio library | [NEW] |
| Audio player (episodes, download, speed, progress) | `app/courses/audio/[id].tsx` | [NEW] |
| Daily words | `app/vocabulary/index.tsx` | [NEW] |
| Word detail / practice / saved words | `app/vocabulary/[wordId].tsx`, `app/vocabulary/saved.tsx` | [NEW] |
| Translator | `app/(app)/translator.tsx` | [NEW] |
| Translation history | within translator | [NEW] |
| Daily news list | `app/news/index.tsx` | [NEW] |
| Article detail | `app/news/[id].tsx` | [NEW] |

### 2.10 Gamification

| Screen | Route | Status |
|---|---|---|
| Daily streak (My View card) | `(tabs)/my-view/index.tsx` section | [NEW] |
| Streak detail | `app/streak/index.tsx` | [NEW] |
| Rewards / stars | `app/rewards/index.tsx` | [NEW] |
| Achievements | `app/achievements/index.tsx` | [NEW] |
| Leaderboard | `app/leaderboard/index.tsx` | [NEW] |
| Share streak | native share sheet trigger | [NEW] |
| Challenges | `app/challenges/index.tsx` | [NEW] |

### 2.11 Social System

| Screen | Route | Status |
|---|---|---|
| Friend list | `app/(app)/friends/index.tsx` | [NEW] |
| Requests (pending) | `app/(app)/friends/requests.tsx` | [NEW] |
| Search users | `app/(app)/friends/search.tsx` | [NEW] |
| User profile (other user) | `app/(app)/user/[id].tsx` | [NEW] |
| Follow / block | actions on profile | [NEW] |
| Communities list | `app/communities/index.tsx` | [NEW] |
| Join community | action on community card | [NEW] |
| Community detail | `app/communities/[id].tsx` | [NEW] |
| Posts / members | within community detail | [NEW] |
| Inbox | `app/(app)/messages/index.tsx` | [NEW] |
| Conversation / chat / attachments | `app/(app)/messages/[id].tsx` | [NEW] |
| Report (message) | sheet within conversation | [NEW] |

### 2.12 Profile / Account

| Screen | Route | Status |
|---|---|---|
| Account | `app/(app)/account/index.tsx` | [NEW] — see old app entry 74 for reference layout |
| Edit profile | `app/(app)/account/edit.tsx` | [NEW] |
| Learning stats / performance dashboard | `app/(app)/account/performance.tsx` | [NEW] |
| Achievements | see 2.10 | — |
| My classes / my plans | see 2.3 / 2.4 | — |
| Wallet | `app/(app)/account/wallet.tsx` | [NEW] |
| Referral | `app/(app)/account/referral.tsx` | [NEW] |
| Purchase history / call history | see 2.3 / 2.7 | — |
| Friends | see 2.11 | — |
| Support | see 2.13 | — |

### 2.13 Support System

| Screen | Route | Status |
|---|---|---|
| Help center | `app/(app)/support/index.tsx` | [NEW] |
| FAQ | `app/(app)/support/faq.tsx` | [NEW] |
| Search FAQ | within faq.tsx | [NEW] |
| Contact support | `app/(app)/support/contact.tsx` | [NEW] |
| Ticket creation | `app/(drawer)/ticket/index.tsx` → move to `app/(app)/support/ticket/new.tsx` | [BUILT], relocate |
| Ticket details | `app/(drawer)/ticket/[id].tsx` → move to `app/(app)/support/ticket/[id].tsx` | [BUILT], relocate |
| Feedback | `app/(app)/support/feedback.tsx` | [NEW] |
| Rate app | native store-review prompt + fallback screen | [NEW] |

### 2.14 Notifications

| Screen | Route | Status |
|---|---|---|
| Notification list | `app/(app)/notifications/index.tsx` | [NEW] |
| Empty notification | state within list | [NEW] |
| Notification detail | `app/(app)/notifications/[id].tsx` | [NEW] |
| Notification settings | `app/(app)/settings/notifications.tsx` | [NEW] |

### 2.15 Settings

| Screen | Route | Status |
|---|---|---|
| Settings root | `app/(app)/settings/index.tsx` | [REBUILD] — `(drawer)/settings.tsx` exists, 330 lines |
| Account settings | `app/(app)/settings/account.tsx` | [NEW] |
| Privacy | `app/(app)/settings/privacy.tsx` | [NEW] |
| Security | `app/(app)/settings/security.tsx` | [NEW] |
| Language | `app/(app)/settings/language.tsx` | [NEW] |
| Theme | `app/(app)/settings/theme.tsx` | [NEW] |
| Notification preferences | see 2.14 | — |
| Audio settings | `app/(app)/settings/audio.tsx` | [NEW] |
| Delete account | `app/(app)/settings/delete-account.tsx` | [NEW] |
| Logout | action, no dedicated screen | [BUILT] |

### 2.16 Legal

| Screen | Route | Status |
|---|---|---|
| Community guidelines | `app/legal/guidelines.tsx` | [NEW] — old app used a mandatory onboarding gate modal (see `docs/screenshots.md` #18); carry that pattern forward |
| Privacy policy | `app/legal/privacy.tsx` | [NEW] |
| Terms | `app/legal/terms.tsx` | [NEW] |
| Safety center | `app/legal/safety.tsx` | [NEW] |
| Report abuse | shared report sheet, reused across rooms/calls/messages | [NEW] |

### 2.17 Cross-cutting System States

| State | Where used | Status |
|---|---|---|
| Skeleton / shimmer loading | every list/card screen | [NEW] component |
| Progress (determinate) | uploads, checkout, AI analysis | [NEW] component |
| Network error / server error | global error boundary + inline | [BUILT] `components/error-boundary.tsx`, [REBUILD] visual |
| Empty state | every list screen | [NEW] component, several bespoke copies |
| Permission denied | mic/camera/notifications | [NEW] |
| Retry | paired with every error state | [NEW] |
| Payment / booking / profile-updated / upload success | toast + optional full-screen | [NEW] |
| Offline mode / retry connection | global banner | [NEW] |

**Total: ~205 screens/states across 17 systems. Built or partially built today: ~14. Net-new: ~190.**

---

## 3. Component Library (atomic design)

Lives under `apps/native/components/ui/` (new), consumed by every screen above. Built against `DESIGN.md` tokens — see that file for exact specs.

**Atoms:** ButtonPrimary, ButtonSecondary, ButtonGhost, IconButton, Avatar (with live/streak ring), Badge, StreakChip, ProBadge, LiveDot, Input, Checkbox, RadioTile, StarRating, ProgressBar, CircularTimer, Skeleton, Divider, Chip/FilterPill.

**Molecules:** SectionHeader (title + "See all"), ListRow, EmptyState, StatTile, ReviewRow, PriceTierCard, TrainerCard, RoomCard, CourseCard, AudioEpisodeRow, NotificationRow, MessageBubble, ToastBanner, ScoreBar (AI results), WaveformVisualizer.

**Organisms:** HomeHeader, StreakBand, TalkTimeBand, LiveDiscussionBanner, TrainerCarousel, CourseGrid, PaywallSheet, BookingCalendar, SpeakerTileGrid (live room), CallControlTray, ChatPanel, FilterSheet, ReportSheet.

**Templates:** LearnScreenShell (Cream background, safe-area, scroll), StageScreenShell (Stage background, no safe-area top inset bleed for immersive call/room screens), FormScreenShell (auth/onboarding), ModalSheetShell.

Build order matches the roadmap in §6 — atoms and the two shell templates first, since every other screen depends on them.

---

## 4. Key User Flows

**Onboarding → first practice.** Splash → Welcome → Language → Level → Goal → Signup/Login → Phone/Email verify → Profile → Avatar → Permissions → Community Guidelines gate → Home. Old app data (`docs/screenshots.md` #18) confirms guidelines are a mandatory, non-dismissable "I Agree" gate — preserve that.

**Practice call.** Home "Talk now" (gradient CTA) → Matching (Stage, animated search) → Lobby → Active call (Stage, timer, suggested topic, safety notice, streak progress) → Ended → Rate partner (optional, always skippable) → Home.

**Book a trainer.** Classes tab → Trainer list/search/filters → Trainer profile (video, ratings, bio) → Availability/calendar → Book → Payment method → Booking confirmed → Upcoming classes.

**Live room.** Rooms tab → Category or search → Room details → Join confirmation (or premium-restriction paywall if creating) → Live room (speaker grid, raise hand, chat, moderation) → Leave → Room ended → optional analytics (host only).

**AI speaking test.** Learning → AI Speaking Test → Topic selection → Instructions/permission → Recording (60s timer, waveform, urgent state under 20s) → Submit → Analysis loading → Results (transcript, 4 scores, errors, corrections) → History (paywall-gated if free tier).

**Subscription.** Any paywall trigger (room creation, advanced-learner queue, AI history, gender filter) → Pricing → Plan selection → Coupon → Checkout → Payment method → Success/Failed/Pending → Invoice → Active in Account.

**Streak completion.** My View streak card → "Complete today's streak" → choice sheet (Start Calling / Join a Room) → routes into the relevant flow → progress bar updates live → completion confetti + share prompt.

---

## 5. UX Findings & Improvements (critique pass)

Findings from comparing the old app (`docs/screenshots.md`) against the brief and current codebase — apply these during rebuild, not as a separate pass:

1. **Repeated "Still confused? WhatsApp counsellor" interstitials** (old app entries 22, 25, 41, 43) appeared as blocking modals on course pages, sometimes twice per session. Rebuild as a persistent, dismissable inline card, never a modal that blocks reading price/content — cognitive-load and conversion issue.
2. **Broken avatar image with no fallback** (old app entry 52) — every `Avatar` atom must have an initials/gradient fallback, never a raw broken-image icon.
3. **Hard paywall on AI test history with no preview** (old app entry 29) — show a blurred/locked preview of the last result instead of a blank gate, so the value being paid for is visible.
4. **Eligibility-gated "Advanced learners" queue with no forward path shown at the point of failure** (old app entry 44) — the rejection modal should link directly to "build your rating" (main queue), not just explain the rule.
5. **Currency/pricing inconsistency across surfaces** (BDT subscription vs. USD course vs. $2 Razorpay checkout in the same session, old app entries 1, 23, 34) — resolve to one locale-derived currency per user, shown consistently end-to-end.
6. **Community Guidelines gate has no visible "why" or appeal path** — keep the mandatory gate (moderation requirement) but add a link to the full Safety Center for context, satisfying the "fair and transparent moderation" product principle.
7. **Trust signals underused for trainers** — old app shows star + session count but no verified badge on most cards (only some, entry 52). Standardize a Verified badge across all trainer surfaces.

---

## 6. Production Checklist

- [ ] Design tokens (`theme.ts`) match `DESIGN.md` exactly; no hardcoded hex/px in screen code.
- [ ] Every screen has loading, empty, error, and offline states (§2.17).
- [ ] Every list is virtualized (FlashList/FlatList), not `.map()` in a ScrollView, past ~20 items.
- [ ] Every gradient CTA has a single, unambiguous primary action per screen (design rule, not just visual).
- [ ] Dynamic Type / Material type scale verified at largest OS text size on 3 flagship screens.
- [ ] Reduced-motion respected for streak pulse, confetti, waveform.
- [ ] All payment flows tested against both SSLCommerz (BDT) and Razorpay (INR) sandbox, plus the USD course-pricing path.
- [ ] Report/block coverage parity across calls, rooms, messages, and user profiles (old app had per-surface gaps).
- [ ] Community Guidelines gate blocks first use and is re-shown after policy version bump.
- [ ] Offline queueing verified for post-call ratings and streak progress (old app already did this for ratings — preserve).
- [ ] Accessibility labels on every icon-only control (call controls, room controls, tab bar).
- [ ] Crash-free session rate and call-drop telemetry wired before removing the `[REBUILD]` tag from `app/call/[room].tsx`.

---

## 7. Implementation Roadmap (phased)

**Phase 0 — Foundation (this session).** Design system tokens in `theme.ts`/`unistyles.ts`, font loading (Sora/Manrope), core atom + shell components, new 5-tab nav shell.

**Phase 1 — Flagship proof screens (this session).** Home dashboard, AI Speaking Test (topics + results), Subscription pricing/paywall — the three screens that most directly demonstrate Golden Hour Studio across Learn, AI, and premium registers.

**Phase 2 — Core loops.** Rebuild Classes tab + trainer discovery/profile/booking; rebuild Rooms discovery + live room session; rebuild the call flow visuals (matching/lobby/call/ended already function, need Stage-register reskin).

**Phase 3 — Learning content.** Course library, video/audio players, vocabulary, translator, daily news.

**Phase 4 — Social + gamification.** Friends, communities, messaging, streak detail, achievements, leaderboard.

**Phase 5 — Account, support, settings, legal, notifications.** Lower-frequency but required-for-launch surfaces; mostly list/detail patterns reusing Phase 0 atoms, fastest phase per screen.

**Phase 6 — Hardening.** Full production checklist (§6), accessibility audit, performance pass (list virtualization, image caching), Bangla i18n scaffolding (strings only, not full translation — per root `PRODUCT.md`).

Phases 2–6 continue in subsequent sessions; this session ships Phase 0 and Phase 1 in code, with the full plan above as the contract for what follows.
