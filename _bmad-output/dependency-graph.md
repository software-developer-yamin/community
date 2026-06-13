---
created: 2026-06-14
phase: 0
author: Sisyphus (manual codebase exploration)
status: completed
---

# Phase 0 — Dependency Graph & Implementation Readiness

## Codebase Snapshot (from manual exploration)

### Project Structure
```
community/
├── apps/
│   ├── web/          # Next.js 16 + React 19 + Tailwind
│   ├── native/       # Expo 56 + React Native 0.85
│   └── server/       # Hono + oRPC + Bun
├── packages/
│   ├── ui/           # shadcn/ui primitives + Tailwind config
│   ├── api/          # oRPC routers + types/handlers
│   ├── auth/         # Better-Auth config (Drizzle adapter)
│   ├── db/           # Drizzle schema + migrations
│   └── config/       # Shared TSConfig, Tailwind
```

### Database Schemas (`packages/db/src/schema/`)

| Schema | Status | Tables/Content |
|--------|--------|----------------|
| `auth.ts` | ✅ Live | user, account, session, verification + profile fields (name, gender, nativeLanguage, cefrLevel, interests, goals, etc.) |
| `models.ts` | ✅ Live | User personas, practice partner profiles (voice/accent/rate) |
| `recommendations.ts` | ✅ Live | content_items, content_embeddings, content_scores, user_interactions, user_preferences, admin_stats, admin_activity |
| `todo.ts` | ✅ Live | todo table |
| `rebuild.ts` | ✅ Live but unused | languages, countries, user_flags, user_sessions, moderators, content_moderation, user_restrictions, subscriptions, invoices, refunds, support_tickets/messages/slas, call_ratings/rooms/reactions/reports, notifications, blocked_users |

### Auth (`packages/auth/src/index.ts`)

- **Provider**: Better-Auth with Drizzle (PostgreSQL) adapter
- **Methods**: Email/password, Magic link
- **Plugins**: Expo (native secure store), CORS
- **Hooks**: `onSignUp` sets default profile values
- **Missing**: Phone OTP, Google OAuth — both needed for Epic 1

### API Routers (`packages/api/src/routers/`)

| Router | Status | Endpoints |
|--------|--------|-----------|
| `index.ts` | ✅ Live | `protectedProcedure` (auth check), `adminProcedure` (auth + role check), `publicProcedure` |
| `livekit.ts` | ✅ Live | `getToken` (mint LiveKit token), `getRoomInfo` |
| `models.ts` | ✅ Live | Model A personas CRUD + admin |
| `recommendations.ts` | ✅ Full | Content CRUD, bulk import, hybrid scoring, recommendations, interactions, preferences, admin dashboard/users/analytics/stats, seed data |
| `rebuild.ts` | ⚠️ Placeholder | Empty router stub |
| `todo.ts` | ✅ Live | Todo CRUD |

### Auth/Security Patterns

- `protectedProcedure` — checks `ctx.user` (from Better-Auth session), returns 401 if missing
- `adminProcedure` — extends protected, checks `user.role === "admin"`
- `publicProcedure` — no auth required

---

## Epic & Story Dependency Graph

### EPIC 1: Auth & Session (Foundation)

| Story | Dependencies | Existing Code | Ready? |
|-------|-------------|---------------|--------|
| **1.1: Persistent session** | None (base story) | Better-Auth configured + DB tables + Expo plugin | ✅ **READY** — needs native secure-store wiring |
| **1.2: Silent token refresh** | 1.1 | Better-Auth handles refresh tokens natively | ⏳ Blocks on 1.1 |
| **1.3: Phone OTP** | 1.1 | Auth framework exists, needs new provider | ⏳ Blocks on 1.1 |
| **1.4: Google OAuth** | 1.1 | Auth framework exists, needs new provider | ⏳ Blocks on 1.1 |

### EPIC 2: Call Reliability (Depends on Auth)

| Story | Dependencies | Existing Code | Ready? |
|-------|-------------|---------------|--------|
| **2.1: Server-managed rooms** | Epic 1 (auth needed for token) | LiveKit SDK wired, `getToken` exists, needs `createRoom`/`closeRoom` | ✅ **READY** — token mint works, rooms are LiveKit API calls |
| **2.2: ICE restart** | 2.1 | LiveKit handles ICE restart, needs client-side state machine | ⏳ Blocks on 2.1 |
| **2.3: Full reconnection** | 2.1 | LiveKit SDK supports this | ⏳ Blocks on 2.1 |
| **2.4: Explicit call end** | 2.1 | Needs room lifecycle + UI | ⏳ Blocks on 2.1 |

### EPIC 3: Matchmaking & Filtering

| Story | Dependencies | Existing Code | Ready? |
|-------|-------------|---------------|--------|
| **3.1: Gender filter** | Epic 1 | `gender` field in auth schema | ✅ **READY** — field exists, needs matching algo + Premium check |
| **3.2: Native language field** | Epic 1 | `nativeLanguage` field in auth schema | ✅ **READY** — field exists, needs matching algo |
| **3.3: Match timeout + honest state** | 3.1, 3.2 | Queue logic is new | ⏳ Blocks on 3.1/3.2 |

### EPIC 4: Moderation (Depends on Call System)

