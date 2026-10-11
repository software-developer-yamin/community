---
name: AceFluency Native Design System — Golden Hour Studio
description: Premium, energetic design system for the AceFluency native app (Expo/React Native) — a voice-first English fluency social platform. Replaces "Quiet Studio" monochrome for this surface only; the web admin (apps/web) keeps Quiet Studio untouched.
colors:
  # Warm neutrals — Light / "Learn" mode (browsing, courses, profile, everything but live voice)
  cream: "#FFFBF5"            # page background, light mode
  paper: "#FFFFFF"             # card surface, light mode
  sand: "#F1E7DA"              # hairline border, light mode
  ink: "#1A1523"                # primary text, light mode (warm near-black, violet-tinted)
  ink-muted: "#6B6478"         # secondary text, light mode
  # Stage neutrals — Dark / "Live" mode (call, matching, live rooms — always dark regardless of system theme)
  stage: "#0E0B14"             # page background, live contexts
  stage-card: "#1B1626"        # card surface, live contexts
  stage-border: "rgba(255,255,255,0.08)"
  stage-ink: "#F5F2FA"         # primary text, live contexts
  stage-ink-muted: "#A79FBD"   # secondary text, live contexts
  # Brand — Practice Gradient (the signature)
  violet: "#6C4DFF"            # primary solid, links, icons, focus ring
  violet-deep: "#4B31D6"       # primary pressed state
  coral: "#FF6B4A"             # gradient terminus, streak/energy accent
  coral-deep: "#E8502F"        # coral pressed state
  # Gamification accents
  ember: "#FF8C42"             # streak flame
  progress-green: "#17B978"    # success, correct answers, completed lessons
  sky: "#2FB6E0"                # gems/stars currency, info accents, AI moments
  aurum: "#E8B34C"              # Pro/premium gold, MasterClass-register badges
  # Semantic
  alert: "#E23D42"              # destructive, warm red
  alert-surface: "rgba(226,61,66,0.1)"
  warning: "#F5A623"
  warning-surface: "rgba(245,166,35,0.12)"
  info: "#2FB6E0"
  info-surface: "rgba(47,182,224,0.12)"
typography:
  display:
    fontFamily: "Sora-Bold"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Sora-Bold"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Sora-SemiBold"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Manrope-Regular"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  bodyStrong:
    fontFamily: "Manrope-SemiBold"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Manrope-SemiBold"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
  caption:
    fontFamily: "Manrope-Medium"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  # Respects Dynamic Type (iOS) / Material type scale (Android): sizes above are floor anchors, not ceilings.
rounded:
  xs: "8px"      # chips, small badges
  sm: "12px"     # inputs, small cards
  md: "16px"     # standard cards
  lg: "20px"     # large cards, sheets
  xl: "28px"     # hero cards, modals
  full: "9999px" # buttons (pill), avatars, tab bar, tags
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  ButtonPrimary:
    backgroundColor: "gradient({violet}, {coral})"
    textColor: "#FFFFFF"
    typography: "{typography.bodyStrong}"
    rounded: "{rounded.full}"
    padding: "16px 24px"
    height: "56px"
    shadow: "0 8px 24px rgba(255,107,74,0.28)"
  ButtonSecondary:
    backgroundColor: "{paper}"
    textColor: "{ink}"
    typography: "{typography.bodyStrong}"
    rounded: "{rounded.full}"
    padding: "16px 24px"
    height: "56px"
    borderWidth: "1.5px"
    borderColor: "{sand}"
  ButtonGhost:
    backgroundColor: "transparent"
    textColor: "{violet}"
    typography: "{typography.bodyStrong}"
    rounded: "{rounded.full}"
    padding: "12px 16px"
    height: "44px"
  Card:
    backgroundColor: "{paper}"
    textColor: "{ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "20px"
    shadow: "0 4px 16px rgba(108,77,255,0.08)"
  StageCard:
    backgroundColor: "{stage-card}"
    textColor: "{stage-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "20px"
    borderWidth: "1px"
    borderColor: "{stage-border}"
  Badge:
    backgroundColor: "{violet}"
    textColor: "#FFFFFF"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  StreakChip:
    backgroundColor: "gradient({ember}, {coral})"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  ProBadge:
    backgroundColor: "gradient(#F7D77E, {aurum})"
    textColor: "#4A3306"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  Input:
    backgroundColor: "{cream}"
    textColor: "{ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "52px"
    borderWidth: "1.5px"
    borderColor: "{sand}"
  TabBar:
    backgroundColor: "{paper}"
    rounded: "{rounded.full}"
    height: "64px"
    shadow: "0 8px 24px rgba(26,21,35,0.10)"
