---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: []
workflowType: 'architecture'
project_name: 'community'
user_name: 'Yamin'
date: '2026-06-13'
status: 'complete'
completedAt: '2026-06-13'
lastStep: 8
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Input Documents

**Discovered:**
- `prds/prd-community-2026-06-09/prd.md` — AceFluency rebuild PRD (FR-1..FR-27, UJ-1..UJ-5)
- `prds/prd-community-2026-06-09/addendum.md` — Architecture-matched design, LiveKit reconnection, refund matrix
- `_bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/DESIGN.md` — Visual identity (dark-mode-first, calm/meditative)
- `_bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/EXPERIENCE.md` — IA, behavior, interactions, accessibility (13 surfaces, 8 key flows)
- `_bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/.decision-log.md` — UX decisions (stakes, form, vibe, theme, locale, a11y)
- `docs/about.md` — Marketing copy (Bangladeshi-learner voice)
- `docs/ratings-and-reviews.md` — 4330 lines, primary pain-signal source
- `docs/livekit.md` — LiveKit Cloud SDK reference

**Project Context:**
- Existing codebase: Next.js (web), Expo (native), Hono (server), oRPC (API), Drizzle (ORM), PostgreSQL, Better-Auth, LiveKit token mint wired
- Existing schema: `packages/db/src/schema/{auth,models}.ts`
- Existing matching: `packages/api/src/routers/models.ts` (`matchPartners`)
- Existing LiveKit: `packages/api/src/routers/livekit.ts` (`livekit.token`)
- UI system: shadcn/ui on web, Nativewind on native, shared tokens in `packages/ui`

**Status:** Step 1 complete. Step 2 in progress.

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (27 FRs across 6 domains):**

| Domain | FRs | Count | Architectural Implication |
|---|---|---|---|
| Auth & Session | FR-1..FR-4 | 4 | Persistent session, silent refresh, phone OTP, Google OAuth. Requires secure token storage, refresh rotation, SMS provider integration |
| Call Reliability | FR-5..FR-7 | 3 | Server-managed LiveKit rooms, ICE restart reconnection, explicit call-end states. Requires room lifecycle API, WebRTC state management |
| Matchmaking | FR-8..FR-10 | 3 | Gender filter, native language field, honest match timeout. Requires embedding service extension, queue state management |
| Moderation | FR-11..FR-13 | 3 | Graduated strikes, victim/aggressor distinction, visible moderation state. Requires event log, state machine, admin review surface |
| Billing & Refund | FR-14..FR-16, FR-20 | 4 | Visible subscription, cancellation, support tickets, refund mechanism. Requires PSP integration (SSLCommerz + India PSP), billing state machine |
| Mobile Stability | FR-17..FR-19 | 3 | Background state preservation, crash resilience, reinstall restore. Requires app state management, secure storage |
| Regression | FR-21..FR-23 | 3 | Skip button, post-call rating, existing features preserved | Requires backward-compatible API changes |

**Non-Functional Requirements:**

| NFR | Target | Driver |
|---|---|---|
| Audio round-trip latency | p95 ≤ 400ms, p99 ≤ 700ms | WebRTC/LiveKit Cloud SFU |
| Cold-start-to-home | p95 ≤ 2.5s (Pixel 4a) | Mobile bundle optimization, auth caching |
| Reconnect success (1s blip) | ≥ 95% | LiveKit ICE restart + client state |
| Reconnect success (5s blip) | ≥ 80% | LiveKit full reconnection |
| Login first-attempt | ≥ 99% | Token refresh + secure storage |
| Match wait (unfiltered) | p95 ≤ 45s | Queue algorithm + pool size |
| Match wait (filtered) | p95 ≤ 90s | Pool filtering + honest fallback |
| Gender filter fulfillment | ≥ 90% | Filter enforcement + empty-pool handling |
| Call disconnect rate | ≤ 5% | Network resilience + reconnection |
| Support first-response | p95 ≤ 24h (paying), ≤ 72h (free) | Ticket SLA + notification |
| Paid-state propagation | ≤ 60s | Webhook + polling hybrid |
| Refund decision (human) | ≤ 7 days | Workflow + notification |

**Scale & Complexity:**

- Primary domain: Full-stack mobile + web (native-first)
- Complexity level: **High** — real-time voice, dual-market billing, multi-PSP, moderation state machine, WebRTC reconnection
- Estimated architectural components: 8–10 major subsystems (auth, call, match, moderation, billing, support, notification, analytics)
- Cross-cutting concerns: real-time state, network resilience, security (auth + payments), observability (all NFRs must be measurable)

### Technical Constraints & Dependencies

**Existing code anchors (from addendum):**
- Auth: `packages/auth/src/index.ts` (extend with phone OTP + Google)
- Mobile auth: `apps/native/lib/auth-client.ts` (add secure-storage refresh)
- User schema: `packages/db/src/schema/auth.ts` (add `gender`, `nativeLanguage`)
- LiveKit token: `packages/api/src/routers/livekit.ts` (add `createRoom`, `closeRoom`)
- Match: `packages/api/src/routers/models.ts` (extend `matchPartners` with gender predicate)
- Profile embedding: `packages/api/src/routers/models.ts` (replace hardcoded "Bangla")
- CEFR: `packages/db/src/schema/models.ts` (keep)
- Moderation: **NEW** `packages/db/src/schema/moderation.ts` + `packages/api/src/routers/moderation.ts`
- Billing: **NEW** `packages/db/src/schema/billing.ts` + `packages/api/src/routers/billing.ts`
- Refund: **NEW** extend billing router

**External dependencies:**
- LiveKit Cloud (resolved) — global mesh SFU, 99.99% SLA
- SSLCommerz (BD) — payment + refund API, webhook
- India PSP (Razorpay/Cashfree/PayU) — Open Question 9, dual PSP required
- SMS provider (likely SSLCommerz-affiliated) — OTP delivery with voice fallback
- Google OAuth — sign-in/linking