| Story | Dependencies | Existing Code | Ready? |
|-------|-------------|---------------|--------|
| **4.1: Strike system** | Epic 2 (needs call data) | Schema in `rebuild.ts` (user_flags, content_moderation, user_restrictions) | ⏳ Blocks on Epic 2 |
| **4.2: Skip button** | Epic 2 (needs call UI) | None | ⏳ Blocks on Epic 2 |
| **4.3: Victim/aggressor** | 4.1 | Schema in `rebuild.ts` (call_reports) | ⏳ Blocks on 4.1 |
| **4.4: Visible moderation state** | 4.1 | Schema in `rebuild.ts` | ⏳ Blocks on 4.1 |

### EPIC 5: Billing (Independent)

| Story | Dependencies | Existing Code | Ready? |
|-------|-------------|---------------|--------|
| **5.1: Subscription state** | None (independent) | Schema in `rebuild.ts` (subscriptions, invoices, etc.) | ✅ **READY** — schema exists, needs PSP integration |
| **5.2: Support tickets** | None (auth only) | Schema in `rebuild.ts` (support_tickets, SLAs) | ✅ **READY** — schema exists |
| **5.3: Refund mechanism** | 5.1 | Schema in `rebuild.ts` (refunds) | ⏳ Blocks on 5.1 |

### EPIC 6: Mobile Stability (Depends on Auth)

| Story | Dependencies | Existing Code | Ready? |
|-------|-------------|---------------|--------|
| **6.1: Backgrounding** | Epic 1 | Expo + React Native lifecycle | ⏳ Blocks on Epic 1 |
| **6.2: Crash resilience** | Epic 1 | Needs auth-aware recovery | ⏳ Blocks on Epic 1 |
| **6.3: Reinstall preservation** | Epic 1 | Cloud-based (not device-only) storage | ⏳ Blocks on Epic 1 |

### EPIC 7: Post-call Rating (Depends on Call System)

| Story | Dependencies | Existing Code | Ready? |
|-------|-------------|---------------|--------|
| **7.1: Rating flow** | Epic 2 (call end screen) | Schema in `rebuild.ts` (call_ratings) | ⏳ Blocks on Epic 2 |
| **7.2: Rating + matching integration** | 7.1 | None | ⏳ Blocks on 7.1 |

---

## Rec Engine Epics (from `epics-recommendation-engine.md`)

| Epic | Status | Ready Work |
|------|--------|------------|
| **RE-1: Content Library** | API exists, needs update + bulk import endpoints + admin gate | ⏳ Partial |
| **RE-2: Embeddings** | API exists, needs real embedding service (FR-6), update trigger (FR-7), real user profiles (SIR-3) | ⏳ **FR-6 is blocker** |
| **RE-3: Recommendation Feed** | API exists (hybrid scoring, caching, filtering), **missing native UI** (FR-23) | ⏳ **FR-23 is blocker** |
| **RE-4: Interactions** | API exists (track interaction, history), missing weighted scoring (FR-14 — v2) | ✅ Mostly done |
| **RE-5: Preferences** | API exists (get/update), **missing native UI** (FR-17) | ⏳ **FR-17 is blocker** |
| **RE-6: Admin** | API exists (dashboard, users, analytics, stats), analytics needs time-series FR-21 | ✅ Mostly done |
| **RE-7: Security** | Needs seed endpoint production-gating (SIR-1) | ⏳ Needs work |

---

## Implementation Priority

### Tier 1 — Ready Now (no dependencies, existing code supports it)

1. **Epic 5, Story 5.2** — Support tickets (schema in `rebuild.ts`, API router new, auth exists)
2. **Epic 5, Story 5.1** — Subscription state (schema exists, needs PSP webhooks + API router)
3. **Epic 2, Story 2.1** — Server-managed rooms (LiveKit wired, `getToken` exists, needs `createRoom`/`closeRoom`)
4. **Epic 3, Story 3.1 & 3.2** — Gender filter + native language (fields exist in schema, needs matching algorithm)
5. **Epic 1, Story 1.1** — Persistent session (auth exists, needs native secure-store wiring)

### Tier 2 — After Tier 1

6. Epic 1: Stories 1.2, 1.3, 1.4 (address review feedback: phone OTP, Google OAuth)
7. Rec Engine: RE-3 Story 3.1 (native feed UI), RE-5 Story 5.1 (native preferences UI)
8. Rec Engine: RE-2 Stories 2.1-2.3 (embedding service integration, real user profiles)

### Tier 3 — After Call System (Epic 2) Working

9. Epic 4: Moderation (strike system, skip, victim/aggressor)
10. Epic 7: Post-call rating
11. Epic 6: Mobile stability (backgrounding, crash, reinstall)

---

## Key Architecture Patterns to Follow

| Pattern | Implementation |
|---------|---------------|
| Protected API | Use `protectedProcedure` from `api/src/routers/index.ts` |
| Admin API | Use `adminProcedure` |
| New API router | Create in `api/src/routers/`, use `router.router()` to mount |
| New DB schema | Create in `db/src/schema/`, export from `db/src/schema/index.ts` |
| Native auth | `expo-secure-store` + `better-auth/expo` plugin |
| Server runtime | Bun (hot reload via `--hot`) |
| Validation | Zod schemas (oRPC infers types) |
| Error format | `{ code: string, message: string, retryable: boolean }` |

---

## Billing Note

The **task() delegation system is not available** due to OpenCode billing limits. All Phase 0 exploration was done manually via direct read/grep/bash. For Phase 1+ implementation, work will need to be done directly rather than delegated to sub-agents, until billing is resolved.
