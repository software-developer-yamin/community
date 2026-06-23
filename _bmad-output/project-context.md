---
project_name: 'community'
user_name: 'Yamin'
date: '2026-06-14'
sections_completed: ['technology_stack', 'language_specific', 'framework_specific', 'testing', 'code_quality', 'workflow', 'critical_dont_miss', 'architecture_native_client']
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Technologies

| Technology | Version | Purpose |
|---|---|---|
| **TypeScript** | ^6.0 | Primary language (strict mode, ESNext) |
| **Bun** | ^1.3.4 | Runtime (server + native builds) |
| **Next.js** | ^16.2.0 | Web framework (App Router, port 3001) |
| **React** | ^19.2.6 | UI library (web + native) |
| **Expo** | ~56.0.3 | Native mobile framework |
| **React Native** | 0.85.3 | Native UI layer |
| **Hono** | ^4.8.2 | Server framework |
| **oRPC** | ^1.13.14 | Type-safe API layer |
| **Drizzle ORM** | ^0.45.1 | Database ORM |
| **PostgreSQL** | 15+ | Database engine |
| **Better-Auth** | 1.6.11 | Authentication |
| **Tailwind CSS** | ^4.1.18 | Styling (web + native via Nativewind) |
| **Zod** | ^4.1.13 | Schema validation |
| **TanStack Query** | ^5.90.12 | Server state management |
| **TanStack Form** | ^1.28.0 | Form state management |
| **LiveKit** | ^2.13.0 | WebRTC real-time voice |
| **LiveKit React Native** | ^2.11.0 | Native LiveKit SDK |
| **shadcn/ui** | ^3.6.2 | UI primitives (web) |
| **Ultracite** | 7.8.1 | Linting/formatting (Biome-based) |

### Key Dependencies

| Package | Version | Notes |
|---|---|---|
| `@ai-sdk/react` | ^3.0.3 | AI SDK for React |
| `@orpc/tanstack-query` | ^1.13.14 | oRPC + TanStack Query integration |
| `drizzle-orm` | ^0.45.1 | Database queries |
| `pg` | ^8.17.1 | PostgreSQL driver |
| `hono` | ^4.8.2 | Server framework |
| `better-auth` | 1.6.11 | Auth framework |
| `@better-auth/expo` | 1.6.11 | Expo auth plugin |
| `evlog` | ^2.14.1 | Structured logging |
| `next-themes` | ^0.4.6 | Theme switching |
| `sonner` | ^2.0.5 | Toast notifications |
| `lucide-react` | ^0.546.0 | Icons |
| `react-native-unistyles` | ^3.2.4 | Native theming |

### Version Constraints & Compatibility

- **Node.js**: Use Bun for server and native builds; Node.js compatibility layer for Next.js
- **React 19**: Use `ref` as prop (not `forwardRef`). Use `React.JSX.Element` for types.
- **TypeScript**: Strict mode enabled (`strict: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`)
- **Expo**: Uses Expo Router v4 (file-based routing). `unstable_settings` supported.
- **Tailwind v4**: Uses `@import "tailwindcss"` not `@tailwind` directives. CSS variables for theming.
- **oRPC**: Use `os.$context<Context>()` for router creation. Zod v4 for validation.
- **LiveKit**: Cloud-hosted (not self-hosted). React Native SDK requires `@config-plugins/react-native-webrtc`.
- **Drizzle**: Use `drizzle-orm/node-postgres` for server. Schema files in `packages/db/src/schema/`.

---

## Language-Specific Rules (TypeScript)

### TypeScript Configuration

- **Strict mode is mandatory** — `strict: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true` in all tsconfig files
- **Bun types** — Always include `"types": ["bun"]` in tsconfig for server packages
- **Path aliases** — Use `@/*` for app-internal imports, `@community/*` for workspace packages
- **JSX** — Web: `"jsx": "react-jsx"`, Server: `"jsx": "react-jsx", "jsxImportSource": "hono/jsx"`, Native: `"jsx": "react-jsx"` with Expo base

### Import/Export Patterns

