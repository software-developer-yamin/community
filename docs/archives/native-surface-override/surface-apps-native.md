---
version: 1
slug: "apps-native"
primary_target: "apps/native"
related_targets: []
---

# apps/native — AceFluency Native App

## Visitor mode
Operate. Task-focused: enter practice call, find voice club room, chat with AI, track speaking progress. First viewport = Practice Home (one-tap call entry).

## Audience
South Asian adults / young professionals (Bangladesh, India). Understand English grammar; lack fluency partners. Active during lunch breaks, commutes, late evenings. Mobile-first, flaky networks common, price-sensitive.

## Job
Reduce friction between "I should practice speaking" and "I'm in a live 1:1 LiveKit call with a near-level partner." Secondary: sustain daily habit (streaks, talk-time), find topic rooms (Voice Clubs), get pronunciation/CEFR feedback (AI Assessment).

## Action
1. Open app → Practice Home: today's talk-time band, streak heatmap, stacked next-call partner cards (recent + near-level). One-tap "Find a partner now" CTA pushes to /call/matching.
2. Matching queue polls; found → auto-enter /call/[room] LiveKit call with resilience (reconnect on flaky net, partner-end countdown, crash recovery).
3. Post-call → /call/ended feedback screen (score, recs).
4. Tabs: Practice | Rooms (Voice Clubs topic directory) | AI (assessment/chat) | Progress (stats/streaks).
5. Drawer: account, settings (dark mode / notifications / suspension recovery), subscription, support tickets.

## Proof
- Practice Home replaces 'Tab One' slop. Real talk-time band + empty-day heatmap + next-call cards from matchPartners query.
- Theme.ts token fixes propagated (sharp-action radius none, destructive tint pair, dark card lifted, light ring fixed).
- Call [room] resilience logic inherited; chrome corrected (hybrid buttons: mic/cam circles, square hangup square, tinted destructive).
- Voice Clubs topic directory forthcoming (Q3=B confirmed — Substack-like categories).
- Zero fabricated data; graceful empty states where backend procedures not yet built (streak, recentPartners, userStats missing — render neutral placeholders, never fake numbers).

## Constraints
- DESIGN.md "Quiet Studio": zero-chroma greyscale + warm destructive tint (10% alpha, never solid fill) + native-only status + chart-family blue. Editorial monochrome; sharp actions (borderRadius none) + soft surfaces (rounded cards/inputs); hairline 1px borders carry structure (no shadows); one warm voice (destructive only) on chrome.
- Adaptive: platform conventions govern structure (iOS HIG, Android Material 3 native). Brand tokens color/type/spacing/shape layer on top.
- Touch targets ≥ 44×44pt iOS / 48×48dp Android.
- TypeScript strict (no `as any` / `@ts-ignore`). Ultracite/Biome enforced.
- react-native-unistyles `useUnistyles()` + `StyleSheet.create((theme) => ({...}))` only.
- expo-router `useRouter()` for navigation.
- No new dependencies.

## Chosen direction
Daily-streak-with-stacked-next-calls home (concept-seed surface Operate, candidate 6). Fused with multiplane-cel-dawn grammar restated via platform-native parallax: far plane streak heatmap recedes / midplane talk-time progress band / foreground stacked next-call cards. Scroll-tied motion = iOS large-title-collapse + Material scrim (not reinvented).

## Unresolved
- Backend procedures for userSelf / userStats / recentPartners / talkTime / streak: missing. UI renders neutral placeholders. Server procedures can substitute later.
- Onboarding flow (CEPR placement intro): pending (Persuade-mode concept-seed).
- Settings + suspension-recovery surface: pending (Operate).
- Progress dashboard: pending (Operate).
- Finishing pass: spawn impeccable-finish-reviewer after all surfaces ship.