**Platform constraints:**
- Android-first (primary market: Bangladesh, low-end devices)
- Expo cross-platform (iOS secondary)
- Web secondary (auth, billing, settings only)
- Dark mode default, light mode secondary
- English v1, Bangla v1.1

### Cross-Cutting Concerns Identified

1. **Real-time state synchronization** — Call state, queue state, network state must be consistent across native and web surfaces
2. **Network resilience** — All surfaces must handle intermittent connectivity gracefully; queue pauses, not drops; calls reconnect, not end
3. **Auth state durability** — Session must survive app kills, OS reboots, token expiry mid-call, network changes
4. **Payment state consistency** — Dual PSP (BD + India), refund state machine, webhook handling, idempotency
5. **Moderation event log** — Strike events must be auditable, reversible, and visible to the user
6. **Observability** — Every NFR needs a measurement path (metric, source, dashboard)
7. **Security** — Phone OTP, payment tokens, LiveKit room tokens, refresh tokens all require secure storage
8. **Backward compatibility** — Existing features (Voice Clubs, AI Test, Courses, Tutor, Drama, Streaks, Friends) must not break

---

**User selected [C] Continue — saving and proceeding to step 3.**

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack mobile-first with web parity. The project requires:
- **Native mobile app** (Android-primary, iOS-secondary) — Expo + React Native
- **Web application** (auth, billing, settings) — Next.js
- **API server** — Hono + oRPC for type-safe APIs
- **Database** — PostgreSQL with Drizzle ORM
- **Real-time voice** — LiveKit Cloud WebRTC

### Starter Options Considered

**Option A: Better-T-Stack (existing)**
- Already initialized in the project
- Turborepo monorepo with shared packages
- Next.js 16.2 + React 19 (web)
- Expo 56 + React Native 0.85 (native)
- Hono + oRPC + Zod (server)
- Drizzle + PostgreSQL (database)
- Better-Auth (authentication)
- shadcn/ui + Tailwind (web UI)
- Nativewind + Unistyles (native UI)
- LiveKit SDK already wired (token mint)
- Ultracite + Husky (code quality)

**Option B: T3 Stack**
- Next.js + tRPC + Prisma + Tailwind
- No native mobile support
- Would require adding Expo separately
- oRPC is more modern than tRPC for OpenAPI

**Option C: Create Expo Stack**
- Expo-focused starter
- No web/Next.js integration
- No server framework
- Would require building web and server from scratch

### Selected Starter: Better-T-Stack (Existing)

**Rationale:**
- Project already initialized with this stack
- All required technologies are present
- LiveKit SDK already wired at token-mint layer
- Existing auth, matching, and database schemas
- Shared packages pattern supports the UX requirement of shared design tokens across web and native
- Turborepo enables efficient builds for multi-surface deployment
- No migration cost — all existing code anchors from the PRD addendum are already in place

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript 5.8+ with strict mode
- Bun runtime (server + native builds)
- Node.js compatibility layer for Next.js

**Styling Solution:**
- Tailwind CSS v4 (web + native via Nativewind)
- CSS variables for design tokens (shared `packages/ui`)
- shadcn/ui primitives on web
- Unistyles for native runtime theming
- Dark mode support via `next-themes` / `expo-system-ui`

**Build Tooling:**
- Turborepo for monorepo task orchestration
- tsdown for server bundling
- Bun bundler for native compile
- Next.js 16 built-in bundler for web

**Testing Framework:**
- No test framework pre-configured (to be added per `bmad-testarch-framework`)

**Code Organization:**
```
community/
├── apps/
│   ├── web/         # Next.js 16 (port 3001)
│   ├── native/      # Expo 56 (React Native 0.85)
│   └── server/      # Hono + oRPC (port 3000)
├── packages/
│   ├── ui/          # shadcn/ui primitives + shared tokens
│   ├── api/         # oRPC routers + business logic
│   ├── auth/        # Better-Auth configuration
│   ├── db/          # Drizzle schema + queries
│   └── env/         # Shared environment validation
```

**Development Experience:**
- `pnpm dev` — starts all apps in parallel
- Hot reload for web (Next.js) and server (Bun --hot)
- Expo dev client for native with live reload
- Shared TypeScript configuration via `packages/config`
- Ultracite for zero-config linting/formatting

**Note:** Project already initialized. No `create` command needed. First implementation story is schema migration and API extension. Starter provides solid foundation. Proceed to architectural decisions.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database schema design for moderation, billing, support
- LiveKit room lifecycle management
- Payment provider integration (SSLCommerz + India PSP)
- Auth extension (phone OTP + Google OAuth)

**Important Decisions (Shape Architecture):**
- State management for real-time call + queue
- Network resilience strategy
- Observability and metrics collection
- Background state preservation

**Deferred Decisions (Post-MVP):**
- AI conversation partner integration (v2)
- Push notification service (v2)
- Analytics platform (v2)
- CDN for static assets (v2)

### Data Architecture

**Database: PostgreSQL (via Drizzle ORM)**
- **Version:** 15+ (existing)
- **Schema approach:** Relational with foreign key constraints
- **New schemas required:**
  - `moderation` — strike events, cooldown state, review queue
  - `billing` — subscriptions, transactions, refund records
  - `support` — tickets, responses, SLA tracking
  - `call` — call sessions, ratings, disconnect events
- **Migration:** Drizzle migration files, version-controlled
- **Validation:** Zod schemas shared between API and DB
- **Caching:** Application-level via TanStack Query cache (no Redis in v1)

**Data Validation Strategy:**
- Zod for all API inputs (oRPC integration)
- Drizzle schema as source of truth for DB types
- Shared validation schemas in `packages/api/src/validators/`

### Authentication & Security

**Authentication: Better-Auth (extended)**
- **Existing:** Email/password via `packages/auth/src/index.ts`
- **New:** Phone OTP + Google OAuth (FR-3, FR-4)
- **Session management:**
  - Native: `expo-secure-store` for refresh token
  - Web: `httpOnly` + `secure` + `SameSite=strict` cookies
  - Refresh token rotation on every use
  - Silent refresh ≤60s before expiry (FR-2)

