---
name: AceFluency Design System
description: Adaptive design system for AceFluency — a voice-first English fluency product for South Asian learners. Two surfaces (native Expo + web admin) sharing a Quiet Studio aesthetic: editorial monochrome, sharp actions, hairline depth.
colors:
  # Light neutrals (web, Tailwind v4 oklch; native maps via hsl 0% luminance)
  ink: "oklch(0.145 0 0)"          # primary text, near-black
  paper: "oklch(1 0 0)"             # background, pure white
  card: "oklch(1 0 0)"              # card surface (light)
  rule: "oklch(0.922 0 0)"         # hairline border
  label-quiet: "oklch(0.556 0 0)"  # muted text
  accent-grey: "oklch(0.97 0 0)"   # secondary/accent surface tint
  primary-action: "oklch(0.205 0 0)"  # dark button fill (light mode)
  primary-action-fg: "oklch(0.985 0 0)"  # text on dark button
  focus-ring: "oklch(0.708 0 0)"   # interactive ring
  # Dark mode neutrals (inverted)
  ink-dark: "oklch(0.985 0 0)"      # primary text in dark
  paper-dark: "oklch(0.145 0 0)"   # background in dark
  card-dark: "oklch(0.205 0 0)"    # card surface in dark
  rule-dark: "oklch(1 0 0 / 10%)"  # alpha-white hairline
  label-quiet-dark: "oklch(0.708 0 0)"  # muted text in dark
  accent-grey-dark: "oklch(0.269 0 0)"  # secondary/accent in dark
  primary-action-dark: "oklch(0.87 0 0)"  # light-grey button fill (dark mode)
  primary-action-fg-dark: "oklch(0.205 0 0)"  # text on light-grey button
  focus-ring-dark: "oklch(0.556 0 0)"  # interactive ring (dark)
  # Semantic — warm accent (only chromatic non-chart color, both modes)
  alert: "oklch(0.58 0.22 27)"             # destructive light surface
  alert-dark: "oklch(0.704 0.191 22.216)"  # destructive dark surface
  # Native-only semantic statuses (Expo react-native-unistyles)
  status-success: "#22C55E"
  status-warning: "#F59E0B"
  status-info: "#3B82F6"
  # Chart family (web data viz; blue hues 251-265, not UI chrome)
  chart-1: "oklch(0.809 0.105 251.813)"
  chart-2: "oklch(0.623 0.214 259.815)"
  chart-3: "oklch(0.546 0.245 262.881)"
  chart-4: "oklch(0.488 0.243 264.376)"
  chart-5: "oklch(0.424 0.199 265.638)"
typography:
  # Web (Inter Variable)
  display:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.01em"
  # Native maps fontSize steps: xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36
  # Native respects Dynamic Type (iOS) / Material type scale (Android); values above are floor anchors.
rounded:
  none: "0px"          # native button default; sharp action intent
  xs: "6px"            # native sm border radius
  sm: "8px"            # native md border radius
  base: "10px"         # web --radius base (0.625rem)
  md: "12px"           # native lg border radius
  lg: "16px"           # native xl border radius; web md/lg contextually
  xl: "14px"           # web derived (base+4px)
  full: "9999px"       # pills, avatars (used sparingly)
spacing:
  # Unified scale (web and native interleave)
  xs: "4px"
  sm: "8px"
  md: "16px"
  base: "10px"   # web layout context anchor (derived from --radius parity)
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  Button:
    backgroundColor: "{primary-action}"
    textColor: "{primary-action-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px"
    size: "h-8"
    height: "32px"
    width: "auto"
  ButtonOutline:
    backgroundColor: "{paper}"
    textColor: "{ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px"
    size: "h-8"
    height: "32px"
    width: "auto"
  ButtonDestructive:
    backgroundColor: "oklch(0.58 0.22 27 / 10%)"
    textColor: "{alert}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px"
    size: "h-8"
    height: "32px"
    width: "auto"
  Card:
    backgroundColor: "{card}"
    textColor: "{ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "16px"
    size: "auto"
    height: "auto"
    width: "auto"
  Input:
    backgroundColor: "transparent"
    textColor: "{ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px"
    size: "h-10"
    height: "40px"
    width: "auto"
  Label:
    backgroundColor: "transparent"
    textColor: "{label-quiet}"
    typography: "{typography.label}"
    rounded: "0"
    padding: "4px 0"
    size: "auto"
    height: "auto"
    width: "auto"
  Checkbox:
    backgroundColor: "transparent"
    textColor: "{ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0"
    size: "16px"
    height: "16px"
    width: "16px"
  Skeleton:
    backgroundColor: "{accent-grey}"
    textColor: "transparent"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0"
    size: "auto"
    height: "20px"
    width: "auto"