---

# Design System — AceFluency Native (Golden Hour Studio)

## Direction contract

**THESIS.** AceFluency's mechanism is a live human on the other end of the call — the product is talking to someone, right now. The category default for learning apps is a quiet, flat productivity tool (grey cards, sober type, restrained everything); that reads as "textbook app," which is exactly the fear the user is trying to overcome. This surface refuses that arrangement: it should feel warm-blooded, social, and a little electric — closer to opening a live studio than a settings screen.

**OWN-WORLD.** Golden Hour Studio: warm cream light-mode surfaces for everything you browse (courses, profile, trainers), a true near-black "Stage" mode reserved for live voice contexts (matching, calls, live rooms — Clubhouse's dark stage, purpose-built, not a blanket dark theme). One signature gradient — Violet `#6C4DFF` → Coral `#FF6B4A`, the "Practice Gradient" — carries every primary action, premium moment, and AI touchpoint. Fully rounded pill buttons and big soft-cornered cards, floating on warm-tinted shadows instead of hairlines. Sora carries display/headline personality; Manrope carries body and UI text.

**STORY.** Open the app → feel the streak and today's progress as something alive, not a stat → see who's live and ready to talk right now → one tap, gradient CTA, into a call or room.

**FIRST VIEWPORT (Home).** Warm header band: avatar, greeting, streak flame chip, Pro pill. Below it, a live-pulse banner for active group discussions/rooms. Then the single largest, boldest element on the screen: the gradient "Talk now" card — bigger than any content card below it.

**FORM.** Not a concept-seed roll — the brief itself pins the reference constellation (Duolingo, Cambly, italki, Clubhouse, MasterClass, AI speaking coach). Per the standing-exit rule, a brief-pinned constellation is executed at full fidelity, synthesized into one coherent world rather than five pasted-together looks: Duolingo's gamified warmth and rounded confidence, Cambly/italki's trust-building tutor-marketplace cards, Clubhouse's dark live-stage register, MasterClass's premium gold-on-black for spotlight moments, and a gradient/waveform vocabulary for AI touchpoints.

## Overview

Two registers, one system:

- **Learn register** (light, warm cream) — home, classes, learning content, profile, settings, social. This is where users spend most of their time browsing, choosing, and reviewing.
- **Live register** (dark stage) — matching, 1:1 calls, live voice rooms. Dark is chosen for the use scene, not the category: voice rooms read as intimate, focused, low-glare spaces (a phone screen glowing in a quiet room at night), and matches the Clubhouse-native grammar users already associate with live audio. It is not a light/dark theme toggle — Stage is a fixed register for these three flows regardless of system appearance settings.

The Practice Gradient (Violet → Coral) is the connective tissue between both registers: it appears identically in Learn (CTA buttons, premium ribbons) and Live (call-connect states, AI touchpoints), so a user always recognizes "this is the doing-the-thing color" wherever they are.

## Colors

### Learn register (light)
- **Cream** `#FFFBF5` — page background. Warm off-white, not stark white — this is the single biggest signal that the app is not a sober productivity tool.
- **Paper** `#FFFFFF` — card surface, sits one step lighter than Cream so cards read as distinct without a border doing all the work.
- **Sand** `#F1E7DA` — hairline border, used sparingly (inputs, secondary buttons) — most separation comes from shadow, not line.
- **Ink** `#1A1523` / **Ink Muted** `#6B6478` — text. Violet-tinted near-black, not true grey — ties body copy back to the brand hue even at low chroma.

### Live register (stage)
- **Stage** `#0E0B14` — background for matching, call, and live-room screens only.
- **Stage Card** `#1B1626` — speaker tiles, control trays, sheets within Live screens.
- **Stage Border** `rgba(255,255,255,0.08)` — the one place a hairline border returns, doing the Clubhouse "etched" edge on floating tiles.
- **Stage Ink** `#F5F2FA` / **Stage Ink Muted** `#A79FBD`.

### Brand — Practice Gradient
- **Violet** `#6C4DFF` — the solid form of the brand color: links, active icons, focus rings, the AI/assistant voice.
- **Coral** `#FF6B4A` — the warm terminus: streak energy, urgency, the "go" feeling.
- Combined as a 135°–160° linear gradient, Violet → Coral, this is the fill for every primary CTA, the Pro-tier spotlight (paired with Aurum, see below), and any AI-generated content surface (speaking test prompts, AI feedback cards).

### Gamification accents
- **Ember** `#FF8C42` — streak flame icon and streak-chip gradient partner (paired with Coral).
- **Progress Green** `#17B978` — correct answers, completed lesson checkmarks, success toasts. This is the only place pure green appears; it never leaks into brand or navigation.
- **Sky** `#2FB6E0` — gems/stars currency, informational accents, AI waveform secondary color.
- **Aurum** `#E8B34C` — Pro/Premium gold. Reserved for membership spotlight cards, paywalls, and the Pro badge — paired with near-black for a MasterClass-register moment that reads as genuinely premium, not just "another color."

### Semantic
- **Alert** `#E23D42` (destructive, tinted `10%` for surfaces) — end call, block, report, delete.
- **Warning** `#F5A623` (tinted `12%`) — connection issues, expiring trials.
- **Info** `#2FB6E0` (tinted `12%`) — reuses Sky; informational banners.

### Named rules
1. **Two-register rule.** Learn is always light/cream. Live (matching, call, room) is always Stage dark. Never mix — a call screen does not go light, a course list does not go dark, regardless of system theme.
2. **Gradient-means-action rule.** The Violet→Coral gradient is reserved for the single primary action or premium moment per screen. A screen with three gradient buttons has diluted the signal to zero — pick the one thing that matters.
3. **Green stays literal.** Progress Green means "correct / done / success" and nothing else. It is never used decoratively.
4. **Gold stays rare.** Aurum appears only in Pro/premium contexts. If gold shows up outside a paywall, spotlight, or Pro badge, it's been used wrong.

## Typography

**Sora** (display/headline/title) carries the app's personality — geometric, confident, slightly rounded terminals that echo the pill-button language without being a novelty face. **Manrope** (body/label/caption) is the workhorse: warm humanist proportions, excellent at small sizes, distinct from the web admin's Inter so the two surfaces never feel like reskins of each other.

- **Display** `34px / 700 / -0.02em` — streak day-count, big score numbers, hero headline on onboarding/paywall.
- **Headline** `22px / 700 / -0.01em` — section titles ("Talk with Advanced Learners", "Your Progress").
- **Title** `18px / 600` — card titles, modal headers.
- **Body** `16px / 400` — default reading text.
- **Body Strong** `16px / 600` — button labels, emphasized list rows.
- **Label** `13px / 600 / 0.01em` — chips, tab labels, form labels.
- **Caption** `12px / 500 / 0.01em` — timestamps, counts, fine print.

### Named rules
1. **Two-face rule.** Sora and Manrope only. No third face, no monospace (this product has no code/data-measurement content that would justify one).
2. **Dynamic Type respected.** Sizes above are floor anchors; native must scale with the user's OS text-size setting, per platform convention.
3. **Tracked uppercase labels are load-bearing, not decorative.** Use Label-caps only for real status ("LIVE", "PRO", "NEW") — never as a section eyebrow with no informational content.

## Layout & Shape

| Token | Value | Used by |
|---|---|---|
| `xs` | 8px | chip radius |
| `sm` | 12px | inputs, small cards |
| `md` | 16px | standard cards |
| `lg` | 20px | large cards, bottom sheets |
| `xl` | 28px | hero cards, modals |
| `full` | 9999px | buttons, avatars, tab bar, tags |

Spacing scale: `xs 4 / sm 8 / md 16 / lg 24 / xl 32 / xxl 48`, unchanged from the prior system — it was never the problem.

### Named rules
1. **Pill-button rule.** Every tappable button is `rounded.full`. This is the sharpest possible reversal of the prior "sharp actions" rule, and it is deliberate: rounded pills are the Duolingo/Cambly grammar this product now speaks.
2. **Soft-card rule.** Cards round at `lg`–`xl` (20–28px), never less. Small radii read as "admin tool"; this app should feel closer to a well-made physical object.
3. **Touch-target rule.** Minimum 44×44pt iOS / 48×48dp Android, same as before — non-negotiable regardless of visual reskin.

## Elevation & Depth

Depth returns as a primary tool here — the opposite of Quiet Studio's border-only stance. Shadows are warm-tinted (violet or coral, low opacity, real offset+blur — never a zero-offset glow), and they scale with importance: the primary CTA carries the most visible shadow on the screen, a resting card the least.

- **Card shadow:** `0 4px 16px rgba(108,77,255,0.08)` — quiet, present, violet-tinted.
- **Primary CTA shadow:** `0 8px 24px rgba(255,107,74,0.28)` — the coral glow marks "the one thing to tap."
- **Stage register:** shadows drop out almost entirely (dark surfaces separate via `stage-border` + surface-value steps, similar logic to the old system) — depth in Live contexts should stay quiet so it doesn't compete with the person you're talking to.

### Named rules
1. **Shadow-hierarchy rule.** Shadow strength is a hierarchy signal: the more a shadow is visible, the more important the action. Never give two elements on one screen the same shadow weight if one is primary and one is secondary.
2. **No zero-offset halos.** Every shadow has a real y-offset and blur radius. A `0 0 Npx` glow ring is decoration, not depth, and is refused.
3. **Stage stays quiet.** Live-register screens use border + surface-value depth, not shadow — the visual noise budget there belongs to the call, not the chrome.

## Motion

Motion is one of this system's biggest departures from the prior static system — it is core to the "alive" feeling the brief asks for.

- **Press response:** every pill button springs down 4% scale on press, springs back on release (Reanimated spring, not timing) — a tactile, slightly bouncy feel.
- **Streak flame:** idle micro-pulse (subtle scale 1.0↔1.04 loop, 2.4s) on the streak chip when a goal is incomplete; a one-shot confetti/particle burst on completion.
- **Live pulse:** a soft opacity-pulsing dot marks any "LIVE" badge (rooms, discussions) — the single recurring motion cue for "happening right now."
- **AI waveform:** a real-time or simulated waveform replaces static icons during recording/speaking states (AI speaking test, active call mic level) — gradient-filled (Violet→Sky), not a flat bar.
- **Screen transitions:** platform-native (iOS push/modal, Android Material motion) — this system does not override navigation transitions.

### Named rules
1. **One authored moment per screen, not five.** Pick the motion that matters (the CTA press, the streak pulse, the waveform) and let everything else be still.
2. **Spring, not linear.** Interactive feedback uses spring physics; only screen-level fades/slides use timing curves.
3. **Motion respects reduced-motion.** Honor `AccessibilityInfo.isReduceMotionEnabled` — pulses and confetti become instant state changes, presses keep a minimal fade.

## Components

The native component set is being built from scratch under `apps/native/components/ui/`. Every component below reads its values from `theme.ts` (see the frontmatter `components` block for exact specs), never hardcodes hex/px.

- **ButtonPrimary** — gradient pill, white text, coral-glow shadow. One per screen, maximum.
- **ButtonSecondary** — Paper fill, Sand border, pill. The default "second choice" action.
- **ButtonGhost** — text-only, Violet, no fill. Tertiary/cancel actions.
- **Card** — Paper, `rounded.lg`, violet-tinted shadow. The default content container in Learn contexts.
- **StageCard** — Stage Card fill, `stage-border`, no shadow. The default container in Live contexts.
- **Badge** — solid Violet pill, white caption text. Generic status.
- **StreakChip** — Ember→Coral gradient pill. Streak count specifically, nowhere else.
- **ProBadge** — gold gradient pill, dark text. Premium/Pro marking only.
- **Input** — Cream fill, Sand border, `rounded.md`, 52px tall (comfortable one-hand typing target).
- **TabBar** — floating Paper pill, soft shadow, sits above the safe-area inset with margin on all sides (not edge-to-edge) — the bottom nav becomes an object, not a static bar.

## Do's and Don'ts

### Do
- **Do** reserve the Practice Gradient for exactly one primary action or premium moment per screen.
- **Do** keep Live-register screens (matching, call, room) on Stage dark, always, regardless of system theme.
- **Do** let Progress Green mean "correct/complete" and nothing else.
- **Do** use real spring physics for interactive press feedback.
- **Do** honor Dynamic Type / Material type scale — the sizes here are floors.
- **Do** keep Aurum gold rare and tied to Pro/premium contexts only.

### Don't
- **Don't** put two gradient CTAs on one screen — dilutes the "this is the one thing to do" signal.
- **Don't** use flat white/pure-black backgrounds — Cream and Stage are the only page backgrounds.
- **Don't** add hairline borders as the primary separator in the Learn register — shadow does that work now.
- **Don't** make buttons anything but full pills — no `rounded-none`, no `rounded-sm` buttons anywhere.
- **Don't** use Progress Green, Aurum, or Ember decoratively outside their reserved meanings.
- **Don't** add a third typeface. Sora and Manrope only.
- **Don't** animate everything at once — one authored motion moment per screen.