**Authorization:**
- Role-based: `free`, `premium`, `premium_plus` (gender filter)
- Moderation state: `clean`, `warned`, `cooldown`, `suspended`, `banned`
- Middleware checks on every protected route

**API Security:**
- oRPC + Zod for type-safe input validation
- Rate limiting on auth endpoints (10 attempts/minute)
- LiveKit tokens are short-lived (5min expiry) and room-scoped
- Payment webhooks verified with HMAC signature

### API & Communication Patterns

**API Design: oRPC with OpenAPI**
- **Existing:** `packages/api/src/routers/` with Hono integration
- **New routers:**
  - `moderation.ts` — strike events, state queries, admin review
  - `billing.ts` — subscription state, payment intents, refund requests
  - `support.ts` — ticket creation, status updates, SLA tracking
  - `call.ts` — call session logs, rating submission, disconnect events
- **Error handling:** Structured error responses with `code`, `message`, `retryable` flag
- **Rate limiting:** Token bucket per user, stricter for auth and payment endpoints

**Real-time Communication:**
- **Voice calls:** LiveKit Cloud WebRTC (FR-5, FR-6)
  - Room creation on match
  - ICE restart for 1–5s blips
  - Full reconnection for 5–30s blips
  - Room cleanup 30s after both disconnect
- **Queue state:** Polling every 15s (not WebSocket) — simpler, handles intermittent network
- **Call signaling:** LiveKit's built-in signaling (not custom WebSocket)

**Error Handling Standards:**
- Network errors: Retry with exponential backoff (max 3 retries)
- Auth errors: Queue silent refresh, redirect to login only on 401 after refresh failure
- Payment errors: Surface PSP error message, retry option, fallback to human support
- Call errors: Reconnect first, end gracefully if reconnect fails

### Frontend Architecture

**State Management:**
- **Server state:** TanStack Query (React Query) — caching, background refresh, optimistic updates
- **Form state:** TanStack Form — validation, submission, error handling
- **Client state:** React Context for auth session, moderation state, call state
- **Native state:** Expo Router for navigation, React Context for global state

**Component Architecture:**
- **Web:** shadcn/ui primitives + custom components in `packages/ui`
- **Native:** Nativewind-styled components in `apps/native/components/`
- **Shared:** Design tokens via CSS variables, typography via Inter

**Performance Optimization:**
- **Web:** Next.js 16 App Router, Server Components for static content
- **Native:** Expo dev client, lazy loading for non-critical screens
- **Bundle:** Code splitting by route, dynamic imports for heavy components

**Call Screen State Machine:**
```
idle → connecting → active → reconnecting → active
active → ended (explicit)
active → connection_lost (retry / end)
reconnecting → connection_lost (>30s)
```

### Infrastructure & Deployment

**Hosting (v1):**
- **Web:** Vercel (Next.js 16 optimized)
- **Server:** Railway or Render (Bun runtime)
- **Database:** Supabase PostgreSQL or self-hosted (managed)
- **Native:** Play Store (Android), App Store (iOS via Expo)

**Environment Configuration:**
- `packages/env` for shared Zod-validated env vars
- `.env.local` per app, `.env.production` for deployment
- LiveKit credentials: sandbox for dev, Cloud project for prod
- PSP credentials: SSLCommerz sandbox for dev, live for prod

**Monitoring & Observability:**
- `evlog` for structured logging (already in dependencies)
- Every NFR needs a metric: define source, dashboard, alert
- Call quality: LiveKit metrics (packet loss, jitter, round-trip)
- Business metrics: subscription events, refund rate, support SLA

**CI/CD:**
- GitHub Actions for type checking, linting, testing
- Turborepo remote caching for build speed
- Deploy on merge to `main` (web), manual trigger (native)

### Decision Impact Analysis

**Implementation Sequence:**
1. Schema migrations (moderation, billing, support, call)
2. Auth extension (phone OTP, Google OAuth, secure storage)
3. LiveKit room lifecycle (create, join, close, reconnection)
4. Matching extension (gender filter, native language, empty-pool fallback)
5. Moderation system (strike events, cooldown, visible state)
6. Billing integration (SSLCommerz, subscription state, refund flow)
7. Support tickets (in-app form, SLA tracking, ticket ID)
8. Mobile stability (backgrounding, crash resilience, reinstall)

**Cross-Component Dependencies:**
- Auth → Call: Session must survive mid-call token refresh
- Auth → Billing: Subscription state determines premium features
- Match → Call: Gender filter must be enforced before room creation
- Call → Moderation: Disconnect events feed strike system
- Billing → Support: Refund requests create support tickets
- Network → All: Every surface must handle offline state gracefully

**User selected [C] Continue — saving and proceeding to step 5.**

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices

### Naming Patterns

**Database Naming Conventions (Drizzle ORM):**
- Table naming: `snake_case` plural — `users`, `call_sessions`, `subscription_tiers`
- Column naming: `snake_case` — `user_id`, `created_at`, `native_language`
- Foreign keys: `table_id` format — `user_id`, `partner_id`, `room_id`
- Indexes: `idx_table_column` — `idx_users_email`, `idx_calls_started_at`
- Enums: `PascalCase` singular — `ModerationState`, `SubscriptionTier`, `Gender`

**API Naming Conventions (oRPC):**
- Router naming: `camelCase` domain — `authRouter`, `callRouter`, `billingRouter`
- Procedure naming: `camelCase` action — `matchPartners`, `createRoom`, `submitTicket`
- Input schemas: `PascalCase` + `Input` — `MatchPartnersInput`, `CreateRoomInput`
- Output schemas: `PascalCase` + `Output` — `MatchPartnersOutput`, `CallSessionOutput`
- Error codes: `SCREAMING_SNAKE_CASE` — `CALL_NOT_FOUND`, `PARTNER_OFFLINE`, `PAYMENT_FAILED`

