---
stepsCompleted: []
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-community-recommendation-engine-2026-06-12/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/DESIGN.md
---

# community - Recommendation Engine — Epic Breakdown

## Overview

This document provides the epic and story breakdown for the AceFluency **Personalized Content Recommendation Engine**, decomposing the requirements from the recommendation engine PRD into implementable stories. This complements the existing epics document (`epics.md`) which covers the core voice practice product.

### Architecture

**Three-tier monorepo:**
- **Web (Next.js)** — Admin panel only. Content management, analytics, user management. No client-facing surfaces.
- **Mobile (Expo/React Native)** — Client app only. Recommendation feed, content consumption, preferences, interactions. No admin functionality.
- **Server (Hono)** — Shared backend API. Serves both mobile and web admin. All recommendation engine APIs are client-agnostic.

## Requirements Inventory

### Functional Requirements

| FR | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-1 | Create content item (admin) | ✅ Implemented | — |
| FR-2 | Browse and filter content | ✅ Implemented | — |
| FR-3 | Delete content item (admin) | ✅ Implemented | — |
| FR-4 | Update content item | ❌ Not implemented | Medium |
| FR-5 | Bulk content import | ❌ Not implemented | Medium |
| FR-6 | Compute content embedding on creation | ⚠️ Partially | **Blocker** |
| FR-7 | Recompute content embedding on update | ❌ Not implemented | Medium |
| FR-8 | Hybrid scoring algorithm | ✅ Implemented | — |
| FR-9 | Candidate filtering | ✅ Implemented | — |
| FR-10 | Score caching with 24h TTL | ✅ Implemented | — |
| FR-11 | Recommendation feed with recalculate | ✅ Implemented | — |
| FR-12 | Track user interaction | ✅ Implemented | — |
| FR-13 | View interaction history | ✅ Implemented | — |
| FR-14 | Interaction-weighted scoring | ❌ Not implemented | High for v2 |
| FR-15 | Get user preferences with defaults | ✅ Implemented | — |
| FR-16 | Update user preferences | ✅ Implemented | — |
| FR-17 | User preferences native UI | ❌ Not implemented | **Blocker** |
| FR-18 | Admin dashboard (stats, recent activity, popular content) | ✅ Implemented | — |
| FR-19 | Admin user list with CEFR + preferences | ✅ Implemented | — |
| FR-20 | Admin content deletion | ✅ Implemented | — |
| FR-21 | Admin analytics page | ⚠️ Partially | Medium |
| FR-22 | Seed demo data | ✅ Implemented | — |
| FR-23 | Native mobile recommendation feed (Expo) | ❌ Not implemented | **Blocker** |

### Non-Functional Requirements

NFR-1: Feed load time p95 ≤ 1.5s on 4G (native)  
NFR-2: Recalculation time p95 ≤ 5s for ≤200 candidates (native)  
NFR-3: Interaction response ≤ 300ms (native)  
NFR-4: Admin page load time p95 ≤ 2s on broadband (web admin)

### Security & Infrastructure Requirements

SIR-1: Secure seed endpoint for production (remove or gate to admin)  
SIR-2: Gate `createContent` to admin role only  
SIR-3: Replace hardcoded profile embeddings with real user data

### FR Coverage Map

| FR | Epic | Status |
|----|------|--------|
| FR-1 | Epic RE-1 | ✅ Implemented |
| FR-2 | Epic RE-1 | ✅ Implemented |
| FR-3 | Epic RE-1 | ✅ Implemented |
| FR-4 | Epic RE-1 | ❌ Not implemented |
| FR-5 | Epic RE-1 | ❌ Not implemented |
| FR-6 | Epic RE-2 | ⚠️ Partially |
| FR-7 | Epic RE-2 | ❌ Not implemented |
| FR-8 | Epic RE-3 | ✅ Implemented |
| FR-9 | Epic RE-3 | ✅ Implemented |
| FR-10 | Epic RE-3 | ✅ Implemented |
| FR-11 | Epic RE-3 | ✅ Implemented |
| FR-12 | Epic RE-4 | ✅ Implemented |
| FR-13 | Epic RE-4 | ✅ Implemented |
| FR-14 | Epic RE-4 | ❌ Not implemented |
| FR-15 | Epic RE-5 | ✅ Implemented |
| FR-16 | Epic RE-5 | ✅ Implemented |
| FR-17 | Epic RE-5 | ❌ Not implemented |
| FR-18 | Epic RE-6 | ✅ Implemented |
| FR-19 | Epic RE-6 | ✅ Implemented |
| FR-20 | Epic RE-6 | ✅ Implemented |
| FR-21 | Epic RE-6 | ⚠️ Partially |
| FR-22 | Epic RE-7 | ✅ Implemented |
| FR-23 | Epic RE-3 | ❌ Not implemented |
| SIR-1 | Epic RE-7 | ❌ Not implemented |
| SIR-2 | Epic RE-1 | ❌ Not implemented |
| SIR-3 | Epic RE-2 | ❌ Not implemented |