---

# Design System — AceFluency

> **Creative North Star** *(inferred from codebase, not user-confirmed)*: Quiet Studio — brushed steel at room temperature. Equipment ready, nothing decorative. The interface recedes; the work of speaking and improving is the focus. When a learner opens AceFluency, the screen should feel like opening a clean notebook under a single desk lamp — quiet, precise, ready for the work.

## Overview

AceFluency is a **voice-first English fluency product** for South Asian learners. The product runs on two surfaces with genuinely different design languages: a **native mobile app** (Expo + React Native, the primary surface) and a **web admin** (Next.js + shadcn/ui, internal tooling).

This document governs the **adaptive visual system** shared in spirit across both surfaces. Platform conventions (iOS HIG, Android Material 3) govern structure, navigation, and interaction on native; the tokens below govern color, type, spacing, and shape — the brand layer that sits *on top of* platform conventions.

**Key characteristics** *(all inferred)*:
- **Editorial monochrome**: neutrals carry zero chroma (oklch with `0` chroma, hsl with `0%` saturation). Not slate, not zinc — true greyscale. This is deliberate: the product is about voice, not visual spectacle.
- **Sharp actions, soft surfaces**: buttons break the radius scale with `rounded-none`; cards and inputs stay rounded. The contrast is the brand signature.
- **Hairline depth**: borders (1px, 90-92% lightness light / 10% alpha white dark) carry the visual hierarchy. Shadows are absent or vanishingly light. Depth is communicated by *edge*, not *shadow*.
- **One warm voice**: destructive is the only warm chromatic color in the non-native UI. It is tinted (`/10%`), never solid — functional, not decorative.
- **Status colors stay native**: success (green), warning (amber), and info (blue) exist only in the native app's `sharedColors`, where platform semantic expectations are honored. The web admin has no equivalent status palette — it does not need one.
- **Charts hold blue**: the chart family (oklch hues 251–265) is data-only. The single breach — dark-mode `sidebar-primary` borrowing `chart-4` — is a known exception, not a pattern.

## Colors

Colors are grouped by **role**, not by hue. This is a low-chroma system; most colors are greys named by function.

### Primary text & background
- **Ink** (`oklch(0.145 0 0)` light / `oklch(0.985 0 0)` dark): primary text. Near-black on light, near-white on dark. Zero chroma — true greyscale.
- **Paper** (`oklch(1 0 0)` light / `oklch(0.145 0 0)` dark): page background. Pure white inverted to near-black.

### Surfaces
- **Card** (`oklch(1 0 0)` light / `oklch(0.205 0 0)` dark): card and popover background. In light mode, cards are indistinguishable from the page — they rely on borders, not fills, to read as separate. In dark mode, cards lift one step.
- **Accent Grey** (`oklch(0.97 0 0)` light / `oklch(0.269 0 0)` dark): secondary and accent surface tint. Used for muted backgrounds, hover states, and skeleton loading.

### Borders & rules
- **Rule** (`oklch(0.922 0 0)` light / `oklch(1 0 0 / 10%)` dark): hairline border. The structural element of the system. Light mode uses a solid light grey; dark mode uses alpha white — a subtle but meaningful difference (alpha white reads as "etched on glass"; solid grey reads as "printed on paper").

### Muted text
- **Label Quiet** (`oklch(0.556 0 0)` light / `oklch(0.708 0 0)` dark): secondary text, labels, captions. Carries enough contrast for accessibility but recedes from primary content.

### Action
- **Primary Action** (`oklch(0.205 0 0)` light / `oklch(0.87 0 0)` dark): button fill. Inverts between modes — dark fill on light, light fill on dark. Zero chroma. This is the "act" color.
- **Primary Action Foreground** (`oklch(0.985 0 0)` light / `oklch(0.205 0 0)` dark): text on primary action buttons.
- **Focus Ring** (`oklch(0.708 0 0)` light / `oklch(0.556 0 0)` dark): interactive ring. Visible but quiet.

### Alert — the only warm voice
- **Alert** (`oklch(0.58 0.22 27)` light / `oklch(0.704 0.191 22.216)` dark): destructive. Warm red, the only chromatic non-chart color. Used sparingly — always as a *tint* (`10%` alpha on destruct button fills), never as a solid block. This is the system's single departure from greyscale, and it is reserved for destructive or validation-failure contexts.

### Native-only status
- **Status Success** (`#22C55E`, green): success toast, positive feedback (native app only).
- **Status Warning** (`#F59E0B`, amber): caution, non-blocking warnings (native app only).
- **Status Info** (`#3B82F6`, blue): informational accents (native app only).

These do not appear in the web admin — the admin surface is more tightly monochrome.