**Code Naming Conventions:**
- Components: `PascalCase` — `CallCard`, `SkipButton`, `NetworkBanner`
- Files: `kebab-case` for pages/screens, `PascalCase` for components — `call-screen.tsx`, `CallCard.tsx`
- Functions: `camelCase` verb-first — `useCallState`, `handleSkip`, `calculateCooldown`
- Hooks: `camelCase` with `use` prefix — `useAuth`, `useQueue`, `useNetworkStatus`
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_RECONNECT_MS`, `SHORT_CALL_THRESHOLD_S`
- Types: `PascalCase` — `CallState`, `ModerationEvent`, `RefundRequest`

### Structure Patterns

**Project Organization:**
```
packages/
  db/
    src/
      schema/
        auth.ts         # Better-Auth tables (existing)
        models.ts       # Matching + CEFR tables (existing)
        moderation.ts   # NEW: strikes, cooldowns, reviews
        billing.ts      # NEW: subscriptions, transactions, refunds
        support.ts      # NEW: tickets, responses, SLA
        call.ts         # NEW: sessions, ratings, disconnects
      migrations/       # Drizzle migration files
      seed.ts           # Dev seed data
  api/
    src/
      routers/
        auth.ts         # Better-Auth endpoints (existing)
        models.ts       # Matching endpoints (existing)
        livekit.ts      # LiveKit token + room (existing)
        moderation.ts   # NEW: strike system, state queries
        billing.ts      # NEW: subscription, payment, refund
        support.ts      # NEW: ticket CRUD, SLA tracking
        call.ts         # NEW: session logs, ratings
      validators/       # Shared Zod schemas
      middleware/       # Auth, rate limit, logging
      types/            # Shared TypeScript types
  ui/
    src/
      components/       # shadcn/ui primitives
      styles/           # globals.css, tokens
      hooks/            # Shared UI hooks
  auth/
    src/
      index.ts          # Better-Auth config
      phone-otp.ts      # NEW: phone OTP provider
      google-oauth.ts     # NEW: Google OAuth provider
  env/
    src/
      index.ts          # Zod env validation

apps/
  web/
    src/
      app/              # Next.js 16 App Router
      components/       # Web-specific components
      hooks/            # Web-specific hooks
      lib/              # Web utilities
  native/
    src/
      app/              # Expo Router
      components/       # Native-specific components
      hooks/            # Native-specific hooks
      lib/              # Native utilities
  server/
    src/
      index.ts          # Hono server entry
      routes/           # Route mounting
      middleware/       # Server middleware
```

**Test Organization:**
- Co-located tests: `*.test.ts` next to source files
- Integration tests: `tests/integration/` per app
- E2E tests: `tests/e2e/` at root (Playwright for web, Detox for native)

### Format Patterns

**API Response Formats (oRPC):**
- Success: Direct typed response (no wrapper) — `{ id: "...", state: "active" }`
- Error: Structured error object — `{ code: "CALL_NOT_FOUND", message: "...", retryable: false }`
- Batch: Array of results — `[{ id: "..." }, { error: { code: "..." } }]`
- Pagination: `{ items: [...], nextCursor: "...", hasMore: true }`

**Data Exchange Formats:**
- JSON field naming: `camelCase` in API, `snake_case` in DB
- Date format: ISO 8601 strings — `2026-06-13T10:30:00Z`
- Duration: Seconds as integers — `callDuration: 1200` (20 minutes)
- Currency: Integer smallest unit — `amount: 39900` (₹399.00)
- Phone numbers: E.164 format — `+8801XXXXXXXXX`
- Status enums: String values — `"clean"`, `"warned"`, `"cooldown"`

### Communication Patterns

**Event System:**
- LiveKit events: Passthrough with `lk:` prefix — `lk:connected`, `lk:reconnecting`, `lk:disconnected`
- App events: `domain.action` format — `call.started`, `call.ended`, `queue.matched`, `strike.issued`
- Event payload: `{ type: "...", payload: { ... }, timestamp: "..." }`

**State Management:**
- Server state: TanStack Query — `queryKey: ["call", callId]`, `queryKey: ["queue", userId]`
- Optimistic updates: Update cache before API confirmation, rollback on error
- Invalidation: `queryClient.invalidateQueries({ queryKey: ["subscription"] })`
- Local state: React Context for auth session, call state, moderation state
- Form state: TanStack Form — `form.handleSubmit`, `field.state.value`

### Process Patterns

**Error Handling:**
- Global error boundary: Catch unexpected errors, log to `evlog`, show generic "Something went wrong"
- API errors: Surface specific message from error response, show retry button if `retryable: true`
- Network errors: Auto-retry with exponential backoff (max 3 attempts, 1s/2s/4s delay)
- Auth errors: Silent refresh first, redirect to login only after refresh fails 3 times
- Payment errors: Surface PSP message, offer "Try again" or "Contact support"

**Loading States:**
- Skeleton: `Skeleton` component from shadcn/ui for initial load (3–4 rows)
- Spinner: `Loader2` from lucide-react for inline actions (button loading state)
- Progress: Linear progress for queue waiting (animated, 15s updates)
- Toast: `sonner` for background operations ("Refund processing…", "Ticket created")
- Disabled: Buttons disabled during submission, not hidden

**Retry Patterns:**
- TanStack Query: `retry: 3`, `retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)`
- LiveKit reconnect: ICE restart (1–5s), full reconnection (5–30s), fail after 30s
- Payment: No auto-retry (user must confirm), except webhook processing (3 retries over 24h)

### Enforcement Guidelines

**All AI Agents MUST:**

1. Use `snake_case` for DB tables/columns, `camelCase` for API/code, `PascalCase` for types/components
2. Place co-located tests as `*.test.ts` next to source files
3. Use Zod schemas for all API inputs, shared in `packages/api/src/validators/`
4. Return structured errors with `{ code, message, retryable }` — never throw raw strings
5. Use TanStack Query for all server state, never use `useEffect` + `fetch`
6. Handle loading states visibly — skeletons, spinners, or disabled states
7. Implement retry with exponential backoff for network errors (max 3 attempts)
8. Use `evlog` for structured logging, not `console.log`
9. Respect the dark-mode-first token system — always test in dark mode
10. Follow the existing monorepo structure — new packages go in `packages/`, new apps in `apps/`

**Pattern Enforcement:**
- Ultracite (Biome) catches naming and formatting violations
- TypeScript strict mode catches type inconsistencies
- `check-types` script runs on CI for all packages
- Code review: PR template includes pattern checklist

### Pattern Examples

**Good Example — API Router:**
```typescript
// packages/api/src/routers/call.ts
import { z } from "zod";
import { os } from "@orpc/server";

