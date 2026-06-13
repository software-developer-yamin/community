---
name: AceFluency
description: Peer-to-peer English-speaking practice app for South Asian learners. Calm, meditative, dark-mode-first. shadcn/ui on web; Nativewind on native.
colors:
  # Dark mode (default)
  background: '#0F1419'
  background-elevated: '#161B22'
  foreground: '#F0F0F0'
  primary: '#4A9B8E'
  primary-foreground: '#0A0E12'
  accent: '#D4A574'
  accent-foreground: '#0A0E12'
  muted: '#1A1F26'
  muted-foreground: '#8B9DAE'
  destructive: '#C75B5B'
  destructive-foreground: '#F0F0F0'
  border: '#2A3039'
  card: '#161B22'
  card-foreground: '#F0F0F0'
  popover: '#1A1F26'
  popover-foreground: '#F0F0F0'
  # Light mode (secondary)
  background-light: '#FBF7F2'
  background-elevated-light: '#FFFFFF'
  foreground-light: '#1A1A1A'
  primary-light: '#2D7A6E'
  primary-foreground-light: '#FFFFFF'
  accent-light: '#B8834A'
  accent-foreground-light: '#FFFFFF'
  muted-light: '#F0EBE3'
  muted-foreground-light: '#6B7280'
  destructive-light: '#DC2626'
  border-light: '#E5E0D8'
  card-light: '#FFFFFF'
  card-foreground-light: '#1A1A1A'
typography:
  display:
    fontFamily: 'Inter'
    fontSize: '32px'
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: '-0.02em'
  display-sm:
    fontFamily: 'Inter'
    fontSize: '24px'
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: '-0.01em'
  heading:
    fontFamily: 'Inter'
    fontSize: '20px'
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Inter'
    fontSize: '16px'
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Inter'
    fontSize: '14px'
    fontWeight: '500'
    lineHeight: '1.4'
  caption:
    fontFamily: 'Inter'
    fontSize: '12px'
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0.01em'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  full: '9999px'
  DEFAULT: '8px'
spacing:
  gutter: '16px'
  margin-mobile: '16px'
  margin-tablet: '24px'
  margin-desktop: '32px'
  section-gap: '24px'
  card-gap: '12px'
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  button-secondary:
    background: '{colors.muted}'
    foreground: '{colors.foreground}'
    radius: '{rounded.md}'
    border: '{colors.border}'
  button-destructive:
    background: '{colors.destructive}'
    foreground: '{colors.destructive-foreground}'
    radius: '{rounded.md}'
  call-card:
    background: '{colors.background-elevated}'
    foreground: '{colors.foreground}'
    radius: '{rounded.lg}'
    border: '{colors.border}'
  network-banner:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.sm}'
  status-pill:
    background: '{colors.muted}'
    foreground: '{colors.muted-foreground}'
    radius: '{rounded.full}'
  input:
    background: '{colors.background-elevated}'
    foreground: '{colors.foreground}'
    border: '{colors.border}'
    radius: '{rounded.md}'
  skip-button:
    background: '{colors.muted}'
    foreground: '{colors.foreground}'
    border: '{colors.border}'
    radius: '{rounded.md}'
---

# DESIGN.md — visual identity

> *Populated at Finalize. Frontmatter only at boot.*

## Brand & Style

AceFluency is a peer-to-peer English-speaking practice app for South Asian learners. The product premise is that *speaking fluency is built through repetition with real people* — not lessons, not AI tutors, not passive consumption. The brand expression follows: a calm, meditative surface that reduces anxiety, a warm accent that signals safety and encouragement, and a dark-mode-first posture that respects the commuter context (low-end OLED, sun glare, battery life).

The app is **not gamified**. No streaks, badges, achievement animations, or celebratory toasts. The reward is the conversation itself. The UI gets out of the way.

The aesthetic posture is **editorial warm** — calm and professional without the coldness of a corporate tool. It is the visual equivalent of a quiet library reading room: warm light, clear type, nothing shouting for attention.

AceFluency inherits shadcn/ui defaults on web and Nativewind on native. This DESIGN.md specifies the brand-layer deltas — the calm palette, the warm accent, the dark-mode-first token set, and the handful of product-specific components. The 80% of components that ship from shadcn (Button, Card, Dialog, Sheet, Input, Tabs, Toast) inherit shadcn's visual specs as-is, with color overrides mapped through the frontmatter tokens.

## Colors

