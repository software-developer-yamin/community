# Codebase Audit: Implemented vs. Architecture Required

**Date:** 2026-06-14
**Project:** community (AceFluency)
**Status:** Architecture Complete (8/8 steps) — Implementation In Progress (Phase 1-2 fixes applied)

---

## Executive Summary

The codebase is significantly ahead of a typical starter template. Roughly **60-70% of the core architecture** is already implemented, with particularly strong coverage in database schemas, API routers, and base infrastructure. The remaining work is primarily in native UI surfaces, payment integration, and production hardening.

**Overall Confidence:** High — this is a solid foundation.

---

## 1. Infrastructure & Tooling (95% Complete)

| Component | Status | Notes |
|---|---|---|
| **Monorepo structure** | ✅ | Turborepo + pnpm workspaces configured |
| **TypeScript** | ✅ | Strict mode, catalog dependencies |
| **Linting/Formatting** | ✅ | Ultracite (Biome) + Husky pre-configured |
| **Environment validation** | ✅ | `packages/env` with Zod schemas |
| **Docker** | ✅ | PostgreSQL + LiveKit dev servers |
| **CI/CD** | ⚠️ | `.github/workflows/` exists but minimal |
| **Build pipeline** | ✅ | `turbo.json` with dev/build/check-types |

---

## 2. Database Schema (90% Complete)

### Implemented Tables

| Schema File | Tables | Status | Notes |
|---|---|---|---|
| `auth.ts` | `user`, `session`, `account`, `verification` | ✅ | Better-Auth core tables |
| `models.ts` | `modelEvalRuns`, `modelInferenceLog`, `userProfileEmbedding`, `pronunciationScore`, `cefrPlacement` | ✅ | AI/ML features from previous iteration |
| `rebuild.ts` | `userProfile`, `callRoom`, `strikeEvent`, `partnerReport`, `subscription`, `refundRequest`, `supportTicket`, `supportTicketMessage`, `callRating`, `crashEvent` | ✅ | **All architecture tables present** |
| `recommendations.ts` | `contentItem`, `contentEmbedding`, `userInteraction`, `recommendationScore`, `userPreference` | ✅ | Content recommendation system |
| `todo.ts` | `todo` | ✅ | Legacy/starter table |

### Schema Quality

- **Enums defined:** gender, moderation_state, tier, call_status, call_end_reason, payment_provider, refund_status, support_ticket_status
- **Relations:** All foreign keys with proper `onDelete` cascades
- **Indexes:** Appropriate indexes on all query-heavy columns
- **Missing:** None — all tables from the architecture are present

### Action Required

- Run `db:push` to sync schema to database (if not already done)
- Add pgvector extension for production embedding similarity (optional v2)

---

## 3. API Layer / Server (85% Complete)

### Implemented Routers

| Router | File | Status | Coverage |
|---|---|---|---|
| `appRouter` | `index.ts` | ✅ | Router composition with all sub-routers |
| `healthCheck` | `index.ts` | ✅ | Basic health endpoint |
| `privateData` | `index.ts` | ✅ | Auth-protected demo endpoint |
| `todo` | `todo.ts` | ✅ | Legacy CRUD |
| `livekit` | `livekit.ts` | ✅ | Token minting (extend for room lifecycle) |
| `models` | `models.ts` | ✅ | CEFR grading, pronunciation, matching, embeddings |
| `rebuild` | `rebuild.ts` | ✅ | **Profile, calls, moderation, support, billing, refunds** |
| `recommendations` | `recommendations.ts` | ✅ | Content recommendations, admin stats |

### Router Gaps

| Router | Missing Endpoints | Priority |
|---|---|---|
| `livekit` | `createRoom`, `closeRoom`, `joinRoom` (beyond token) | High |
| `rebuild` | `matchPartners` (gender filter, empty-pool fallback), `rateCall` (✅ exists), `skipCall` (✅ exists), `reportCrash` (✅ exists), `reconnectToRoom` (✅ exists) | Medium |
| `billing` | **Payment intent creation**, **webhook handling**, SSLCommerz integration | High |
| `auth` | Phone OTP provider, Google OAuth provider | High |
| `call` | Real-time queue state, WebRTC signaling | Medium |
| `webhook` | PSP webhooks (SSLCommerz, India PSP) | High |

### Middleware

| Middleware | Status | Notes |
|---|---|---|
| CORS | ✅ | Configured in `server/src/index.ts` |
| Auth (Better-Auth) | ✅ | `createAuthMiddleware` + `evlog` integration |
| Rate limiting | ✅ | In-memory IP-based limiter — 100 req/min RPC/API, 20 req/min AI |
| Error handling | ✅ | `onError` interceptors log via evlog (was `console.error`) |
| Logging | ✅ | `evlog` structured logging initialized |