export const callRouter = os.router({
  createSession: os
    .input(z.object({ matchId: z.string(), userId: z.string() }))
    .output(z.object({ roomName: z.string(), token: z.string() }))
    .handler(async ({ input }) => {
      const session = await createCallSession(input.matchId, input.userId);
      return { roomName: session.roomName, token: session.token };
    }),

  submitRating: os
    .input(z.object({ callId: z.string(), stars: z.number().min(1).max(5), helpedPractice: z.boolean() }))
    .handler(async ({ input }) => {
      return await saveCallRating(input);
    }),
});
```

**Good Example — Component:**
```typescript
// apps/native/components/call/CallCard.tsx
import { useCallState } from "@/hooks/use-call-state";

export function CallCard() {
  const { state, partner, duration, networkStatus } = useCallState();

  return (
    <View className="bg-elevated rounded-lg border border-border p-4">
      <Avatar source={partner.avatar} />
      <Text className="text-foreground text-lg">{partner.name}</Text>
      <CallTimer seconds={duration} />
      <NetworkBanner status={networkStatus} />
      <CallControls />
    </View>
  );
}
```

**Anti-Pattern — What to Avoid:**
```typescript
// ❌ Wrong: Direct fetch in useEffect
useEffect(() => {
  fetch("/api/call").then(r => r.json()).then(setData);
}, []);

// ✅ Correct: TanStack Query
const { data } = useQuery({ queryKey: ["call", callId], queryFn: fetchCall });

// ❌ Wrong: Mixed naming conventions
const user_id = "123"; // DB style in code
const createdAt = "..."; // camelCase in DB schema

// ✅ Correct: camelCase in code, snakeCase in DB
const userId = "123"; // code
const created_at = "..."; // DB schema

// ❌ Wrong: Raw error throwing
throw new Error("Something went wrong");

// ✅ Correct: Structured error
throw new ORPCError({ code: "CALL_NOT_FOUND", message: "...", retryable: false });
```

**User selected [C] Continue — saving and proceeding to step 6.**

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
community/
├── README.md
├── package.json                    # Workspace root, pnpm + turbo
├── pnpm-workspace.yaml             # apps/*, packages/*
├── turbo.json                      # Pipeline: dev, build, check-types
├── .env.example                    # Shared env template
├── .env.local                      # Local overrides (gitignored)
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Type check, lint, test
│       └── deploy.yml              # Web (Vercel), Server (Railway)
│
├── apps/
│   ├── web/                        # Next.js 16 (port 3001)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── auth/
│   │   │   │   │   ├── sign-in/page.tsx
│   │   │   │   │   ├── sign-up/page.tsx
│   │   │   │   │   └── otp/page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── subscription/page.tsx
│   │   │   │   │   ├── support/page.tsx
│   │   │   │   │   └── account-standing/page.tsx
│   │   │   │   └── billing/
│   │   │   │       └── refund/page.tsx
│   │   │   ├── components/
│   │   │   │   ├── call/           # Call screen web parity (not supported v1)
│   │   │   │   ├── settings/
│   │   │   │   └── forms/
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts
│   │   │   │   └── use-subscription.ts
│   │   │   └── lib/
│   │   │       └── utils.ts
│   │   └── public/
│   │
│   ├── native/                     # Expo 56 (React Native 0.85)
│   │   ├── package.json
│   │   ├── app.json
│   │   ├── src/
│   │   │   ├── app/                # Expo Router (file-based)
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx       # S1: Home
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── sign-in.tsx
│   │   │   │   │   ├── sign-up.tsx
│   │   │   │   │   └── otp.tsx     # Phone OTP
│   │   │   │   ├── (onboarding)/
│   │   │   │   │   ├── profile.tsx
│   │   │   │   │   ├── language.tsx
│   │   │   │   │   └── cefr.tsx
│   │   │   │   ├── call/
│   │   │   │   │   ├── index.tsx   # S3: Matchmaking queue
│   │   │   │   │   ├── [id].tsx    # S4: Call screen
│   │   │   │   │   ├── ended.tsx   # S5: Call ended
│   │   │   │   │   └── rating.tsx  # S6: Post-call rating
│   │   │   │   ├── settings/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── subscription.tsx
│   │   │   │   │   ├── support.tsx
│   │   │   │   │   └── account-standing.tsx
│   │   │   │   └── billing/
│   │   │   │       └── refund.tsx
│   │   │   ├── components/
│   │   │   │   ├── call/
│   │   │   │   │   ├── CallCard.tsx
│   │   │   │   │   ├── CallControls.tsx
│   │   │   │   │   ├── NetworkBanner.tsx
│   │   │   │   │   ├── SkipButton.tsx
│   │   │   │   │   └── MuteButton.tsx
│   │   │   │   ├── queue/
│   │   │   │   │   ├── MatchQueueCard.tsx
│   │   │   │   │   └── FilterPicker.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   ├── SubscriptionCard.tsx
│   │   │   │   │   ├── TicketForm.tsx
│   │   │   │   │   └── AccountStandingBanner.tsx
│   │   │   │   └── ui/             # Nativewind-styled primitives
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts
│   │   │   │   ├── use-call-state.ts
│   │   │   │   ├── use-queue.ts
│   │   │   │   ├── use-network-status.ts
│   │   │   │   └── use-subscription.ts
│   │   │   └── lib/
│   │   │       ├── auth-client.ts
│   │   │       └── livekit-client.ts
│   │   └── assets/
│   │
│   └── server/                     # Hono + oRPC (port 3000)
│       ├── package.json
│       ├── src/
│       │   ├── index.ts            # Hono entry, route mounting
│       │   ├── routes/
│       │   │   ├── health.ts
│       │   │   ├── api.ts          # oRPC router mount
│       │   │   └── webhook.ts      # PSP webhooks
│       │   └── middleware/
│       │       ├── cors.ts
│       │       ├── rate-limit.ts
│       │       └── error-handler.ts
│       └── docker-compose.yml      # Dev dependencies
│
├── packages/
│   ├── ui/                         # shadcn/ui + shared tokens
│   │   ├── package.json
│   │   ├── components.json
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   └── toast.tsx
│   │   │   ├── styles/
│   │   │   │   └── globals.css     # CSS variables, tokens
│   │   │   └── hooks/
│   │   │       └── use-theme.ts
│   │
│   ├── api/                        # oRPC routers + business logic
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── routers/
│   │   │   │   ├── index.ts        # Router composition
│   │   │   │   ├── auth.ts         # Better-Auth endpoints (existing)
│   │   │   │   ├── models.ts       # Matching endpoints (existing)
│   │   │   │   ├── livekit.ts      # LiveKit token + room lifecycle
│   │   │   │   ├── moderation.ts   # NEW: strike system, state, review
│   │   │   │   ├── billing.ts      # NEW: subscription, payment, refund
│   │   │   │   ├── support.ts      # NEW: ticket CRUD, SLA
│   │   │   │   └── call.ts         # NEW: session logs, ratings
│   │   │   ├── validators/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── call.ts
│   │   │   │   ├── moderation.ts
│   │   │   │   ├── billing.ts
│   │   │   │   └── support.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── logging.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       └── errors.ts
│   │
│   ├── db/                         # Drizzle schema + queries
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts         # Better-Auth tables (existing)
│   │   │   │   ├── models.ts       # Matching + CEFR (existing)
│   │   │   │   ├── moderation.ts   # NEW: strikes, cooldowns, reviews
│   │   │   │   ├── billing.ts      # NEW: subscriptions, transactions, refunds
│   │   │   │   ├── support.ts      # NEW: tickets, responses, SLA
│   │   │   │   └── call.ts         # NEW: sessions, ratings, disconnects
│   │   │   └── seed.ts
│   │   └── migrations/
│   │
│   ├── auth/                       # Better-Auth configuration
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts            # Auth config (existing)
│   │   │   ├── phone-otp.ts        # NEW: Phone OTP provider
│   │   │   └── google-oauth.ts     # NEW: Google OAuth provider
│   │
│   ├── env/                        # Shared environment validation
│   │   ├── package.json
│   │   └── src/
│   │       └── index.ts            # Zod env schemas
│   │
│   └── config/                     # Shared TSConfig, Tailwind config
│       ├── package.json
│       ├── tsconfig.json
│       └── tailwind.config.ts
│
├── tests/                          # E2E + integration tests
│   ├── e2e/
│   │   ├── web/
│   │   │   └── auth.spec.ts
│   │   └── native/
│   │       └── call.spec.ts
│   └── integration/
│       ├── api/
│       │   ├── auth.test.ts
│       │   ├── call.test.ts
│       │   └── billing.test.ts
│       └── db/
│           └── schema.test.ts
│
├── docker/
│   └── livekit/
│       └── docker-compose.yml      # Local LiveKit dev server
│
└── docs/
    ├── architecture.md             # This document
    ├── about.md
    ├── ratings-and-reviews.md
    └── livekit.md
```