The AceFluency palette is a deep, warm dark surface with a calm teal primary and a warm amber accent.

- **Background (`#0F1419`)** — the default surface. Deep, warm, almost-black. Used for all primary screens. Not pure black; the slight warmth prevents the clinical coldness of `#000000` and reduces eye strain on OLED.
- **Elevated (`#161B22`)** — cards, sheets, dialogs, popovers. Slightly lighter than background to create subtle layering without shadows.
- **Foreground (`#F0F0F0`)** — primary text. Off-white, not harsh `#FFFFFF`, to reduce contrast glare on low-end screens.
- **Muted (`#1A1F26`)** — secondary surfaces, disabled states, empty-state backgrounds.
- **Muted Foreground (`#8B9DAE`)** — secondary text, placeholders, timestamps, captions.
- **Border (`#2A3039`)** — dividers, input borders, card borders. Visible enough for affordance, quiet enough to not draw attention.
- **Primary (`#4A9B8E`)** — the brand color. Sage teal: calm, growth, trust. Used on primary buttons, active nav items, the "calling" indicator, and the match queue progress. Replaces shadcn's default `primary`.
- **Primary Foreground (`#0A0E12`)** — text on primary surfaces. Dark, for contrast.
- **Accent (`#D4A574`)** — warm amber. Used sparingly: the "live / in-call" indicator, network-warning banners, the Skip button, and the "safe to speak" trust badge. Never used for chrome, never used decoratively. Amber means "attention without alarm."
- **Accent Foreground (`#0A0E12`)** — text on accent surfaces.
- **Destructive (`#C75B5B`)** — muted red. Used for End Call, Report, and destructive actions. Not a bright, alarming red; the tone is "this action is final" not "this action is dangerous."
- **Destructive Foreground (`#F0F0F0`)** — text on destructive surfaces.
- **Light Mode** — secondary. All light tokens are the warm inversion of dark: warm off-white background (`#FBF7F2`), dark sage primary (`#2D7A6E`), darker amber accent (`#B8834A`).

Avoid: chromatic flourishes, gradient surfaces, neon accents, more than three brand colors, bright reds for non-destructive states. The discipline is three-colors-and-stop: teal, amber, muted red.

## Typography

AceFluency uses **Inter** across all surfaces. The type system is weight-driven, not font-driven, to keep bundle size low on mobile and to maintain consistency across web and native.

- **Display** — `32px`, weight 600, tight tracking (`-0.02em`). Used for empty-state headlines, the "Welcome back" greeting on cold start, and the call-screen partner name.
- **Display Small** — `24px`, weight 600. Used for section headers, dialog titles, and the post-call rating prompt.
- **Heading** — `20px`, weight 600. Used for card titles, list headers, and settings group labels.
- **Body** — `16px`, weight 400. The default reading size. Used for all prose, descriptions, and form labels.
- **Label** — `14px`, weight 500. Used for button text, nav labels, input placeholders, and status pills.
- **Caption** — `12px`, weight 400, slightly loose tracking (`+0.01em`). Used for timestamps, metadata, helper text, and legal copy.

Platform notes: On native (Expo / React Native), Inter is loaded via `expo-font`. The font file is cached after first load. If the font fails to load, the system falls back to the platform default sans-serif (Roboto on Android, San Francisco on iOS). The fallback is acceptable because the type ramp is defined by size and weight, not by serif characteristics.

## Layout & Spacing

AceFluency is a **mobile-first** product. The primary surface is a single-column layout on native (Android 5.5"–6.7" screens). The web surface (Next.js) mirrors the native layout for auth, settings, and billing, but relaxes to a two-column settings layout on `lg` (1024px+).

Spacing scale:

| Token | Value | Usage |
|---|---|---|
| `gutter` | `16px` | Horizontal padding on all screens |
| `margin-mobile` | `16px` | Outer screen margin on phones |
| `margin-tablet` | `24px` | Outer screen margin on tablets |
| `margin-desktop` | `32px` | Outer screen margin on web |
| `section-gap` | `24px` | Vertical gap between major sections |
| `card-gap` | `12px` | Gap between related cards or list items |

Maximum content width on web: `max-w-md` (448px). AceFluency is not a wide-table product; the native-first posture means web surfaces are intentionally narrow to mirror the mobile experience.

Bottom-sheet modals are the default overlay pattern on native. Dialogs are used on web. Sheets on native slide up from the bottom, occupy 85% of screen height, and can be dismissed by dragging down or tapping the scrim.