- **Use `type` imports** — `import type { Context } from "hono"` (not `import { type Context }`)
- **No `export *` barrel files** — Prefer explicit exports to avoid circular dependencies and tree-shaking issues
- **Workspace imports** — Use `@community/api`, `@community/db`, `@community/ui`, `@community/auth` for cross-package imports
- **Node.js imports** — Use `node:` prefix: `import { createHash } from "node:crypto"` (not `import { createHash } from "crypto"`)

### Error Handling Patterns

- **Never throw raw strings** — Always throw `Error` objects with descriptive messages: `throw new Error("llama.cpp error: ...")`
- **oRPC errors** — Use `ORPCError` with structured codes: `throw new ORPCError("UNAUTHORIZED")` or `throw new ORPCError("FORBIDDEN", { message: "Admin access required" })`
- **Zod validation** — Parse with `.parse()` for strict validation, `.safeParse()` for optional handling
- **Async errors** — Use `try-catch` in async handlers, not `.catch()` chains
- **HTTP errors** — Check `response.ok` before parsing; throw descriptive errors for non-2xx

### Type Patterns

- **Avoid `any`** — Use `unknown` for genuinely unknown types, then narrow with type guards
- **Use `const` assertions** — `as const` for immutable arrays and literal types
- **Explicit return types** — Add return types to public functions and API handlers for type safety
- **Drizzle types** — Use `typeof table.$inferSelect` and `typeof table.$inferInsert` for DB types
- **oRPC context** — Define `Context` interface explicitly and use `Awaited<ReturnType<typeof createContext>>`

---

## Framework-Specific Rules (React / Next.js / Expo / Hono)

### React Rules

- **Function components only** — No class components. Use function declarations for components: `export default function Header() { ... }`
- **Hooks at top level** — Never call hooks conditionally. Always call hooks in the same order every render.
- **Use `ref` as prop** — React 19: pass `ref` directly as a prop (not `React.forwardRef`).
- **Specify all hook dependencies** — Include every dependency in `useEffect`, `useMemo`, `useCallback` dependency arrays. Use `useRef` for values that shouldn't trigger re-renders.
- **No component definitions inside components** — Define components at module level, not inside other components.
- **Use `key` for iterables** — Prefer unique IDs over array indices. Use `crypto.randomUUID()` if no stable ID exists.
- **Nest children between tags** — `<Component>{children}</Component>` instead of `<Component children={children} />`
- **Semantic HTML** — Use `<button>`, `<nav>`, etc. instead of `div`s with roles. Provide `alt` text for images, labels for inputs, and keyboard handlers alongside mouse events.
- **Use `use client` directive** — Add `"use client"` at the top of files that use client-side hooks (useState, useEffect, browser APIs, etc.). Next.js Server Components must NOT use client hooks.

### Next.js Rules

- **App Router** — Use App Router (`src/app/`) with file-based routing. Page components are Server Components by default.
- **Server Components for async data** — Use Server Components for async data fetching. Do NOT use async Client Components.
- **Typed routes** — `typedRoutes: true` enabled. Use `next/link` with typed routes.
- **React Compiler** — `reactCompiler: true` enabled. Write idempotent components; avoid side effects in render.
- **Fonts** — Use `next/font` for font loading (e.g., `Geist` from `next/font/google`).
- **Images** — Use `next/image` for optimized images, not `<img>` tags.
- **Metadata** — Use `next/head` or App Router metadata API for head elements.
- **Transpile packages** — `transpilePackages: ["shiki"]` in next.config.ts. Add other packages as needed.
- **Path aliases** — `@/*` maps to `./src/*` for web app. `@community/ui/*` maps to `../../packages/ui/src/*`.

### Expo / React Native Rules

- **Expo Router** — File-based routing in `app/`. Use `(drawer)` for drawer navigation groups.
- **`unstable_settings`** — Use for initial route configuration: `export const unstable_settings = { initialRouteName: "(drawer)" }`
- **Polyfills** — Import `@/polyfills` at the top of `_layout.tsx` for required polyfills.
- **Unistyles** — Use `useUnistyles()` for theme-aware styling. Access theme colors via `theme.colors.background`.
- **Gesture Handler** — Wrap root with `GestureHandlerRootView` for gesture support.
- **LiveKit** — Use `@livekit/react-native` with `@config-plugins/react-native-webrtc` plugin.
- **Auth** — Use `expo-secure-store` for refresh token storage (not AsyncStorage). Use `@better-auth/expo` plugin.
- **Path aliases** — `@/*` maps to `./*` in native app.