### Architectural Boundaries

**API Boundaries:**

| Router | Endpoints | Auth | Rate Limit |
|---|---|---|---|
| `auth` | `/api/auth/*` | Public | 10 req/min |
| `models` | `/api/matchPartners` | Required | 30 req/min |
| `livekit` | `/api/livekit/*` | Required | 60 req/min |
| `moderation` | `/api/moderation/*` | Required | 30 req/min |
| `billing` | `/api/billing/*` | Required | 30 req/min |
| `support` | `/api/support/*` | Required | 30 req/min |
| `call` | `/api/call/*` | Required | 60 req/min |
| `webhook` | `/webhooks/*` | HMAC verified | 100 req/min |

**Component Boundaries:**

- **Web components** (`apps/web/components/`) — Only for web surfaces (auth, settings, billing)
- **Native components** (`apps/native/components/`) — Only for native surfaces (call, queue, onboarding)
- **Shared UI primitives** (`packages/ui/components/`) — shadcn/ui base components used by web
- **Native UI primitives** (`apps/native/components/ui/`) — Nativewind-styled versions of shadcn concepts

**Service Boundaries:**

- **Auth service** (`packages/auth/`) — Owns all authentication flows, token management, session storage
- **Matching service** (`packages/api/src/routers/models.ts`) — Owns queue logic, partner selection, embedding computation
- **Call service** (`packages/api/src/routers/livekit.ts`) — Owns room lifecycle, token minting, reconnection signaling
- **Moderation service** (`packages/api/src/routers/moderation.ts`) — Owns strike events, state transitions, review queue
- **Billing service** (`packages/api/src/routers/billing.ts`) — Owns subscription state, payment processing, refund flow
- **Support service** (`packages/api/src/routers/support.ts`) — Owns ticket CRUD, SLA tracking, response routing

**Data Boundaries:**

- **Auth schema** (`packages/db/src/schema/auth.ts`) — User identity, sessions, OAuth accounts
- **Model schema** (`packages/db/src/schema/models.ts`) — Profiles, CEFR, embeddings, match history
- **Moderation schema** (`packages/db/src/schema/moderation.ts`) — Strike events, cooldown state, review queue
- **Billing schema** (`packages/db/src/schema/billing.ts`) — Subscriptions, transactions, refund records
- **Support schema** (`packages/db/src/schema/support.ts`) — Tickets, responses, SLA timestamps
- **Call schema** (`packages/db/src/schema/call.ts`) — Sessions, ratings, disconnect events