---

## Epic RE-1: Content Library Management

**Goal:** Admins and content curators can create, browse, update, and delete learning content items. The content library is the inventory that the recommendation engine scores and surfaces.

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, SIR-2

### Story RE-1.1: Update Content Item

As an Admin,  
I want to update an existing content item's metadata,  
So that I can correct mistakes or refresh content without losing all associated interactions and scores.

**Acceptance Criteria:**

**Given** I am an admin on the content management page  
**When** I select a content item and edit its title, description, type, CEFR level, tags, or metadata  
**Then** the item is updated in place  
**And** all existing interactions, embeddings, and recommendation scores are preserved

**Given** I update a content item's title or description  
**When** the save is confirmed  
**Then** the content embedding is flagged for recomputation  
**And** the old embedding remains active until the new one is computed

**Given** I am a non-admin user  
**When** I attempt to access the update endpoint  
**Then** I receive a 403 Forbidden response

**Given** I attempt to update a content item with invalid data (e.g., title > 200 chars)  
**When** the request is submitted  
**Then** the update is rejected with a validation error

### Story RE-1.2: Bulk Content Import

As an Admin,  
I want to import multiple content items from a CSV or JSON file,  
So that I can populate the library efficiently without creating items one by one.

**Acceptance Criteria:**

**Given** I am on the admin content management page  
**When** I upload a CSV file with columns: title, description, type, cefr_level, tags, source_url, thumbnail_url, duration  
**Then** each row is validated and imported as a content item  
**And** valid items are created with UUIDs and timestamps

**Given** my CSV contains 50 items with 3 invalid rows  
**When** the import is processed  
**Then** 47 valid items are created  
**And** the 3 invalid rows are reported with specific error messages

**Given** a bulk import is in progress  
**When** I navigate away from the page  
**Then** the import continues in the background  
**And** I can return to see progress and results

**Given** a content item in the import has the same title as an existing item  
**When** it is processed  
**Then** the system flags it as a potential duplicate  
**And** the admin can choose to skip or create

### Story RE-1.3: Secure Content Creation

As the System,  
I want to ensure only admin users can create content items,  
So that the content library quality is maintained and unauthorized content is prevented.

**Acceptance Criteria:**

**Given** I am an admin user  
**When** I call the `createContent` endpoint  
**Then** the item is created successfully

**Given** I am a non-admin authenticated user  
**When** I call the `createContent` endpoint  
**Then** I receive a 403 Forbidden response  
**And** the content is not created

**Given** I am an unauthenticated user  
**When** I call the `createContent` endpoint  
**Then** I receive a 401 Unauthorized response

**Given** the `createContent` endpoint is gated to admin  
**When** the admin deletes the content they just created  
**Then** the `adminDeleteContent` endpoint still works as expected

---

## Epic RE-2: Content Embeddings & Profile Intelligence

**Goal:** Every content item and every learner profile gets a real, semantic 384-dimensional vector embedding. These embeddings power the recommendation engine's similarity scoring and partner matching.

**FRs covered:** FR-6, FR-7, SIR-3

### Story RE-2.1: Compute Content Embedding on Creation

As the System,  
I want to compute a real semantic embedding for every new content item using the BGE-small-en-v1.5 model,  
So that the 40% weighted similarity component of the hybrid score is signal, not noise.

**Acceptance Criteria:**

**Given** an admin creates a content item with title, description, and tags  
**When** the creation is confirmed  
**Then** the system calls `POST ${EMBED_URL}/embed` with `title + " " + description + " " + tags.join(", ")`  
**And** the resulting 384-dimensional vector is stored in `content_embedding` with `modelVersion: "bge-small-en-v1.5-int8@1:f8.2"`

**Given** the embedding service is unavailable (returns 500 or timeout)  
**When** a content item is created  
**Then** the item is still created successfully  
**And** it is flagged as "embedding pending"  
**And** it is excluded from similarity scoring until the embedding is computed