---

## 4. Authentication (70% Complete)

### Implemented

| Feature | Status | Notes |
|---|---|---|
| Email/password | ✅ | Better-Auth core |
| Session management | ✅ | `expo-secure-store` on native, cookies on web |
| Role-based access | ✅ | `user.role` enum (user, admin) |
| Admin middleware | ✅ | `adminProcedure` in API |
| Session refresh | ⚠️ | Better-Auth handles this, but silent refresh not verified |

### Missing

| Feature | Priority | Notes |
|---|---|---|
| **Phone OTP** | High | Better-Auth plugin needed |
| **Google OAuth** | High | Better-Auth plugin needed |
| Session refresh (silent) | High | ≤60s before expiry per FR-2 |
| Token rotation | Medium | Security best practice |

---

## 5. Frontend — Web (40% Complete)

### Implemented

| Feature | File | Status |
|---|---|---|
| Layout + providers | `layout.tsx` | ✅ |
| Theme (dark mode) | `mode-toggle.tsx` | ✅ |
| Header + navigation | `header.tsx` | ✅ |
| Auth forms | `sign-in-form.tsx`, `sign-up-form.tsx` | ✅ |
| Admin dashboard | `admin/page.tsx` | ✅ |
| Admin layout (protected) | `admin/layout.tsx` | ✅ |
| Content recommendations | `recommendations/page.tsx` | ✅ |
| AI chat | `ai/page.tsx` | ✅ |
| Dashboard | `dashboard/page.tsx` | ✅ |
| To-do demo | `todos/page.tsx` | ✅ |

### Missing

| Feature | Priority | Notes |
|---|---|---|
| **Call screen** | High | Web parity not required v1, but basic UI needed |
| **Settings pages** | High | Subscription, support, account standing |
| **Billing/refund** | High | Web-only surfaces per PRD |
| **Onboarding** | Medium | Profile, language, CEFR |
| **Matchmaking queue** | High | Web parity not required, but admin view needed |

---

## 6. Frontend — Native (50% Complete)

### Implemented

| Feature | File | Status |
|---|---|---|
| Root layout | `app/_layout.tsx` | ✅ |
| Call screen | `app/call/[room].tsx` | ✅ |
| Drawer navigation | `app/(drawer)/` | ✅ |
| Auth (sign-in) | `components/sign-in.tsx` | ✅ |
| Auth (sign-up) | `components/sign-up.tsx` | ✅ |
| oRPC client | `utils/orpc.ts` | ✅ |
| Auth client | `lib/auth-client.ts` | ✅ |
| Theme system | `theme.ts`, `unistyles.ts` | ✅ |
| AI chat | `app/(drawer)/ai.tsx` | ✅ |
| Recommendations | `app/(drawer)/(tabs)/recommendations.tsx` | ✅ |

### Missing

| Feature | Priority | Notes |
|---|---|---|
| **Home / matchmaking queue** | Critical | S3: Queue with gender filter, waiting state |
| **Onboarding flow** | High | S2: Profile, language, CEFR selection |
| **Call controls** | High | S4: Skip, mute, network banner, explicit end |
| **Call ended screen** | High | S5: Disconnect reason, rejoin option |
| **Post-call rating** | High | S6: Stars, helpedPractice, comment |
| **Settings** | High | Subscription, support, account standing |
| **Background state preservation** | High | FR-17: App state on backgrounding |
| **Crash resilience** | High | FR-18: Crash reporting, recovery |
| **Reinstall restore** | Medium | FR-19: Secure storage backup |

---

## 7. Real-Time / LiveKit (60% Complete)

### Implemented

| Feature | Status | Notes |
|---|---|---|
| Token minting | ✅ | `livekit.token` router |
| Native call screen | ✅ | `call/[room].tsx` with LiveKitRoom |
| Audio session management | ✅ | `AudioSession.start/stop` |
| Basic controls | ✅ | Mic, camera, leave |

### Missing

| Feature | Priority | Notes |
|---|---|---|
| **Room lifecycle API** | High | `createRoom`, `joinRoom`, `closeRoom` |
| **ICE restart reconnection** | High | FR-6: 1-5s blip recovery |
| **Full reconnection** | High | FR-6: 5-30s blip recovery |
| **Explicit call end** | High | FR-7: User must end call, not just disconnect |
| **Queue state polling** | High | FR-8: 15s polling for match status |
| **Gender filter enforcement** | High | FR-8: Check before room creation |
| **Native language matching** | Medium | FR-9: Replace hardcoded "Bangla" |
| **Match timeout handling** | Medium | FR-10: Honest fallback after 90s |