### Hono / oRPC Rules

- **Hono app** — Create with `new Hono<EvlogVariables>()` for typed variables.
- **Middleware order** — Logging first (`evlog()`), then auth, then CORS, then routes.
- **oRPC routers** — Use `os.$context<Context>()` to create typed router builder.
- **Procedures** — `publicProcedure` (no auth), `protectedProcedure` (requires session), `adminProcedure` (requires admin role).
- **Zod validation** — Always validate inputs with Zod schemas. Use `z.object({ ... })` for object inputs.
- **Error handling** — Use `onError` interceptor in `RPCHandler` and `OpenAPIHandler` to log errors.
- **Auth handler** — Mount auth at `/api/auth/*` with `auth.handler(c.req.raw)`.
- **CORS** — Configure with `env.CORS_ORIGIN`, allow credentials, and specific methods/headers.
- **Context creation** — Create context from Hono context, extract session via `auth.api.getSession()`.

---

## Testing Rules

- **No test framework pre-configured** — Project currently has no testing framework. Add per `bmad-testarch-framework` if needed.
- **Co-located tests** — Place `*.test.ts` files next to source files.
- **Integration tests** — Place in `tests/integration/` per app.
- **E2E tests** — Place in `tests/e2e/` at root. Use Playwright for web, Detox for native.
- **No `.only` or `.skip`** — Never commit `.only` or `.skip` in test files.
- **Async tests** — Use `async/await` in tests, not done callbacks.
- **Assertions inside blocks** — Write assertions inside `it()` or `test()` blocks, not in helper functions.

---

## Code Quality & Style Rules

### Linting & Formatting

- **Ultracite (Biome)** — Zero-config linting/formatting. Run `pnpm dlx ultracite fix` before committing.
- **Pre-commit hook** — Husky runs `pnpm dlx ultracite fix` on staged files and re-stages them.
- **No custom ESLint/Prettier** — Project uses Biome via Ultracite. Do NOT add `.eslintrc` or `.prettierrc`.
- **Biome config** — Extends `ultracite/biome/core`, `ultracite/biome/next`, `ultracite/biome/react`. Excludes `_bmad`, `.agents/skills`, `.claude/skills`.

### Naming Conventions

| Layer | Convention | Examples |
|---|---|---|
| **DB tables** | `snake_case` plural | `users`, `call_sessions` |
| **DB columns** | `snake_case` | `user_id`, `created_at` |
| **DB indexes** | `idx_table_column` | `idx_users_email` |
| **DB enums** | `PascalCase` singular | `ModerationState`, `SubscriptionTier` |
| **API routers** | `camelCase` domain | `authRouter`, `callRouter` |
| **API procedures** | `camelCase` action | `matchPartners`, `createRoom` |
| **Input schemas** | `PascalCase` + `Input` | `MatchPartnersInput` |
| **Output schemas** | `PascalCase` + `Output` | `MatchPartnersOutput` |
| **Error codes** | `SCREAMING_SNAKE_CASE` | `CALL_NOT_FOUND`, `PAYMENT_FAILED` |
| **Components** | `PascalCase` | `CallCard`, `SkipButton` |
| **Component files** | `kebab-case` | `call-screen.tsx`, `mode-toggle.tsx` |
| **Hooks** | `camelCase` with `use` prefix | `useAuth`, `useQueue`, `useCallState` |
| **Constants** | `SCREAMING_SNAKE_CASE` | `MAX_RECONNECT_MS`, `SHORT_CALL_THRESHOLD_S` |
| **Types** | `PascalCase` | `CallState`, `ModerationEvent` |
| **Functions** | `camelCase` verb-first | `handleSkip`, `calculateCooldown` |

### Code Organization