**Given** a content item is flagged as "embedding pending"  
**When** the embedding service becomes available again  
**Then** a background retry computes the embedding  
**And** the item becomes eligible for similarity scoring

**Given** a content item has a computed embedding  
**When** the hybrid score is calculated for a user  
**Then** the cosine similarity between the user's profile embedding and the content embedding is computed correctly

**Given** the recommendation feed is displayed  
**When** real embeddings are available for all content  
**Then** the feed is enabled for user-facing access  
**And** a feature flag prevents user-facing feed access until real embeddings are confirmed

### Story RE-2.2: Recompute Content Embedding on Update

As the System,  
I want to recompute a content item's embedding when its title, description, or tags change,  
So that the semantic representation stays accurate and recommendation quality is maintained.

**Acceptance Criteria:**

**Given** an admin updates a content item's title or description  
**When** the update is saved  
**Then** the embedding is recomputed automatically  
**And** the old embedding is replaced by the new one

**Given** an admin updates only the thumbnail_url or source_url  
**When** the update is saved  
**Then** the embedding is NOT recomputed  
**And** the existing embedding remains active

**Given** an embedding recomputation is triggered  
**When** the embedding service is unavailable  
**Then** the update is still saved  
**And** the item is flagged as "embedding pending"  
**And** the old embedding continues to be used until the new one is available

### Story RE-2.3: Real Profile Embeddings from User Data

As the System,  
I want to compute each learner's profile embedding from their actual user data (CEFR, interests, goals, native language, age, learning style),  
So that the recommendation engine and partner matching use real personalization signals instead of hardcoded defaults.

**Acceptance Criteria:**

**Given** a user has a completed CEFR placement, set interests, and set native language  
**When** the profile embedding is computed  
**Then** the embedding uses the user's actual data, not hardcoded values

**Given** a user updates their interests or goals in preferences  
**When** the update is saved  
**Then** the profile embedding is recomputed automatically  
**And** the recommendation cache is invalidated for that user

**Given** a user's CEFR placement improves (e.g., A2 → B1)  
**When** the new placement is recorded  
**Then** the profile embedding is recomputed  
**And** the recommendation cache is invalidated immediately

**Given** a user has no interests or goals set  
**When** the profile embedding is computed  
**Then** it uses the CEFR, native language, and age only  
**And** the embedding is still valid for similarity scoring

**Given** a user signs up for the first time  
**When** their profile embedding is first computed  
**Then** it uses available data from onboarding (CEFR, native language)  
**And** interests/goals are empty arrays (not hardcoded "Bangla/food/travel")

---

## Epic RE-3: Personalized Recommendation Feed

**Goal:** Learners discover and consume English learning content matched to their level, interests, and interaction history. The feed is available on both web and native mobile.

**FRs covered:** FR-8, FR-9, FR-10, FR-11, FR-23

### Story RE-3.1: Native Mobile Recommendation Feed (Expo)

As a Learner,  
I want to view my personalized recommendation feed in the native mobile app,  
So that I can discover content during my 5–10 minute idle windows between practice calls.

**Acceptance Criteria:**

**Given** I am authenticated on the native app  
**When** I navigate to the "Learn" or "Content" tab  
**Then** I see my personalized recommendation feed with content cards  
**And** each card shows: title, description snippet, CEFR level badge, content type badge, tags, recommendation score, and recommendation reason

**Given** I am viewing the recommendation feed  
**When** I tap the "Refresh" or "Recalculate" button  
**Then** the feed is refreshed with newly computed scores  
**And** a loading skeleton is shown during the fetch

**Given** I am on the recommendation feed  
**When** I pull down to refresh  
**Then** the feed triggers `getRecommendations({ recalculate: true })`  
**And** the top-N items are updated

**Given** I have dismissed or completed all available content at my level  
**When** the feed is empty  
**Then** I see an empty state: "You've explored all content at your level!"  
**And** I can tap to expand CEFR range (±1 → ±2) or show all content types

**Given** I am a new user with no interaction history  
**When** I view the feed  
**Then** I see content matched to my CEFR level and onboarding interests  
**And** the feed is not empty

**Given** I am a B1 learner with embedding, interests ["travel", "food"], preferred types ["video", "dialogue"]  
**When** the feed loads  
**Then** the top items are B1 video/dialogue content tagged with "travel" or "food"  
**And** the recommendation scores are visible on each card