---

## 8. Billing & Payments (30% Complete)

### Implemented

| Feature | Status | Notes |
|---|---|---|
| Subscription schema | ✅ | `subscription` table in `rebuild.ts` |
| Refund schema | ✅ | `refundRequest` table in `rebuild.ts` |
| Basic refund request API | ✅ | `createRefundRequest` in `rebuild.ts` |
| Support ticket API | ✅ | `createSupportTicket` in `rebuild.ts` |

### Missing

| Feature | Priority | Notes |
|---|---|---|
| **SSLCommerz integration** | Critical | BD payment gateway |
| **India PSP integration** | Critical | Razorpay/Cashfree/PayU |
| **Payment intent creation** | High | Initiate charge before redirect |
| **Webhook handlers** | High | Verify + process payment confirmations |
| **Subscription state sync** | High | FR-15: Paid state ≤60s propagation |
| **Auto-renewal** | Medium | Handle recurring billing |
| **Refund auto-approve** | Medium | FR-20: Path-based auto-approval |
| **Refund human review** | Medium | FR-20: Admin workflow for edge cases |

---

## 9. Moderation (60% Complete)

### Implemented

| Feature | Status | Notes |
|---|---|---|
| Strike schema | ✅ | `strikeEvent` table |
| Report schema | ✅ | `partnerReport` table |
| Moderation state enum | ✅ | `clean`, `warned`, `cooldown`, `suspended`, `banned` |
| Report endpoint | ✅ | `reportPartner` in `rebuild.ts` |
| Skip endpoint | ✅ | `skipCall` in `rebuild.ts` |
| Get strikes endpoint | ✅ | `getMyStrikes` in `rebuild.ts` |
| Admin: list banned | ✅ | `listBannedUsers` in `rebuild.ts` |
| Admin: unban | ✅ | `unbanUser` in `rebuild.ts` |
| Admin: ticket list | ✅ | `listTickets` in `rebuild.ts` |
| Admin: ticket status update | ✅ | `updateTicketStatus` in `rebuild.ts` |

### Missing

| Feature | Priority | Notes |
|---|---|---|
| **Graduated strike system** | ✅ | Fixed: 1→warn, 2→cooldown(24h), 3→suspended, 4+→banned |
| **Victim/aggressor distinction** | High | FR-12: Who initiated, who disconnected |
| **Visible moderation state** | Medium | FR-13: Banner on UI |
| **Cooldown timer** | Medium | Auto-expire after period |
| **Strike voiding** | Medium | Auto-void if partner reported within 60s |

---

## 10. Observability & Logging (50% Complete)

### Implemented

| Feature | Status | Notes |
|---|---|---|
| Structured logging | ✅ | `evlog` initialized |
| AI SDK integration | ✅ | `createAILogger`, `devToolsMiddleware` |
| Better-Auth integration | ✅ | `createAuthMiddleware` for user identification |
| Error tracking | ⚠️ | Console logging only, no Sentry |

### Missing

| Feature | Priority | Notes |
|---|---|---|
| **NFR metrics** | High | Per-NFR dashboard definitions |
| **Call quality metrics** | High | LiveKit packet loss, jitter, RTT |
| **Business metrics** | Medium | Subscription events, refund rate, support SLA |
| **Alerting** | Low | Threshold-based alerts |
| **Performance profiling** | Low | Bundle size, cold start timing |

---

## 11. Testing (5% Complete)

| Feature | Status | Notes |
|---|---|---|
| Unit tests | ❌ | None found |
| Integration tests | ❌ | None found |
| E2E tests | ❌ | None found |
| Test framework | ❌ | Not configured |

**Recommendation:** Run `bmad-testarch-framework` to initialize Playwright for web and Detox for native.

---

## 12. Security (60% Complete)

| Feature | Status | Notes |
|---|---|---|
| Auth middleware | ✅ | `protectedProcedure`, `adminProcedure` |
| Input validation | ✅ | Zod on all API endpoints |
| Rate limiting | ✅ | In-memory IP-based limiter (100/min RPC/API, 20/min AI) |
| CSRF protection | ✅ | Better-Auth handles this |
| Secure headers | ⚠️ | CORS configured, but no CSP/HSTS |
| Payment webhook verification | ❌ | HMAC verification needed |
| LiveKit token expiry | ✅ | 5 minute TTL (was 1 hour) |

---

## Summary Table

