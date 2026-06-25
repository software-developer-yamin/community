---
baseline_commit: HEAD
---

# Story 5.2: Support Tickets UI (Web + Native)

Status: completed

## Story

As a user,
I want to submit support tickets from within the app and track their resolution,
So that I can get help with billing, technical issues, or moderation concerns without leaving the platform.

## Acceptance Criteria

1. **Create ticket** — Given I am logged in, When I fill out the support form (subject, description, category), Then a new ticket is created and I see a confirmation.

2. **View my tickets** — Given I have submitted tickets, When I navigate to the support page, Then I see a list of all my tickets with status, category, and creation date.

3. **Ticket detail** — Given I tap/click a ticket, When the detail page opens, Then I see the full ticket info and message thread.

4. **Reply to ticket** — Given I am viewing a ticket, When I send a new message, Then it appears in the thread with my role as "user" and the message is persisted.

5. **Web navigation** — Given I am on the settings page, When I navigate to `/settings/support`, Then I see the support page with form and ticket list.

6. **Native navigation** — Given I am in the drawer menu, When I tap "Support", Then I see the support screen with form and ticket list.

## Tasks / Subtasks

- [x] Task 1: API — Already exists (createSupportTicket, getMyTickets, addTicketMessage, getTicketMessages)
  - Existing procedures: `createSupportTicket`, `getMyTickets`, `addTicketMessage`
  - Need: `getTicketMessages` procedure (currently only getMyTickets returns tickets without messages)

- [x] Task 2: API — Add `getTicketMessages` procedure in rebuild router

- [x] Task 3: Web — Create support page at `/settings/support/`
  - [x] 3.1 Create server component page with auth check
  - [x] 3.2 Create client-side CreateTicketForm component
  - [x] 3.3 Create client-side TicketList component

- [x] Task 4: Web — Create ticket detail page at `/settings/support/[id]/`
  - [x] 4.1 Create server component page
  - [x] 4.2 Create client-side TicketChat component

- [x] Task 5: Native — Create support screen in drawer
  - [x] 5.1 Create support.tsx with form and ticket list
  - [x] 5.2 Create ticket/[id].tsx detail screen
  - [x] 5.3 Update drawer layout to add support entry

## Technical Notes

- Web components follow the existing pattern: server component for page shell + auth, `"use client"` components for interactivity
- Web uses shadcn Card, Button, Input, Textarea, Select, Badge from `@community/ui`
- Native uses react-native-unistyles for theming (same pattern as subscription.tsx)
- oRPC client is shared via `@/utils/orpc` (web) / `@/utils/orpc` (native)
- The `getTicketMessages` procedure was added to fetch messages for a specific ticket
