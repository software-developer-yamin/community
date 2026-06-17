---
baseline_commit: b43f18e
---

# Story 1.4: Google OAuth Integration

Status: ready-for-dev

## Story

As a Learner,
I want to sign in with my Google account on both web and native,
so that I can onboard quickly without creating yet another email/password account.

## Acceptance Criteria

1. **Web Google Sign-In button** — Given the Learner visits the web login page, When they click "Sign In with Google", Then they are redirected to Google's OAuth consent screen, and upon approval, redirected back to the dashboard with an active session.
2. **Persistent Google session** — Given the Learner signed in with Google, When they return after 7 days, Then their session is still valid.
3. **Cross-platform parity** — Google sign-in works identically on both web and native (already implemented on native).

## Tasks / Subtasks

- [ ] Task 1: Create web Google Sign-In button component (AC: 1)
  - [ ] 1.1 Create `apps/web/src/components/google-sign-in.tsx` following native pattern
  - [ ] 1.2 Use `authClient.signIn.social({ provider: "google" })` API
  - [ ] 1.3 Handle loading state and error feedback with sonner toast
- [ ] Task 2: Integrate Google button into web login page (AC: 1)
  - [ ] 2.1 Add Google button to sign-in form
  - [ ] 2.2 Add Google button to sign-up form
  - [ ] 2.3 Verify OAuth callback URL configuration
- [ ] Task 3: Verify end-to-end flow (AC: 1, 2, 3)
  - [ ] 3.1 Test redirect to Google consent screen
  - [ ] 3.2 Test callback and session creation
  - [ ] 3.3 Test error handling (cancelled flow, network failure)