**Given** the feed is loading on a 4G connection  
**When** the request is made  
**Then** the first paint to interactive cards completes in ≤ 1.5s (p95)

**Given** I tap an interaction button (like, bookmark, share, dismiss)  
**When** the action is submitted  
**Then** the button shows visual feedback within ≤ 300ms

### Story RE-3.2: Recommendation Feed Empty State Design

As a Learner,  
When I have exhausted all content at my level,  
I want clear options to find more content,  
So that I don't feel stuck or abandoned.

**Acceptance Criteria:**

**Given** the candidate pool is empty after filtering  
**When** the feed renders  
**Then** I see: "You've explored all the content at your level! Try a different CEFR level or content type."

**Given** the empty state is displayed  
**When** I tap "Expand level range"  
**Then** the CEFR filter widens from ±1 to ±2 for this session  
**And** the feed reloads with more content

**Given** the empty state is displayed  
**When** I tap "Show all types"  
**Then** the content type preference filter is ignored for this session  
**And** the feed reloads with all content types

**Given** the empty state is displayed  
**When** I tap "Browse full library"  
**Then** I navigate to the content library list (unfiltered)

---

## Epic RE-4: User Interactions & Feedback Loop

**Goal:** Learners can interact with content (like, bookmark, share, dismiss, view, complete) and these interactions inform future recommendations through a feedback loop.

**FRs covered:** FR-12, FR-13, FR-14

### Story RE-4.1: Interaction-Weighted Scoring (v2)

As the System,  
I want to adjust future recommendation scores based on the learner's interaction patterns,  
So that content similar to liked items is boosted and content similar to dismissed items is suppressed.

**Acceptance Criteria:**

**Given** a learner likes a content item about "travel"  
**When** future recommendations are computed  
**Then** content tagged with "travel" or semantically similar receives a +0.3 score boost

**Given** a learner dismisses a content item about "business"  
**When** future recommendations are computed  
**Then** content tagged with "business" or semantically similar receives a -0.2 score penalty

**Given** a learner completes a content item  
**When** future recommendations are computed  
**Then** similar content receives a +0.1 score boost  
**And** this is weaker than the like boost because completion does not imply enjoyment

**Given** a learner bookmarks a content item  
**When** future recommendations are computed  
**Then** similar content receives a +0.2 score boost

**Given** a learner has multiple liked items about "food" and multiple dismissed items about "politics"  
**When** the hybrid score is computed for a candidate pool  
**Then** the "food" boost and "politics" suppression are both applied  
**And** the total score is still capped at 1.0

**Given** the feedback loop is active  
**When** a learner's preferences change  
**Then** the feedback loop weights are recalculated from the full interaction history  
**And** the recommendation cache is invalidated

**Given** a learner has no interaction history  
**When** recommendations are computed  
**Then** the feedback loop component is skipped  
**And** the base hybrid score (embedding + CEFR + tags + type) is used

---

## Epic RE-5: User Preferences Management

**Goal:** Learners can view and edit their interests, goals, preferred content types, CEFR override, daily learning goal, and notification settings. These preferences directly influence recommendation quality.

**FRs covered:** FR-15, FR-16, FR-17

### Story RE-5.1: User Preferences Native UI

As a Learner,  
I want to view and edit my preferences in the native app settings,  
So that I can tell the recommendation engine what I like and how I learn.

**Acceptance Criteria:**

**Given** I am authenticated on the native app  
**When** I navigate to Settings → Preferences  
**Then** I see a form with: interests (tag input), goals (tag input), preferred content types (multi-select), preferred CEFR level (dropdown), daily goal (slider 1-120 min), notification toggles

**Given** I am viewing my preferences  
**When** I add interests (e.g., "travel", "food", "daily-life")  
**Then** each interest is added as a tag pill  
**And** I can remove interests by tapping the X on each pill

**Given** I select preferred content types (e.g., "video", "dialogue")  
**When** I tap Save  
**Then** the `updatePreferences` endpoint is called with the new values  
**And** the recommendation cache is invalidated

**Given** I change my daily goal from 15 to 30 minutes  
**When** I tap Save  
**Then** the preference is updated  
**And** the daily reminder notification time is adjusted accordingly

**Given** I have no preferences set yet  
**When** I open the preferences screen  
**Then** I see sensible defaults: interests [], goals [], preferredTypes [], preferredCefr null, dailyGoal 15, notifications all enabled  
**And** the form is editable

