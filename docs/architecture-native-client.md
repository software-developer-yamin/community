# Architecture: Native Client + Web Admin Panel

**Last Updated:** 2026-06-23  
**Status:** Active

## Overview

This document captures the architectural decision for the community project:

- **Native Client** (`apps/native/`): Mobile app for end users (React Native/Expo)
- **Web Admin Panel** (`apps/web/`): Control center for managing mobile app operations
- **Shared Backend** (`apps/server/`): Single API layer serving both surfaces

> **Main Focus: Native Client** - All implementation decisions prioritize mobile user experience.

---

## Architecture Decision Record (ADR)

### Context

We need to build:
1. A **mobile app for users** - must be native for performance, offline capabilities, and platform integration
2. An **admin panel** - web-based for operational efficiency and rich data visualization

### Decision

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Server)                      │
│  apps/server/                                           │
│  - Hono + oRPC                                          │
│  - Single source of truth for all business logic         │
│  - Admin + Client consume same APIs                     │
└─────────────────────────────────────────────────────────┘
           │                           │
           │ oRPC/API                  │ oRPC/API
           ▼                           ▼
┌──────────────────┐      ┌─────────────────────┐
│  Native Client   │      │  Web Admin Panel    │
│  apps/native/    │      │  apps/web/          │
│  - Expo 56       │      │  - Next.js 16       │
│  - React Native  │      │  - React 19         │
│  - Offline-first │      │  - Rich UI          │
│  - Performance   │      │  - Data-dense       │
└──────────────────┘      └─────────────────────┘
```

### Consequences

| Aspect | Native Client | Web Admin Panel |
|--------|---------------|-----------------|
| **Target** | End users | Operators/Admins |
| **Platform** | Mobile (iOS/Android) | Web browser |
| **UI Framework** | React Native + Unistyles | Next.js + shadcn/ui |
| **Offline Support** | ✅ Required | ❌ Not needed |
| **Performance** | Critical | Important |
| **Update Frequency** | App store releases | Instant deploy |
| **Authentication** | Expo Secure Store | Next.js cookies |
| **Build Process** | EAS builds | Vercel deploy |

---

## Technical Implementation

### Native Client (`apps/native/`)

**Core Technologies:**
- Expo 56 + React Native 0.85.3
- File-based routing: `app/(tabs)/`, `app/(drawer)/`
- Native UI: `react-native-unistyles` (no shared web components)
- Auth: `@better-auth/expo` → `expo-secure-store`
- Data: TanStack Query + oRPC client
- Real-time: `@livekit/react-native`

**Key Rules:**
```typescript
// 1. Native files MUST have "use client"
// 2. No react-dom imports
// 3. Use expo-secure-store, NOT AsyncStorage
// 4. Native UI components only - NO shared web primitives
// 5. Offline-first data strategy
```

**Directory Structure:**
```
apps/native/
├── app/                 # Expo Router
│   ├── (tabs)/         # Tab navigation
│   ├── (drawer)/       # Drawer navigation  
│   └── _layout.tsx     # Root layout
├── assets/             # Images, fonts
├── components/         # Native-only components
├── hooks/              # Native-specific hooks
└── navigation/         # Navigation types
```

### Web Admin Panel (`apps/web/`)

**Core Technologies:**
- Next.js 16 (App Router)
- React 19 + Server Components
- shadcn/ui from `packages/ui`
- Auth: `@better-auth/nextjs` → HTTP-only cookies
- Data: TanStack Query + oRPC client

**Key Rules:**
```typescript
// 1. Server Components by default
// 2. Client Components need "use client"
// 3. Use Next.js Image, not <img>
// 4. Use shared UI from packages/ui
```

---

## Shared Contracts

### Authentication
- Single Better Auth instance in `packages/auth/`
- Native: OAuth via Expo, tokens in secure store
- Web: Session cookies with CSRF protection

### API Layer (`packages/api/`)
```typescript
// Public procedures - available to all
publicProcedure
  .query("publicData", {...})

// Protected procedures - requires user session  
protectedProcedure
  .mutation("updateProfile", {...})

// Admin procedures - requires admin role
adminProcedure
  .query("listUsers", {...})
  .mutation("banUser", {...})
```

### Database (`packages/db/`)
- Single PostgreSQL schema
- Drizzle ORM with typed queries
- Naming: `snake_case` in DB, `camelCase` in code

---

## Development Workflow

### Commands
```bash
pnpm dev          # Start all apps
pnpm dev:native   # Native only
pnpm dev:web      # Web only
pnpm build        # Build all
```

### Testing Strategy
- **Native**: Jest + Detox for E2E
- **Web**: Jest + Playwright for E2E
- **Shared**: Contract tests for oRPC procedures

### CI/CD
- **Native**: EAS workflows → App Store + Play Store
- **Web**: Vercel deploy → Instant rollout

---

## Key Principles

1. **Native-First Mindset**: Mobile user experience drives all decisions
2. **Single Backend**: One API, two clients - no duplication
3. **Clear Boundaries**: Web UI ≠ Native UI (different packages)
4. **Offline-Ready**: Native must work without network
5. **Admin-Empowered**: Web panel controls mobile app lifecycle

---

## Future Considerations

- [ ] Deep linking from admin panel to mobile app
- [ ] Remote configuration for mobile features
- [ ] Analytics integration (both surfaces)
- [ ] Push notifications from admin to mobile