### Chart family (data-only, web)
Chart-1 through Chart-5(`oklch` hues 251–265): a narrow blue family. Used only for data visualization. The one exception — dark-mode `sidebar-primary` borrowing `chart-4` blue — is a deliberate accent for the admin sidebar, not a precedent for bringing chart colors into general UI.

### Named Rules
1. **Zero-chroma rule**: Primary, secondary, muted, accent, border, and ring colors must carry `0` chroma (oklch) or `0%` saturation (hsl). The system is greyscale by construction; the only non-zero chroma colors are Alert and Charts.
2. **Tinted destructive rule**: Destructive is always rendered as a tint (`/10%` light, `/20%` dark for hover), never as a solid fill. Solid red belongs to the native status palette, not the web UI.
3. **Alpha-white dark borders rule**: In dark mode, borders use `oklch(1 0 0 / 10%)` (alpha white), not solid grey. This preserves the "etched on glass" quality of dark surfaces.

## Typography

**Inter Variable** is the sole typeface on web (`--font-sans: "Inter Variable", sans-serif`). The native app respects platform system faces (SF Pro on iOS, Roboto on Android) and honors Dynamic Type / Material type scale — no hard-coded point sizes. The fontSize anchors below are minimum floors, not maximum ceilings.

### Roles
- **Display** (`36px`, weight 700, line-height 1.1, letter-spacing `-0.02em`): rare — marketing or onboarding hero. Not used in the app shell.
- **Headline** (`24px`, weight 600, line-height 1.25, letter-spacing `-0.01em`): section markers, card titles.
- **Title** (`18px`, weight 600, line-height 1.4): modal headers, screen titles (native), dialog headers (web).
- **Body** (`16px`, weight 400, line-height 1.5): default reading text. The workhorse.
- **Label** (`12px`, weight 500, line-height 1.2, letter-spacing `0.01em`): button text, form labels, captions, metadata. The smallest role; carries the system's "compact, technical" character.

### Named Rules
1. **One face rule (web)**: Inter Variable is the only `font-family` on web. No serif, no monospace, no display face. Variation is by weight and size, not family.
2. **Platform-respect rule (native)**: Native surfaces must honor Dynamic Type (iOS) and Material type scale (Android). The font sizes above are design-time anchors; runtime sizes are the user's system setting. Do not hard-code point sizes in native components.
3. **12px label floor rule**: No text on web renders below `12px`. The button base is `text-xs` (`12px`); this is intentional compactness, not oversight.

## Layout

The spacing scale interweaves web and native:

| Token | Value | Primary use |
|-------|-------|-------------|
| `xs` | 4px | tight gaps, icon insets |
| `sm` | 8px | button padding, small gaps |
| `base` | 10px | web layout context (radius parity) |
| `md` | 16px | card padding, standard gaps |
| `lg` | 24px | section padding |
| `xl` | 32px | page-level margins |
| `xxl` | 48px | hero / spacious sections |

### Breakpoints
- **Web** (Tailwind v4 default): `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`, `2xl 1536px`.
- **Native** (react-native-unistyles): `xs 0px`, `sm 576px`, `md 768px`, `lg 992px`, `xl 1200px`, `superLarge 2000px`, `tvLike 4000px`.

Native breakpoints cover tablet and foldable contexts that web does not need.

### Named Rules
1. **Hairline-led structure rule**: Layout sections separate via 1px Rule borders, not via gaps with shadows. When two content areas must read as distinct, draw a line between them — do not float one above the other.
2. **Touch-target rule (native)**: Minimum 44×44pt on iOS, 48×48dp on Android. Compact button sizes (`h-8`, `h-7`) are acceptable in dense admin contexts (web) but never on native interactive surfaces.
3. **Edge-to-edge optional rule (native)**: Native lists may go edge-to-edge; web admin should not. The admin surface is inset content on a Paper background.

## Elevation & Depth

This system does not use shadows as a primary depth mechanism. Depth is communicated by **edges** (hairline borders) and, in dark mode, by **surface value** (cards lift one step above background via `oklch(0.205 0 0)` vs `oklch(0.145 0 0)`).

When shadows are unavoidable (e.g., a dropdown popover that must visually float), they should be:
- **Zero or near-zero blur offset**: `0 1px 2px 0 rgb(0 0 0 / 0.05)` is the maximum.
- **Never colored**: no blue glow, no warm shadow. Greyscale only.
- **Dark mode**: typically absent. The alpha-white border carries the separation.

### Named Rules
1. **Border-not-shadow rule**: Prefer a 1px Rule border over any box-shadow. If a shadow is added, audit whether a border would have sufficed.
2. **Dark-mode no-shadow rule**: In dark mode, do not add shadows. Surface value difference + alpha-white border is the depth cue.
3. **No colored glow rule**: No box-shadow may introduce chroma. `box-shadow: 0 0 12px oklch(0.58 0.22 27 / 30%)` is forbidden; `box-shadow: 0 0 12px rgb(0 0 0 / 10%)` is tolerable.

