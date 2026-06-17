---
baseline_commit: 9e21d06
---

# Story 1.3: Phone Number Authentication with OTP

Status: ready-for-dev

## Story

As a Learner,
I want to sign up and sign in using my phone number with a one-time password,
So that I can authenticate without relying on email or passwords.

## Acceptance Criteria

1. **OTP sending (phone → SMS)** — Given I am a new user, When I enter my phone number and request an OTP, Then I receive an SMS with a one-time password within 30 seconds And I can use the OTP to complete registration. (epics#L288-L296)
2. **Existing email user links phone** — Given I am an existing email user, When I add a phone number to my account, Then my account data is preserved And I can sign in with either email or phone. (epics#L293-L296)
3. **Voice call fallback** — Given SMS delivery fails, When the system attempts voice call fallback, Then I receive an automated voice call with the OTP. (epics#L298-L300)
4. **OTP cooldown after 3 failed attempts** — Given I enter an incorrect OTP, When I have 3 failed attempts, Then I can request a new OTP after a 60-second cooldown. (epics#L302-L304)
5. **Cross-platform parity** — Both native (Expo) and web (Next.js) provide equivalent phone OTP sign-up/sign-in flows.
6. **Rate-limited OTP requests** — OTP sending is rate-limited to 10 requests per minute per phone number to prevent abuse.

## Tasks / Subtasks

- [ ] Task 1: Server-side SMS provider integration (AC: 1, 3)
  - [ ] 1.1 Implement real SMS sending in `packages/auth/src/index.ts` `sendOTP` callback using configured SMS provider (Twilio/Vonage/SMS Gateway BD)
  - [ ] 1.2 Add voice call fallback: on SMS failure, retry with automated voice call delivering the same OTP code
  - [ ] 1.3 Add environment variables for SMS provider config (`SMS_PROVIDER`, `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_FROM_NUMBER`)
  - [ ] 1.4 Add rate limiting on OTP send endpoint — 10 req/min per phone number

- [ ] Task 2: OTP rate limiting & cooldown (AC: 4, 6)
  - [ ] 2.1 Implement server-side OTP attempt tracking (3 failed attempts → 60s cooldown)
  - [ ] 2.2 Return meaningful error codes for rate-limited and cooldown states
  - [ ] 2.3 Expose remaining cooldown time in error response so UI can display countdown

- [ ] Task 3: Web auth client — add phoneNumberClient() plugin (AC: 5)
  - [ ] 3.1 Add `phoneNumberClient()` to `apps/web/src/lib/auth-client.ts` plugins array
  - [ ] 3.2 Verify `authClient.phoneNumber.sendOtp()` and `authClient.phoneNumber.verify()` work on web

- [ ] Task 4: Web phone sign-in component (AC: 1, 5)
  - [ ] 4.1 Create `apps/web/src/components/phone-sign-in.tsx` — phone number input screen, mirrors native pattern
  - [ ] 4.2 Phone input with E.164 format validation (Zod schema), country code hint
  - [ ] 4.3 OTP verification screen with 6-digit code input, "change number" link
  - [ ] 4.4 Loading, success, and error states matching existing web form patterns (sonner toast for success/error)
  - [ ] 4.5 Resend OTP button with 30-second countdown cooldown

- [ ] Task 5: Integrate phone sign-in into web login page (AC: 5)
  - [ ] 5.1 Add "Sign in with Phone" tab/option to `apps/web/src/app/login/page.tsx`
  - [ ] 5.2 Wire `PhoneSignIn` component into the existing sign-in/sign-up toggle
  - [ ] 5.3 Add phone option to sign-up flow as well

- [ ] Task 6: Phone linking for existing email users (AC: 2)
  - [ ] 6.1 Add "Add Phone Number" option to user profile/settings on both platforms
  - [ ] 6.2 Phone number update/verify flow that preserves existing email account data
  - [ ] 6.3 Verify sign-in works with either email or phone after linking

- [ ] Task 7: Testing (AC: all)
  - [ ] 7.1 Unit test: OTP send handler with mocked SMS provider
  - [ ] 7.2 Unit test: rate limiting — 10th request in 1 minute is blocked
  - [ ] 7.3 Unit test: 3 failed OTP attempts → 60s cooldown enforced
  - [ ] 7.4 Integration test: phone OTP full flow (send → verify → session created)
  - [ ] 7.5 Integration test: existing email user links phone → both methods work
  - [ ] 7.6 E2E test: web phone sign-in flow (phone input → OTP → dashboard)
  - [ ] 7.7 E2E test: native phone sign-in flow (same sequence)

## Dev Notes

- **Server already has `phoneNumber()` plugin** with `sendOTP` callback in `packages/auth/src/index.ts`. Currently just logs to console: `console.log(\`[DEV] OTP for ${phone}: ${code}\`)`. Need to replace with real SMS provider.
- **Native auth client** at `apps/native/lib/auth-client.ts` already has `phoneNumberClient()` plugin imported and registered. The native `PhoneSignIn` component at `apps/native/components/phone-sign-in.tsx` already implements the full flow (phone input → sendOtp → OTP verify). Verify it works end-to-end.
- **Web auth client** at `apps/web/src/lib/auth-client.ts` does NOT have `phoneNumberClient()` — must be added.
- **Web login page** at `apps/web/src/app/login/page.tsx` toggles between `<SignInForm>` and `<SignUpForm>`. Add phone sign-in as a third view.
- **Existing `.env` / env config**: The project uses `@community/env/*` packages for typed env vars. Need to add SMS provider vars to the server env schema (`packages/env/src/server.ts`).
- **Voice call fallback**: Better-Auth's `phoneNumber()` plugin supports a `sendOTP` callback only. Voice fallback needs custom handling — either in the same callback after SMS fails, or as a separate endpoint. For MVP, use the same callback with SMS-first, voice-retry logic.
- **OTP rate limiting**: Better-Auth may not provide built-in OTP cooldown. Need custom middleware or a check in the `sendOTP` callback using a KV store or DB-based rate limit table.
- **Choosing SMS provider**: For Bangladesh market, consider: Twilio (global, reliable), Vonage/Nexmo (good BD coverage), or local SMS gateway (cheaper). For MVP, implement Twilio with voice callback, with a provider abstraction layer for swapping.
- **Ultracite enforced**: Run `pnpm dlx ultracite fix --skip=correctness/noUnusedImports` before committing. No `console.log`, no `as any`, no `@ts-ignore`.
- **Env vars naming**: Follow existing pattern in `packages/env/src/server.ts`. SMS vars: `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_FROM_NUMBER`, `SMS_VOICE_ENABLED`.

### Key Files & Their Roles

| File | Role | Change |
|------|------|--------|
| `packages/auth/src/index.ts` | Better-Auth server config with phoneNumber() plugin | MODIFY — replace console.log with real SMS provider |
| `packages/env/src/server.ts` | Server env vars schema | MODIFY — add SMS provider vars |
| `apps/web/src/lib/auth-client.ts` | Web auth client | MODIFY — add phoneNumberClient() plugin |
| `apps/web/src/components/phone-sign-in.tsx` | NEW — web phone sign-in component | CREATE |
| `apps/web/src/app/login/page.tsx` | Web login page | MODIFY — add phone sign-in tab |
| `apps/native/lib/auth-client.ts` | Native auth client | VERIFY — phoneNumberClient() already present |
| `apps/native/components/phone-sign-in.tsx` | Native phone sign-in | VERIFY — already implemented |
| `apps/native/app/(drawer)/index.tsx` | Native index/drawer | VERIFY — PhoneSignIn already used |
| `apps/web/src/app/layout.tsx` | Web layout | VERIFY — no changes needed |
| `apps/server/src/index.ts` | Hono server | VERIFY — auth handler at `/api/auth/*` already serves phone endpoints |

### References

- [PRD FR-3] `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md` — phone-number auth (OTP)
- [Epic 1 Story 1.3] `_bmad-output/planning-artifacts/epics.md#L278-L304` — full ACs and story definition
- [Better-Auth phone number plugin] `https://www.better-auth.com/docs/plugins/phone-number` — sendOTP, verify, signUpOnVerification
- [Twilio SMS API] `https://www.twilio.com/docs/sms` — SMS sending and voice calls
- [Better-Auth client plugin] `phoneNumberClient()` — client-side sendOtp/verify methods
- [Story 1.2 file] `_bmad-output/implementation-artifacts/stories/epic-001-story-012.md` — previous story patterns
- [Existing auth-server config] `packages/auth/src/index.ts` — phoneNumber() plugin already configured
- [Existing native auth client] `apps/native/lib/auth-client.ts` — phoneNumberClient() already present
- [Existing native phone sign-in] `apps/native/components/phone-sign-in.tsx` — reference implementation for web version
- [Existing web auth client] `apps/web/src/lib/auth-client.ts` — needs phoneNumberClient() added
- [Existing web login page] `apps/web/src/app/login/page.tsx` — SignIn/SignUp toggle, needs phone option
- [Ultracite coding standards] `CLAUDE.md`, `AGENTS.md` — type safety, no `as any`, no console.log, Biome linting

## Dev Agent Record

### Agent Model Used

Sisyphus (Claude Opus 4.7) via OpenCode

### Completion Notes

- Story 1.3 covers FR-3 (Phone-number auth OTP) fully — SMS sending, OTP verification, voice fallback, rate limiting, cross-platform
- 7 tasks covering: server SMS provider, rate limiting, web auth client, web phone component, web integration, phone linking, testing
- Native side is largely pre-built (phoneNumberClient(), PhoneSignIn component already exist). Verify, don't rebuild.
- Server sendOTP currently stubbed with console.log — replacing with real SMS provider is the core work.
- Voice call fallback and rate limiting improve reliability and abuse prevention.
- Dependencies: Story 1.2 (silent token refresh) completed — phone auth users also benefit from proactive refresh.