**Given** I save my preferences  
**When** the save is successful  
**Then** I see a success toast: "Preferences saved. Your recommendations will update."  
**And** the feed is refreshed on next visit

**Given** I try to add more than 20 interests  
**When** I attempt to add the 21st interest  
**Then** the input is rejected with: "You can add up to 20 interests"

**Given** I try to select more than 4 preferred content types  
**When** I attempt to select the 5th type  
**Then** the checkbox is disabled  
**And** I see a message: "Select up to 4 content types"

---

## Epic RE-6: Admin Content Management & Analytics

**Goal:** Administrators have a complete, role-gated content management panel with analytics on content engagement, CEFR distribution, and user behavior.

**FRs covered:** FR-18, FR-19, FR-20, FR-21

### Story RE-6.1: Admin Content Analytics

As an Admin,  
I want to view engagement analytics for the content library,  
So that I can understand what content is popular, what is ignored, and where the library has gaps.

**Acceptance Criteria:**

**Given** I am an admin on the analytics page  
**When** I view the dashboard  
**Then** I see: total content items, total interactions, average likes per item, CEFR distribution chart (bar chart of items per level)

**Given** I view the CEFR distribution  
**When** I see the chart  
**Then** I can identify which levels have insufficient content (e.g., only 2 C2 items)

**Given** I view top content by engagement  
**When** I sort by "likes" or "completions"  
**Then** I see the top 20 items with counts and trend indicators

**Given** I view interaction trends over time  
**When** I select a date range (7d, 30d, 90d)  
**Then** I see a line chart of: views, likes, completions, dismisses per day  
**And** I can compare week-over-week

**Given** I view user engagement metrics  
**When** I open the "Users" tab in analytics  
**Then** I see: active users (viewed feed in last 7d), preference completion rate (% with ≥3 interests), average session duration

**Given** the analytics page loads  
**When** the data is fetched  
**Then** it completes in ≤ 3s  
**And** skeleton states are shown during loading

---

## Epic RE-7: Seed Data & Security Hardening

**Goal:** The development seed endpoint is secured for production, and the system is protected against unauthorized data manipulation.

**FRs covered:** FR-22, SIR-1, SIR-2

### Story RE-7.1: Secure Seed Endpoint for Production

As the System,  
I want the seed endpoint to be either removed or gated to admin-only in production,  
So that unauthorized users cannot overwrite or pollute production data.

**Acceptance Criteria:**

**Given** the application is running in a production environment (`NODE_ENV === "production"`)  
**When** an unauthenticated user calls the `seed` endpoint  
**Then** the endpoint returns 404 or 403  
**And** no data is modified

**Given** the application is running in production  
**When** an admin user calls the `seed` endpoint  
**Then** the endpoint returns 404 (seed is dev-only)  
**And** the admin must use a separate migration or data import tool

**Given** the application is running in development  
**When** any user calls the `seed` endpoint  
**Then** it works as before (populates demo data)

**Given** the seed endpoint is disabled in production  
**When** the app starts  
**Then** a startup check confirms the seed route is not mounted  
**And** a warning is logged if the route is still accessible

**Given** the seed endpoint is removed from production  
**When** an admin needs to create demo data in staging  
**Then** they use a separate admin-only bulk import endpoint (Story RE-1.2)

---

## Summary

| Epic | Status | Blockers? |
|------|--------|-----------|
| RE-1: Content Library Management | Partially implemented | Needs FR-4, FR-5, SIR-2 |
| RE-2: Content Embeddings & Profile Intelligence | Partially implemented | **FR-6 is blocker** |
| RE-3: Personalized Recommendation Feed | Partially implemented | **FR-23 is blocker** |
| RE-4: User Interactions & Feedback Loop | Partially implemented | FR-14 is v2 |
| RE-5: User Preferences Management | Partially implemented | **FR-17 is blocker** |
| RE-6: Admin Content Management & Analytics | Partially implemented | FR-21 needs time-series |
| RE-7: Seed Data & Security Hardening | Partially implemented | SIR-1 is blocker |

**Total Stories:** 10 new stories for gaps  
**Blockers requiring immediate action:** FR-6, FR-17, FR-23, SIR-1, SIR-3

---

*Generated from PRD: `prd-community-recommendation-engine-2026-06-12/prd.md`*  
*Complements existing epics: `epics.md` (core voice practice product)*