### Requirements to Structure Mapping

**FR Category → Directory:**

| FR Category | Primary Location | New Files |
|---|---|---|
| Auth & Session (FR-1..FR-4) | `packages/auth/`, `apps/native/lib/auth-client.ts` | `phone-otp.ts`, `google-oauth.ts`, `auth-client.ts` |
| Call Reliability (FR-5..FR-7) | `packages/api/src/routers/livekit.ts`, `apps/native/src/hooks/use-call-state.ts` | `livekit.ts` (extend), `use-call-state.ts` |
| Matchmaking (FR-8..FR-10) | `packages/api/src/routers/models.ts` | `models.ts` (extend) |
| Moderation (FR-11..FR-13) | `packages/api/src/routers/moderation.ts`, `packages/db/src/schema/moderation.ts` | `moderation.ts` (router + schema) |
| Billing (FR-14..FR-16, FR-20) | `packages/api/src/routers/billing.ts`, `packages/db/src/schema/billing.ts` | `billing.ts` (router + schema) |
| Support (FR-16) | `packages/api/src/routers/support.ts`, `packages/db/src/schema/support.ts` | `support.ts` (router + schema) |
| Mobile Stability (FR-17..FR-19) | `apps/native/src/app/`, `apps/native/src/hooks/` | Backgrounding logic, state preservation |
| Post-call Rating (FR-23) | `packages/api/src/routers/call.ts`, `packages/db/src/schema/call.ts` | `call.ts` (router + schema) |

**Cross-Cutting Concerns → Location:**

| Concern | Location | Files |
|---|---|---|
| Design tokens | `packages/ui/src/styles/globals.css` | CSS variables |
| Error handling | `packages/api/src/utils/errors.ts` | Structured error classes |
| Rate limiting | `packages/api/src/middleware/rate-limit.ts` | Token bucket middleware |
| Logging | `evlog` (all apps) | Structured event logging |
| Validation | `packages/api/src/validators/` | Zod schemas |
| Types | `packages/api/src/types/` | Shared TypeScript |

### Integration Points

**Internal Communication:**

- **App → Server:** oRPC client via TanStack Query (type-safe, cached, retried)
- **Server → DB:** Drizzle ORM (type-safe, relational)
- **Server → LiveKit:** LiveKit Server SDK (room creation, token minting)
- **Server → PSP:** REST API (SSLCommerz, India PSP)
- **Native → Auth:** `expo-secure-store` + `better-auth/expo`
- **Web → Auth:** `httpOnly` cookies + `better-auth`

**External Integrations:**

- **LiveKit Cloud** — WebRTC SFU, room signaling, reconnection
- **SSLCommerz** — BD payments, refunds, webhooks
- **India PSP** — INR payments, refunds, webhooks (Razorpay/Cashfree/PayU)
- **SMS Provider** — OTP delivery with voice fallback
- **Google OAuth** — Sign-in, account linking

**Data Flow:**

1. **User opens app** → Auth check (secure store / cookie) → Silent refresh if needed → Home
2. **Start calling** → Join queue (API) → Match (server) → Room token (LiveKit) → Connect (WebRTC)
3. **Call ends** → Disconnect event (LiveKit) → Call log (DB) → Rating prompt (UI)
4. **Purchase** → Payment intent (API) → PSP redirect → Webhook confirmation → Subscription update (DB)
5. **Support ticket** → Ticket creation (API) → DB insert → SLA timer → Response workflow

### File Organization Patterns

**Configuration Files:**
- Root `package.json` — Workspace orchestration
- `turbo.json` — Build pipeline
- `pnpm-workspace.yaml` — Package boundaries
- `packages/config/` — Shared TSConfig, Tailwind config
- `apps/*/package.json` — App-specific dependencies
- `.env.*` — Environment variables (Zod-validated)

**Source Organization:**
- `packages/*/src/` — Shared packages
- `apps/*/src/` — Application code
- `apps/web/src/app/` — Next.js App Router
- `apps/native/src/app/` — Expo Router (file-based)
- `apps/server/src/routes/` — Hono route mounting
- `packages/api/src/routers/` — oRPC domain routers
- `packages/db/src/schema/` — Drizzle table definitions

**Test Organization:**
- `tests/e2e/web/` — Playwright E2E tests
- `tests/e2e/native/` — Detox E2E tests
- `tests/integration/api/` — API integration tests
- `tests/integration/db/` — Database schema tests
- `*.test.ts` — Co-located unit tests

**Asset Organization:**
- `apps/web/public/` — Static web assets
- `apps/native/assets/` — Native images, fonts, splash screens
- `packages/ui/src/styles/` — Shared CSS, tokens

### Development Workflow Integration

**Development Server Structure:**
- `pnpm dev` — Turbo starts all apps in parallel
- Web: `next dev` (port 3001)
- Server: `bun run --hot src/index.ts` (port 3000)
- Native: `expo start` (Metro bundler)
- DB: `docker compose` (PostgreSQL) or `db:start` (managed)

**Build Process Structure:**
- `pnpm build` — Turbo builds all apps
- Web: `next build` → static + SSR
- Server: `tsdown` → compiled JS, `bun build --compile` → standalone binary
- Native: `expo prebuild` + platform builds

**Deployment Structure:**
- Web: Vercel (Next.js optimized)
- Server: Railway/Render (Docker or Bun)
- DB: Supabase PostgreSQL (managed)
- Native: EAS Build (Expo) → Play Store + App Store

**User selected [C] Continue — saving and proceeding to step 7.**

---

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
- All technology choices are compatible: Next.js 16 + React 19 (web), Expo 56 + React Native 0.85 (native), Hono + oRPC (server), Drizzle + PostgreSQL (DB), Better-Auth (auth), LiveKit Cloud (WebRTC)
- Bun runtime is used for server and native builds; Node.js compatibility for Next.js
- oRPC provides OpenAPI spec which is compatible with all frontend clients (web, native)
- Drizzle ORM is compatible with Better-Auth (both use SQL schema definitions)
- LiveKit Cloud is confirmed (OQ 6 resolved) and SLOs are stated under Cloud topology

