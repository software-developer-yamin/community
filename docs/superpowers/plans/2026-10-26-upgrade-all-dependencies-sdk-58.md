# Upgrade All Dependencies to Latest (Expo SDK 58 & Workspace) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all packages across the entire monorepo (`community`) to their latest versions, upgrading `apps/native` from Expo SDK 56 to Expo SDK 58 (`react-native` 0.88.0, `react-native-worklets` 0.13.0, `react-native-nitro-modules` 0.37.1, `react-native-reanimated` 4.7.1, `expo-router` 58.x) so it seamlessly pairs with the latest Android development build (`e43898ed-044e-47a4-88de-3d29c2e21266`), and updating workspace catalog dependencies.

**Architecture:** 
1. Upgrade root and monorepo shared catalog in `pnpm-workspace.yaml` and root `package.json`.
2. Upgrade `apps/native/package.json` to Expo SDK 58 bundled versions and latest libraries.
3. Install dependencies cleanly via `pnpm install`, run `npx expo install --check` / `--fix` in `apps/native` to confirm native version alignments.
4. Verify TypeScript type checking (`turbo check-types`), Jest test suite (`pnpm --filter native test`), and workspace test suite (`pnpm test`).

**Tech Stack:** Expo SDK 58.0.19, React Native 0.88.0, React 19.3.0, `react-native-worklets` 0.13.0, `react-native-nitro-modules` 0.37.1, `react-native-reanimated` 4.7.1, pnpm catalogs, Turbo 2.11.

---

### Task 1: Update Monorepo Catalog & Root Dependencies

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`

**Interfaces:**
- Consumes: latest package releases from npm registry
- Produces: updated dependency catalog for all workspace packages

- [ ] **Step 1: Update `pnpm-workspace.yaml` catalog entries to latest stable versions**
  - `better-auth`: `^1.7.13`
  - `@better-auth/expo`: `^1.7.13`
  - `@tanstack/react-query`: `^5.104.5`
  - `@tanstack/react-form`: `^1.33.5`
  - `@orpc/client`: `^1.16.1`
  - `@orpc/server`: `^1.16.1`
  - `@orpc/openapi`: `^1.16.1`
  - `@orpc/zod`: `^1.16.1`
  - `@orpc/tanstack-query`: `^1.16.1`
  - `livekit-client`: `^2.23.0`
  - `@livekit/react-native`: `^3.1.0`
  - `@livekit/react-native-webrtc`: `^150.1.0`
  - `@livekit/react-native-expo-plugin`: `^1.1.0`
  - `@config-plugins/react-native-webrtc`: `^15.0.2`
  - `zod`: `^4.6.7`
  - `dotenv`: `^18.0.9`

- [ ] **Step 2: Update root `package.json` devDependencies**
  - `@biomejs/biome`: `2.6.3`
  - `@playwright/test`: `^1.64.1`
  - `@types/bun`: `catalog:` (1.4.4)
  - `turbo`: `^2.11.10`
  - `ultracite`: `8.0.2`

- [ ] **Step 3: Run `pnpm install`**
  - Verify lockfile updates without resolution errors.

---

### Task 2: Upgrade `apps/native` to Expo SDK 58 & Latest Native Stack

**Files:**
- Modify: `apps/native/package.json`
- Modify: `apps/native/app.json` (if needed for SDK 58 compatibility)

**Interfaces:**
- Consumes: Expo SDK 58 bundled native modules
- Produces: Native package configuration matching EAS build `e43898ed-044e-47a4-88de-3d29c2e21266`

- [ ] **Step 1: Update `apps/native/package.json` dependencies to SDK 58 specifications**
  - `"expo"`: `"~58.0.19"`
  - `"expo-router"`: `"~58.0.26"`
  - `"expo-constants"`: `"~58.0.13"`
  - `"expo-crypto"`: `"~58.0.6"`
  - `"expo-dev-client"`: `"~58.0.15"`
  - `"expo-font"`: `"~58.0.10"`
  - `"expo-linear-gradient"`: `"~58.0.3"`
  - `"expo-linking"`: `"~58.0.14"`
  - `"expo-network"`: `"~58.0.4"`
  - `"expo-secure-store"`: `"~58.0.2"`
  - `"expo-splash-screen"`: `"~58.0.11"`
  - `"expo-status-bar"`: `"~58.0.4"`
  - `"expo-system-ui"`: `"~58.0.6"`
  - `"expo-web-browser"`: `"~58.0.6"`
  - `"react"`: `"19.3.0"`
  - `"react-dom"`: `"19.3.0"`
  - `"react-native"`: `"0.88.0"`
  - `"react-native-worklets"`: `"0.13.0"`
  - `"react-native-nitro-modules"`: `"0.37.1"`
  - `"react-native-reanimated"`: `"4.7.1"`
  - `"react-native-safe-area-context"`: `"~5.10.1"`
  - `"react-native-screens"`: `"~4.30.0"`
  - `"react-native-gesture-handler"`: `"~3.4.0"`
  - `"react-native-unistyles"`: `"^3.3.0"`
  - `"react-native-web"`: `"~0.21.4"`
  - `"react-native-edge-to-edge"`: `"^1.8.2"`
  - `"babel-preset-expo"`: `"~58.0.20"`
  - `"jest-expo"`: `"~58.0.12"`
  - `"@types/react"`: `"~19.3.0"`
  - `"react-test-renderer"`: `"19.3.0"`

- [ ] **Step 2: Run `pnpm install` and run `npx expo install --check` inside `apps/native`**
  - Verify no dependency version discrepancies remain between Expo SDK 58 expectation and installed packages.

---

### Task 3: Workspace Typecheck & Test Verification

**Files:**
- Test: `apps/native/__tests__/*`
- Test: `packages/api/src/lib/__tests__/*`
- Verify: `apps/native/jest.setup.ts` (update mocks if SDK 58 / Reanimated 4.7 requires adjustments)

- [ ] **Step 1: Run TypeScript check across all packages**
  - Run `pnpm check-types` (`turbo check-types`)
  - Fix any API deprecations or type updates introduced by SDK 58 or React 19.3.

- [ ] **Step 2: Run Jest test suite in `apps/native`**
  - Run `pnpm --filter native test`
  - Ensure all 7 suites and 38 tests pass under `jest-expo` 58.

- [ ] **Step 3: Run complete workspace tests**
  - Run `pnpm test`
  - Ensure all 181+ tests pass across API, native utils, and native components.

---

### Task 4: Verification with `bun run dev:native`

- [ ] **Step 1: Clear metro bundler cache**
  - Run `npx expo start -c` or `bun run dev:native`
- [ ] **Step 2: Confirm bundler starts cleanly with SDK 58**
  - Check Metro logs to confirm:
    - React Native 0.88.0 bundled cleanly
    - Worklets 0.13.0 matches native APK version
    - Nitro Modules 0.37.1 matches native APK version
    - No missing module or route default export errors.