## Elevation & Depth

Elevation is expressed through **tonal layering** (background vs. elevated) rather than heavy shadows. On dark mode, the difference between `#0F1419` (background) and `#161B22` (elevated) is the primary depth signal. Subtle shadows are used only on web surfaces and only for modal overlays:

- `shadow-sm` — `0 1px 2px rgba(0,0,0,0.3)` on elevated cards (web only)
- `shadow-lg` — `0 10px 25px rgba(0,0,0,0.5)` on modal dialogs and sheets

On native, shadows are omitted in favor of the tonal background shift. This reduces GPU load on low-end Android devices.

## Shapes

Corner radii are friendly but not playful. The product is a tool for adult learners, not a game.

| Token | Value | Usage |
|---|---|---|
| `sm` | `4px` | Inputs, small buttons, status pills |
| `md` | `8px` | Cards, primary buttons, list items |
| `lg` | `12px` | Call cards, bottom sheets, modals |
| `xl` | `16px` | Full-screen overlays, onboarding screens |
| `full` | `9999px` | Avatar images, circular indicators |

Pill shapes (`full`) appear only on avatars, the active-call indicator, and the user-level badge. All other surfaces use `md` or `lg`.

## Components

AceFluency uses the following shadcn components as-is, with color tokens mapped through the frontmatter: `Button`, `Card`, `Dialog`, `Sheet`, `Input`, `Tabs`, `Toast`, `Avatar`, `Separator`, `Badge`, `Skeleton`.

Brand-layer-overridden or product-specific components:

- **Button (primary variant)** — `{colors.primary}` fill, `{colors.primary-foreground}` text, `{rounded.md}` corner. Used for "Start Calling", "Confirm", "Save".
- **Button (secondary variant)** — `{colors.muted}` fill, `{colors.foreground}` text, `{colors.border}` border, `{rounded.md}` corner. Used for "Cancel", "Go Back", "Later".
- **Button (destructive variant)** — `{colors.destructive}` fill, `{colors.destructive-foreground}` text, `{rounded.md}` corner. Used for "End Call", "Report", "Delete Account".
- **Skip Button** — `{colors.muted}` fill, `{colors.foreground}` text, `{colors.border}` border, `{rounded.md}` corner. A first-class in-call action. Visually secondary to the primary "End Call" button but always accessible. The Skip button is the load-bearing piece of the moderation system — without it, users have no strike-free way to reject a bad match.
- **Call Card** — `{colors.background-elevated}` fill, `{colors.foreground}` text, `{colors.border}` border, `{rounded.lg}` corner. The in-call surface. Contains partner avatar, call timer, mute/skip/report/end controls, and the network-status banner.
- **Network Banner** — `{colors.accent}` fill, `{colors.accent-foreground}` text, `{rounded.sm}` corner. Appears inside the Call Card when the user is reconnecting. The warm amber signals "attention without alarm" — the user knows something is happening, but they are not being punished.
- **Status Pill** — `{colors.muted}` fill, `{colors.muted-foreground}` text, `{rounded.full}` corner. Used for user-level badges (A1, A2, B1, etc.), subscription tier labels, and moderation state indicators.
- **Input** — `{colors.background-elevated}` fill, `{colors.foreground}` text, `{colors.border}` border, `{rounded.md}` corner. Used for phone OTP, support ticket forms, and profile edits.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Inherit shadcn defaults for everything not in the brand layer | Override shadcn's color tokens beyond `primary`, `accent`, and `destructive` |
| Use `{colors.accent}` only for "live / reconnecting / safe-to-speak" | Use accent for state badges, chrome, or decorative flourishes |
| Use `{colors.destructive}` for final actions (end call, report) | Use bright red for warnings or non-final states |
| Dark mode default on all surfaces | Ship light-mode as default (battery, OLED, commuter context) |
| Tonal layering (`background` vs. `elevated`) for depth | Heavy drop shadows on native surfaces |
| Single-column layouts with `max-w-md` on web | Wide multi-column layouts (the product is not a dashboard) |
| Skip button always visible in-call | Hide Skip behind a menu or secondary action |
| Network states visible but quiet | Silent failures or alarming red reconnect banners |
| `display` typography sparingly — empty states, greetings | Set body text in `display` to "make it pretty" |
| Warm off-white `#F0F0F0` for text on dark | Pure white `#FFFFFF` text (too harsh on low-end screens) |