**Pattern Consistency:**
- Naming conventions are consistent: `snake_case` for DB, `camelCase` for API/code, `PascalCase` for types/components
- Project structure follows the monorepo pattern established by the starter
- Communication patterns use TanStack Query for server state, React Context for local state
- Error handling uses structured `{ code, message, retryable }` across all surfaces

**Structure Alignment:**
- Project structure supports all architectural decisions (auth, call, moderation, billing, support)
- New packages (`packages/api/src/routers/`, `packages/db/src/schema/`) align with existing patterns
- App boundaries are clear: web (auth/settings), native (call/queue), server (API)
- Integration points are properly structured (oRPC, Drizzle, LiveKit, PSP)

### Requirements Coverage Validation

**FR Category Coverage:**

| FR Category | Status | Coverage |
|---|---|---|
| Auth & Session (FR-1..FR-4) | ✅ | Auth extension + secure storage + refresh tokens |
| Call Reliability (FR-5..FR-7) | ✅ | LiveKit room lifecycle + ICE restart + explicit end states |
| Matchmaking (FR-8..FR-10) | ✅ | Gender predicate + native language + empty-pool fallback |
| Moderation (FR-11..FR-13) | ✅ | Strike system + state machine + visible state API |
| Billing (FR-14..FR-16, FR-20) | ✅ | Subscription state + PSP integration + refund flow |
| Support (FR-16) | ✅ | Ticket CRUD + SLA tracking + response routing |
| Mobile Stability (FR-17..FR-19) | ✅ | Background state + crash recovery + reinstall restore |
| Post-call Rating (FR-23) | ✅ | Rating schema + matching quality signal |

**NFR Coverage:**
- Audio latency: LiveKit Cloud global mesh SFU addresses p95 ≤ 400ms
- Cold start: Auth caching + bundle optimization addresses p95 ≤ 2.5s
- Reconnect: LiveKit ICE restart + client state machine addresses 95%/80% targets
- Login success: Silent refresh + secure storage addresses 99%/95% targets
- Match wait: Queue algorithm + honest state addresses 45s/90s targets
- Gender filter: Filter enforcement + empty-pool fallback addresses ≥ 90% fulfillment
- Support SLA: Ticket system + SLA timer addresses 24h/72h targets
- Paid state: Webhook + polling hybrid addresses ≤ 60s propagation
- Refund: Auto-approve path + retry policy addresses 7-day SLA

### Implementation Readiness Validation

**Decision Completeness:**
- All critical decisions documented with technology versions (Next.js 16.2, Expo 56, React 19.2, Drizzle, Hono, etc.)
- Implementation patterns are comprehensive (naming, structure, format, communication, process)
- Consistency rules are clear and enforceable (Ultracite + TypeScript strict)
- Examples provided for all major patterns (API router, component, error handling)

**Structure Completeness:**
- Complete directory tree defined with all files and directories
- All integration points specified (oRPC, Drizzle, LiveKit, PSP)
- Component boundaries established (web vs native vs shared)
- Service boundaries defined (auth, matching, call, moderation, billing, support)

**Pattern Completeness:**
- All potential conflict points addressed (12 areas identified)
- Naming conventions comprehensive (DB, API, code, files)
- Communication patterns specified (events, state management, API formats)
- Process patterns complete (error handling, loading states, retry)

### Gap Analysis Results

**Critical Gaps:** None identified. All FRs have architectural support.

**Important Gaps:**
- **Observability dashboard:** NFRs require measurement paths, but specific dashboard setup is not detailed. Architecture defines metrics but not visualization.
- **Testing framework:** No test framework pre-configured. `bmad-testarch-framework` recommended for next step.
- **Native testing:** Detox configuration for E2E native tests not specified.
- **India PSP selection:** Open Question 9 (Razorpay vs Cashfree vs PayU) not resolved — architecture is provider-agnostic but implementation needs a specific choice.

**Nice-to-Have Gaps:**
- **Storybook** for component documentation (not needed for v1)
- **API documentation** auto-generation from oRPC OpenAPI spec (can be generated later)
- **Performance profiling** setup for call quality (LiveKit dashboard provides this)
- **Feature flags** for gradual rollout (not needed for v1)

### Validation Issues Addressed

**No critical issues found.** Architecture is coherent, complete, and ready for implementation.

**Minor issues resolved during validation:**
- Confirmed LiveKit Cloud (not self-hosted) is the right choice for BD/IN border roaming
- Verified dual PSP (BD + India) is architecturally supported with separate webhook handlers
- Confirmed `expo-secure-store` is the right choice for native token storage (not AsyncStorage)
- Verified queue state polling (15s) is simpler than WebSocket for the target network conditions

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Existing starter stack (Better-T-Stack) provides solid foundation
- All required technologies are present and verified
- LiveKit SDK already wired at token-mint layer
- Clear separation of concerns between web, native, and server
- Comprehensive patterns prevent AI agent conflicts
- UX spines and PRD provide complete requirements context

**Areas for Future Enhancement:**
- Observability dashboard setup (post-MVP)
- India PSP selection (Phase 2)
- Testing framework initialization (recommended next step)
- API documentation generation (can be automated from oRPC)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries (web vs native vs shared)
- Refer to this document for all architectural questions
- Use `bmad-dev-story` for implementation, `bmad-testarch-framework` for testing

**First Implementation Priority:**

1. Schema migrations: `packages/db/src/schema/moderation.ts`, `billing.ts`, `support.ts`, `call.ts`
2. Auth extension: `packages/auth/src/phone-otp.ts`, `google-oauth.ts`
3. LiveKit room lifecycle: `packages/api/src/routers/livekit.ts` (extend with createRoom/closeRoom)
4. API routers: `packages/api/src/routers/moderation.ts`, `billing.ts`, `support.ts`, `call.ts`

---

**User selected [C] Continue — architecture complete. Saving and finalizing.**