## Shapes

The radius scale is small and deliberately mismatched:

| Token | Value | Used by |
|-------|-------|---------|
| `none` | 0px | buttons (the signature break) |
| `xs` | 6px | small checkboxes, tight controls (native) |
| `sm` | 8px | small inputs, chips (native) |
| `base` | 10px | web layout anchor (0.625rem) |
| `md` | 12px | native cards, medium inputs |
| `lg` | 16px | web cards, large inputs (native xl) |
| `xl` | 14px | web derived contexts |
| `full` | 9999px | pills, avatars (rare) |

### Named Rules
1. **Sharp actions rule**: Buttons are `rounded-none`. This is non-negotiable on web. On native, platform buttons may inherit Material/iOS shape conventions, but the *brand intent* is square corners.
2. **Soft surfaces rule**: Cards, inputs, dialogs, and popovers are rounded (`md` or `lg`). The contrast between sharp buttons and rounded surfaces is the shape signature.
3. **No full-radius buttons rule**: Buttons are never pills. Pills are for status badges and avatars only.

## Components

The web primitive set is intentionally narrow (admin-grade): Button, Card, Checkbox, Dropdown Menu, Input, Label, Skeleton, Sonner (toast), Textarea, Dialog. The native component set is still forming — voice UI primitives are not yet built and will follow the tokens above when they arrive.

### Button (web)

Buttons are the brand signature: sharp, compact, technical. The base variant is a dark fill (`primary-action`) with near-white text; outline is a bordered Paper surface; destructive is a *tint* (`alert` at 10% alpha), never a solid red block.

- **Base**: `rounded-none`, `text-xs` (12px), `h-8` (32px), `font-medium`.
- **Icon slots**: `[icon=inline-start]` / `[icon=inline-end]` data attributes drive padding. Icons are 16px.
- **Focus**: `ring-1 ring-ring/50`, border becomes `ring`.
- **Disabled**: `opacity-50`, `pointer-events-none`.
- **Destructive**: `bg-destructive/10 text-destructive hover:bg-destructive/20` — the tint pattern.

### Card (web)

Cards are the structural container: Paper background, Rule border, `rounded-lg` (16px), `p-16px`. They do not float on shadows; they sit on borders.

### Input (web)

Inputs are transparent-fill, Rule-bordered, `rounded-md` (12px), `h-10` (40px). Focus lights the ring, not the fill.

### Label (web)

Labels are `label-quiet` text, `text-xs`, no border, minimal padding. They lead into inputs without competing with input content.

### Checkbox (web)

16px × 16px, `rounded-xs` (6px). The small radius keeps it square-ish without crying "iOS".

### Skeleton (web)

Accent-grey fill, `rounded-lg`, no text. The loading placeholder doubles as a quiet shimmer target.

### Dropdown Item / Dialog Header

Dropdown items and dialog headers inherit Card surface + Rule border conventions. No special elevation treatment.

## Do's and Don'ts

### Do

- **Do** let borders carry structure. A 1px Rule line is the default separator.
- **Do** tint destructive actions, never fill them solid. `bg-destructive/10` is the pattern.
- **Do** keep buttons `rounded-none` on web. It is the shape signature.
- **Do** honor platform conventions on native (Dynamic Type, Material type scale, safe-area insets, 44/48dp touch targets).
- **Do** use Inter Variable as the only web typeface. Variation is weight and size, not family.
- **Do** let chart colors stay in charts. The blue family is data-only.
- **Do** use alpha-white borders in dark mode (`oklch(1 0 0 / 10%)`) — the etched-on-glass quality is intentional.

### Don't

- **Don't** add box-shadows to cards, inputs, or dialogs on light mode unless absolutely needed; prefer borders.
- **Don't** add shadows at all in dark mode. Surface value + border is the depth cue.
- **Don't** introduce chroma into primary, secondary, muted, accent, border, or ring tokens. The system is greyscale by construction.
- **Don't** render destructive as a solid red block. It is a tint, always.
- **Don't** use status colors (green/amber/blue) in the web admin UI. They belong to native semantic contexts.
- **Don't** hard-code point sizes in native components. Honor Dynamic Type / Material type scale.
- **Don't** make buttons pills (`rounded-full`). Pills are for status badges and avatars.
- **Don't** use chart colors in general UI chrome, with the documented exception of dark-mode `sidebar-primary` borrowing `chart-4`.
- **Don't** add a display serif, monospace, or second sans-serif face on web. Inter Variable is the only family.