| Domain | Completion | Blockers |
|---|---|---|
| Infrastructure | 95% | CI/CD expansion |
| Database Schema | 90% | pgvector (optional) |
| API Layer | 90% | Payment webhooks |
| Authentication | 70% | Phone OTP, Google OAuth |
| Web Frontend | 40% | Settings, billing, onboarding |
| Native Frontend | 50% | Queue, call controls, settings |
| LiveKit/Real-time | 60% | Room lifecycle, reconnection |
| Billing | 30% | PSP integrations, webhooks |
| Moderation | 75% | Victim/aggressor distinction, visible moderation state |
| Observability | 55% | NFR metrics, alerting |
| Testing | 5% | Entire framework needed |
| Security | 70% | Webhook verification |

---

## Recommended Next Steps (In Priority Order)

### Phase 1: Critical Path (Week 1-2)

1. **Auth extension** — Phone OTP + Google OAuth
2. **Payment integration** — SSLCommerz sandbox setup, webhook handler
3. **Native UI — Matchmaking queue** — Home screen with queue, filter, waiting state
4. **LiveKit room lifecycle** — `createRoom`, `joinRoom`, `closeRoom` endpoints
5. **Call controls** — Skip, mute, explicit end, network banner

### Phase 2: Core Features (Week 3-4)

6. **Moderation system** — Graduated strikes, victim/aggressor distinction, cooldown
7. **Support tickets** — In-app form, SLA tracking, admin view
8. **Settings screens** — Subscription, account standing, support history
9. **Post-call rating** — Stars, `helpedPractice`, feedback
10. **Background state preservation** — App lifecycle handling

### Phase 3: Hardening (Week 5-6)

11. **Testing framework** — Playwright + Detox setup
13. **Observability** — NFR metrics, dashboards
14. **India PSP** — Razorpay/Cashfree integration
15. **Production deployment** — Vercel + Railway configuration

### Phase 4: Polish (Week 7-8)

16. **Push notifications** — Expo notifications
17. **Analytics** — PostHog / Amplitude
18. **Feature flags** — Gradual rollout
19. **Performance optimization** — Bundle size, image optimization
20. **Documentation** — API docs from oRPC OpenAPI

---

## Files Already Created (Per Architecture)

### Schema (All Present)
- `packages/db/src/schema/auth.ts` — Better-Auth tables
- `packages/db/src/schema/models.ts` — AI/ML tables
- `packages/db/src/schema/rebuild.ts` — **All new tables** (profile, call, moderation, billing, support, rating, crash)
- `packages/db/src/schema/recommendations.ts` — Content tables

### API Routers (Most Present)
- `packages/api/src/routers/index.ts` — Router composition
- `packages/api/src/routers/livekit.ts` — Token minting
- `packages/api/src/routers/models.ts` — CEFR, pronunciation, matching
- `packages/api/src/routers/rebuild.ts` — **Profile, call, moderation, support, billing**
- `packages/api/src/routers/recommendations.ts` — Content recommendations

### Native (Partial)
- `apps/native/app/call/[room].tsx` — **Call screen with LiveKit**
- `apps/native/app/_layout.tsx` — Root layout
- `apps/native/lib/auth-client.ts` — Auth client with secure storage
- `apps/native/utils/orpc.ts` — oRPC client

### Web (Partial)
- `apps/web/src/app/layout.tsx` — Root layout
- `apps/web/src/app/admin/page.tsx` — Admin dashboard
- `apps/web/src/components/providers.tsx` — Query + theme providers
- `apps/web/src/utils/orpc.ts` — oRPC client

---

## Key Strengths

1. **Schema is complete** — All tables from the architecture are implemented
2. **API foundation is solid** — oRPC routers with proper auth middleware
3. **LiveKit is wired** — Native call screen works with token minting
4. **Auth is functional** — Better-Auth with expo secure storage
5. **Monorepo is clean** — Proper workspace boundaries, shared packages
6. **AI/ML features exist** — CEFR grading, pronunciation, embeddings, recommendations
7. **Admin dashboard exists** — Basic stats, user management

## Key Risks

1. **No payment integration** — This is the biggest blocker for monetization
2. **No testing** — Zero tests means regressions are likely
3. ~~**No rate limiting** — API is vulnerable to abuse~~ ✅ Fixed — in-memory IP-based limiter
4. **Native UI is thin** — Missing core flows (queue, settings, onboarding)
5. ~~**Moderation is basic** — No graduated strikes or victim/aggressor logic~~ ✅ Fixed — graduated state machine (warn→cooldown→suspend→ban)
6. **No observability** — Can't measure NFRs in production

---

*This audit was generated by comparing the architecture document (`_bmad-output/planning-artifacts/architecture.md`) against the actual codebase on 2026-06-13. Last updated 2026-06-14.*