- **Monorepo structure** — New packages go in `packages/`, new apps in `apps/`. Never create packages outside these directories.
- **Shared packages** — `packages/ui` for UI primitives, `packages/api` for oRPC routers, `packages/db` for schema, `packages/auth` for auth config.
- **App boundaries** — `apps/web` for web surfaces, `apps/native` for mobile, `apps/server` for API.
- **No barrel files** — Export explicitly from each file. Do not use `index.ts` files that re-export everything.
- **Schema organization** — One file per domain in `packages/db/src/schema/`: `auth.ts`, `models.ts`, `moderation.ts`, `billing.ts`, `support.ts`, `call.ts`.
- **Router organization** — One file per domain in `packages/api/src/routers/`: `auth.ts`, `models.ts`, `livekit.ts`, `moderation.ts`, `billing.ts`, `support.ts`, `call.ts`.

### Documentation

- **Self-documenting code** — Prefer descriptive names over comments. Add comments only for complex logic.
- **No `console.log`** — Use `evlog` for structured logging. Remove all `console.log`, `debugger`, and `alert` statements before committing.
- **JSDoc for public APIs** — Add JSDoc comments to exported functions, especially in `packages/api` and `packages/db`.

---

## Development Workflow Rules

### Git & Commits

- **Husky pre-commit** — Runs `pnpm dlx ultracite fix` on all staged files. If formatting fails, the commit is blocked.
- **No commit message hooks** — No conventional commit enforcement. Write descriptive messages.
- **Branch protection** — No specific branch naming convention enforced. Use descriptive branch names.

### Scripts

- **`pnpm dev`** — Starts all apps in parallel (web, server, native).
- **`pnpm dev:web`** — Starts only web app.
- **`pnpm dev:server`** — Starts only server.
- **`pnpm dev:native`** — Starts only native app.
- **`pnpm build`** — Builds all apps via Turbo.
- **`pnpm check-types`** — Type-checks all packages.
- **`pnpm db:push`** — Pushes schema to database.
- **`pnpm db:studio`** — Opens Drizzle Studio.
- **`pnpm db:generate`** — Generates Drizzle migrations.
- **`pnpm db:migrate`** — Runs Drizzle migrations.
- **`pnpm check`** — Runs Ultracite check.
- **`pnpm fix`** — Runs Ultracite fix.
- **`pnpm prepare`** — Initializes Husky hooks.

### Database Workflow

- **Schema changes** — Edit `packages/db/src/schema/*.ts`, then run `pnpm db:push` for dev or `pnpm db:generate` + `pnpm db:migrate` for production.
- **Docker compose** — `packages/db/docker-compose.yml` for local PostgreSQL. Use `pnpm db:start` / `pnpm db:stop`.
- **LiveKit dev** — `pnpm livekit:up` / `pnpm livekit:down` for local LiveKit server.

### Environment Variables

- **Shared env** — `packages/env` contains Zod-validated environment schemas.
- **App-specific env** — `apps/web/.env`, `apps/server/.env`, `apps/native/.env`.
- **Never commit `.env` files** — All `.env*` files are in `.gitignore`.
- **Required env vars** — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `NEXT_PUBLIC_SERVER_URL`.

---

## Critical Don't-Miss Rules

### Anti-Patterns to Avoid

- **Never use `useEffect` + `fetch`** — Always use TanStack Query (`useQuery`, `useMutation`) for server state. Use `orpc.healthCheck.queryOptions()` for oRPC queries.
- **Never throw raw strings** — Always throw `Error` or `ORPCError` objects with descriptive messages.
- **Never use `any`** — Use `unknown` and type guards, or explicit types. TypeScript strict mode will catch `any`.
- **Never use `console.log` in production** — Use `evlog` for structured logging. The `evlog` integration with `better-auth` and `ai` SDK is already configured.
- **Never mix DB naming in code** — Use `camelCase` in code (`userId`), `snake_case` in DB schema (`user_id`).
- **Never use `export *`** — Explicit exports prevent circular dependencies and improve tree-shaking.
- **Never forget `use client`** — Client components in Next.js App Router MUST have `"use client"` at the top.
- **Never use async Client Components** — Next.js Server Components can be async, but Client Components cannot.
- **Never use `dangerouslySetInnerHTML`** — Unless absolutely necessary. Prefer React components.
- **Never skip `key` prop** — Always provide stable `key` props for list items. Prefer unique IDs over indices.

### Edge Cases

- **Auth state durability** — Session must survive app kills, OS reboots, token expiry mid-call. Use `expo-secure-store` for native refresh tokens.
- **Network resilience** — All surfaces must handle intermittent connectivity. Use TanStack Query with retry logic (`retry: 3`, exponential backoff).
- **Payment idempotency** — Webhook handlers must be idempotent. Use transaction IDs for deduplication.
- **Call reconnection** — LiveKit handles ICE restart (1–5s) and full reconnection (5–30s). Implement UI state machine for reconnection states.
- **Queue state** — Poll every 15s for queue state. Handle offline state gracefully (pause, don't drop).
- **Theme switching** — Use `next-themes` for web, `expo-system-ui` for native. Respect system preference by default.
- **Dark mode first** — Design tokens are defined for dark mode. Always test UI in dark mode.

### Security Rules

- **Add `rel="noopener"`** — When using `target="_blank"` on links.
- **Validate user input** — Always use Zod schemas for API inputs. Never trust client-side data.
- **Secure cookies** — `httpOnly`, `secure`, `SameSite=none` for auth cookies (configured in `packages/auth/src/index.ts`).
- **Rate limiting** — Auth endpoints: 10 req/min. API endpoints: 30 req/min. LiveKit endpoints: 60 req/min.
- **LiveKit tokens** — Short-lived (5min expiry), room-scoped. Generate on server only.
- **Payment webhooks** — Verify HMAC signature before processing. Use idempotency keys.
- **CORS** — Only allow `env.CORS_ORIGIN`, specific methods, and `credentials: true`.
- **No `eval()` or `document.cookie` manipulation** — Never use dynamic code execution or direct cookie manipulation.

### Performance Gotchas

- **Avoid spread in loops** — Do not use spread syntax in accumulator loops. Use mutation or `push`.
- **Avoid regex in loops** — Use top-level regex literals instead of creating them inside loops.
- **Prefer specific imports** — `import { Button } from "@community/ui/components/button"` instead of namespace imports.
- **Use Next.js Image** — Always use `<Image>` component for images, not `<img>`.
- **Bundle splitting** — Use dynamic imports for heavy components: `const HeavyComponent = dynamic(() => import("./HeavyComponent"))`.
- **TanStack Query caching** — Use appropriate `staleTime` and `gcTime` to avoid unnecessary refetches.
- **Drizzle queries** — Use `.limit()` and `.offset()` for pagination. Avoid `SELECT *` on large tables.
- **Embedding queries** — Use `cosineDistance` with `gt()` filter for similarity search. Over-fetch then filter in JS for CEFR matching.

---

## Project Structure Reference

```
community/
├── apps/
│   ├── web/              # Next.js 16 (port 3001)
│   ├── native/           # Expo 56 (React Native 0.85)
│   └── server/           # Hono + oRPC (port 3000)
├── packages/
│   ├── ui/               # shadcn/ui primitives + shared tokens
│   ├── api/              # oRPC routers + business logic
│   ├── auth/             # Better-Auth configuration
│   ├── db/               # Drizzle schema + queries
│   ├── env/              # Zod env validation
│   └── config/           # Shared tsconfig
├── docs/                 # Project documentation
├── docker/               # Docker compose files
├── _bmad-output/         # BMad planning artifacts
└── .agents/              # Agent skills
```

### Key Files

| File | Purpose |
|---|---|
| `apps/server/src/index.ts` | Hono server entry point |
| `packages/api/src/index.ts` | oRPC router builder with auth procedures |
| `packages/api/src/routers/index.ts` | Router composition |
| `packages/db/src/index.ts` | Drizzle DB instance |
| `packages/auth/src/index.ts` | Better-Auth config |
| `packages/ui/src/styles/globals.css` | Tailwind CSS variables + tokens |
| `apps/web/src/utils/orpc.ts` | oRPC client + TanStack Query setup |
| `apps/web/src/lib/auth-client.ts` | Better-Auth client |
| `apps/native/app/_layout.tsx` | Expo root layout |
| `turbo.json` | Turborepo pipeline config |
| `pnpm-workspace.yaml` | Workspace + dependency catalog |

---

*Last updated: 2026-06-14*
*For questions or updates to this context, use the `bmad-generate-project-context` skill.*

---
