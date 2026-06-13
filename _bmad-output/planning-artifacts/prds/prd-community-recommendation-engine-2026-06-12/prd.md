---
title: "AceFluency — Personalized Content Recommendation Engine"
status: final
created: 2026-06-12
updated: 2026-06-13 (validation fixes applied)
project: community
parent_prd: prd-community-2026-06-09
---

# PRD: AceFluency — Personalized Content Recommendation Engine

## 0. Document Purpose

This PRD specifies the content recommendation engine for AceFluency — the system that surfaces learning content (videos, articles, exercises, dialogues) to each learner based on their CEFR level, interests, interaction history, and semantic profile. It is a **companion** to the parent PRD (`prd-community-2026-06-09`, status: final), which covers the core peer-to-peer voice practice product. The recommendation engine addresses a gap the parent PRD intentionally deferred: structured, personalized content consumption *between* live practice sessions.

**Audience:** PM, engineering lead, design lead, and downstream workflow owners (`bmad-ux`, `bmad-create-architecture`, `bmad-create-epics-and-stories`).

**Source of truth:** This PRD is reverse-engineered from the already-built implementation in the codebase, then layered with product specification that the code alone does not capture (user journeys, success metrics, phasing, gaps). The implementation is mature — schema, API, web UI, and admin tools are all functional — but shipped without a product spec. This document codifies *what was built*, *why it exists*, *what's missing*, and *what "done" looks like*.

**Codebase references (read before this PRD):**
- Schema: `packages/db/src/schema/recommendations.ts` — 5 tables, 4 relation sets
- API: `packages/api/src/routers/recommendations.ts` — 860 lines, 12 endpoints
- AI models: `packages/api/src/routers/models.ts` — CEFR grading, pronunciation scoring, embedding computation, partner matching
- Web UI: `apps/web/src/app/recommendations/` — auth-gated feed page, card grid, interaction buttons
- Admin: `apps/web/src/app/admin/` — dashboard (stats), content management, user management, analytics
- AI chat: `apps/web/src/app/ai/page.tsx` — conversational AI assistant (separate feature, not part of rec engine)

**Structure:** §1 Vision, §2 Target User, §3 Glossary, §4 Features (with globally numbered FRs), §5 Non-Goals, §6 MVP Scope, §7 Success Metrics, §8 Technical Architecture (code-validated), §9 Open Questions, §10 Assumptions Index.

---

## 1. Vision

AceFluency's core product is peer-to-peer voice practice — the "gym for spoken English." But a gym without a training program produces inconsistent results. The recommendation engine is the **training program**: it surfaces the right content at the right difficulty at the right time, so learners have something meaningful to practice *before* their next call, can review *after* a call, and can build vocabulary and comprehension *between* calls.

The engine does not replace the voice practice — it feeds it. A learner who watched a B1-level dialogue about "ordering food at a restaurant" is better prepared for a B1 partner conversation about daily life. The recommendation engine closes the loop between structured content consumption and unstructured peer practice.

**Differentiation from generic content feeds:** The engine is CEFR-aware. It doesn't just show "popular" or "new" content — it scores every piece of content against the learner's assessed language level, semantic profile (384-dim BGE embedding), stated interests, and interaction history. A B1 learner never sees C2 content unless they ask for it. An A1 learner who likes "food" and "travel" topics sees those first, at their level.

**Relationship to the parent PRD:** The parent PRD's §4.3 (Matchmaking & Filters) uses the same CEFR level and embedding infrastructure for partner matching (`matchPartners` in `models.ts`). The recommendation engine reuses these signals for content matching — the same user profile that finds the right conversation partner also finds the right learning content. This is intentional: the recommendation engine and the matchmaking service share the profile embedding pipeline, CEFR placement history, and the BGE-small-en embedding model.

---

## 2. Target User

### 2.1 Primary Persona: The Between-Sessions Learner

**Rina** (Bengali, F, B1, paid premium) practices English on AceFluency 4× per week in 15-minute voice calls. Between calls, she has 5–10 minute windows — commuting, waiting, before bed — where she wants to *do something useful for her English* but doesn't have the energy or privacy for a live call. She opens the app and wants to see content that:

1. **Matches her level** — not too easy (boring), not too hard (discouraging).
2. **Relates to her interests** — she likes travel and food topics; she doesn't care about business negotiations.
3. **Builds on what she's already done** — she doesn't want to see the same "basic greetings" video she completed last week.
4. **Is the right format** — she prefers short dialogues and videos over long articles.

### 2.2 Secondary Persona: The New Learner Without a Call History

**Arif** (Bengali, M, A2, free tier) just signed up. He hasn't had a call yet. He has no interaction history, no profile embedding, and a CEFR level from his placement test. The recommendation engine must still give him something useful — not an empty screen, not a random dump of all content.

### 2.3 Tertiary Persona: The Admin / Content Curator

**Yamin** (admin) manages the content library. He needs to:
- Add new content items (individually and in bulk via seed).
- See which content is popular, which is ignored.
- Understand the CEFR distribution of the content library (is there enough B1 content?).
- Monitor user engagement (likes, bookmarks, completions, dismissals).
- Manage users and their CEFR/preference profiles.

### 2.4 Jobs To Be Done

- **Functional (Learner):** Find and consume English learning content matched to my level and interests, in 5–10 minute sessions.
- **Emotional (Learner):** Feel that the app "knows me" — it's not a generic content dump, it's curated for *my* journey.
- **Functional (Admin):** Manage, monitor, and grow a content library that serves learners across all CEFR levels.

---

## 3. Glossary

- **Content Item** — A piece of learning content: video, article, exercise, or dialogue. Has a CEFR level, tags, optional duration, and optional source/thumbnail URLs. Schema: `content_item` table.
- **Content Embedding** — A cached 384-dimensional vector representation of a content item, produced by the BGE-small-en-v1.5 model. Used for semantic similarity scoring. Schema: `content_embedding` table.
- **User Interaction** — A recorded action a learner takes on a content item: view, like, bookmark, complete, share, or dismiss. Schema: `user_interaction` table.
- **User Preference** — A learner's explicitly stated interests, goals, preferred content types, preferred CEFR override, daily goal (minutes), and notification settings. Schema: `user_preference` table.
- **Recommendation Score** — A pre-computed score (0.0–1.0) for a user-content pair, with a score type (content, collaborative, hybrid, trending), a human-readable reason, and an expiry timestamp. Schema: `recommendation_score` table.
- **Hybrid Score** — The primary scoring algorithm. Combines: (1) embedding cosine similarity × 0.4, (2) CEFR level closeness × 0.3, (3) tag overlap with user interests × 0.2, (4) content type preference × 0.1. Capped at 1.0.
- **CEFR ±1 Filter** — The candidate pool is restricted to content within one CEFR level of the learner's assessed level (e.g., a B1 learner sees A2, B1, and B2 content).
- **Profile Embedding** — A 384-dim vector representing the learner's profile (CEFR, interests, goals, native language, age, learning style), computed by the BGE-small-en-v1.5 model. Shared with the partner matching system. Schema: `user_profile_embedding` table.
- **Admin Procedure** — An oRPC procedure gated by `role === "admin"`. Used for content management and analytics endpoints.

---

## 4. Features

### 4.1 Content Library Management

**Description:** Admins and (in the future) content curators can create, browse, and delete learning content items. Each item has structured metadata: title, description, type (video/article/exercise/dialogue), CEFR level, tags, optional source URL, optional thumbnail, and optional duration. The content library is the inventory that the recommendation engine scores and surfaces.

**Status:** ✅ Implemented. `createContent`, `listContent`, `getContent`, `adminDeleteContent` endpoints are functional. Web admin UI at `/admin/content` exists.

#### FR-1: Create content item

[Admin] can create [a content item] [with title, description, type, CEFR level, tags, and optional source/thumbnail/duration/metadata].

**Consequences (testable):**
- `createContent` endpoint validates: title (1–200 chars), description (1–2000 chars), type enum (`video | article | exercise | dialogue`), CEFR level enum (`A1–C2`), tags (array of strings, max 10, each 1–50 chars), optional sourceUrl (valid URL), optional thumbnailUrl (valid URL), optional duration (integer ≥1, seconds), optional metadata (JSON object).
- Created item gets a UUID primary key and `createdAt`/`updatedAt` timestamps.
- Item is immediately available in `listContent` and eligible for recommendation scoring.

#### FR-2: Browse and filter content

[Admin or Learner] can browse [the content library] [filtered by type, CEFR level, and/or tag] [with pagination].

**Consequences (testable):**
- `listContent` endpoint accepts optional `type`, `cefr`, `tag` filters plus `limit` (1–50, default 20) and `offset` (≥0, default 0).
- Tag filter uses PostgreSQL array containment: `tag = ANY(tags)`.
- Results are ordered by `createdAt DESC` (newest first).
- Endpoint is public (no auth required) — content browsing is available to unauthenticated visitors.

#### FR-3: Delete content item (admin)

[Admin] can delete [a content item] [and all associated embeddings, interactions, and recommendation scores are cascade-deleted].

**Consequences (testable):**
- `adminDeleteContent` endpoint requires admin role.
- Cascade delete is enforced at the database level via `onDelete: "cascade"` on `contentEmbedding.contentId`, `userInteraction.contentId`, and `recommendationScore.contentId` foreign keys.

**Gap — FR-4: Update content item (NOT YET IMPLEMENTED)**

[Admin] can update [an existing content item's] [title, description, type, CEFR level, tags, and metadata] [without creating a new item].

**Status:** ❌ Not implemented. The codebase has `createContent` and `adminDeleteContent` but no `updateContent` endpoint. This forces admins to delete and re-create items to correct mistakes, losing all associated interactions and scores.

**Priority:** Medium. Required before the content library grows beyond seed data.

**Gap — FR-5: Bulk content import (NOT YET IMPLEMENTED)**

[Admin] can import [multiple content items] [from a CSV or JSON file] [in a single operation].

**Status:** ❌ Not implemented. The codebase has a `seed` endpoint that inserts 12 demo items, but no general-purpose bulk import. For a growing content library, item-by-item creation via the UI is not scalable.

**Priority:** Medium. Required when the content library exceeds ~50 items.

### 4.2 Content Embeddings

**Description:** Each content item gets a 384-dimensional vector embedding that captures its semantic meaning. These embeddings are used by the hybrid scoring algorithm to compute cosine similarity against the learner's profile embedding. The embedding model is BGE-small-en-v1.5 (int8 quantized), served via a local HTTP endpoint.

**Status:** ✅ Schema and seed pipeline implemented. ⚠️ Production embedding computation (via the `/embed` service) is only wired for *user* profile embeddings (`recomputeEmbedding` in `models.ts`), not for content embeddings. The seed endpoint generates random vectors for content embeddings — placeholders, not real semantic vectors.

#### FR-6: Compute content embedding on creation

[System] computes [a 384-dim embedding] [for each new content item] [using the BGE-small-en-v1.5 model] [and stores it in `content_embedding`].

**Status:** ⚠️ Partially implemented. Schema exists (`content_embedding` table with `embedding real[] NOT NULL`, `modelVersion text`, `updatedAt timestamp`). Seed data uses random vectors. Production pipeline to call the embedding service on content creation/update is **not wired**.

**Consequences (testable):**
- On `createContent`, the system calls `POST ${EMBED_URL}/embed` with the content's `title + " " + description + " " + tags.join(", ")` to produce a real embedding.
- The embedding is stored in `content_embedding` with `modelVersion: "bge-small-en-v1.5-int8@1:f8.2"`.
- If the embedding service is unavailable, the content item is still created but flagged as "embedding pending" — it will be excluded from similarity scoring until the embedding is computed.

**Priority:** **Blocker**. Without real embeddings, the 40%-weighted cosine similarity component of hybrid scoring is noise, not signal. No recommendation feed should be user-facing until FR-6 is resolved. Add a feature flag to disable the feed entirely until real embeddings are computed.

#### FR-7: Recompute content embedding on update

[System] recomputes [the embedding] [when a content item's title, description, or tags change].

**Status:** ❌ Not implemented (depends on FR-4: update content item).

**Priority:** Medium. Blocked by FR-4.

### 4.3 Personalized Recommendations (Hybrid Scoring)

**Description:** The recommendation engine scores content items for each learner using a four-signal hybrid algorithm, then surfaces the top-N items in a personalized feed. This is the core value proposition of the recommendation system.

**Status:** ✅ Fully implemented. `computeHybridScores()` and `getRecommendations` endpoint are functional. Web UI feed at `/recommendations` is live.

#### FR-8: Hybrid scoring algorithm

[System] scores [each candidate content item] [for a given learner] [using four weighted signals]:

1. **Embedding cosine similarity (40%):** Cosine similarity between the learner's profile embedding and the content's embedding. Captures semantic affinity — "this content is about topics this learner cares about."
2. **CEFR level closeness (30%):** `1 - (|content_cefr - user_cefr| / 3)`. Same level = 1.0, ±1 level = 0.66, ±2 levels = 0.33. Ensures difficulty-appropriate content.
3. **Tag overlap with interests (20%):** `min(overlapping_tags / 3, 1)`. Rewards content whose tags match the learner's stated interests. Capped at 1.0 for 3+ matching tags.
4. **Content type preference (10%):** Binary — 0.1 if the content type matches the learner's preferred types, 0 otherwise.

**Total score:** Sum of weighted signals, capped at 1.0.

**Consequences (testable):**
- A B1 learner with embedding, interests `["travel", "food"]`, and preferred types `["video", "dialogue"]` scores highest on B1 video/dialogue content tagged with "travel" or "food" that is semantically similar to their profile.
- A learner with no embedding still gets CEFR-based + tag-based + type-based scoring (60% of the total weight).
- A learner with no preferences still gets embedding-based + CEFR-based scoring (70% of the total weight).
- Scores are deterministic for the same inputs — no randomness in the algorithm.

#### FR-9: Candidate filtering

[System] restricts [the candidate pool] [to content within CEFR ±1 of the learner's level] [and optionally by preferred content types] [excluding content the learner has already interacted with].

**Consequences (testable):**
- A B1 learner's candidate pool includes A2, B1, B2 content only.
- If the learner has preferred types set, only those types are included.
- Content the learner has `dismiss`ed or `complete`d is excluded from candidates permanently.
- Content the learner has `view`ed, `like`d, `bookmark`ed, or `share`d may reappear after a 7-day decay period (with a -0.1 score penalty per reappearance).
- Candidate pool is capped at 200 items before scoring (performance guard).

#### FR-10: Score caching with TTL

[System] caches [recommendation scores] [per user-content-scoreType triple] [with a 24-hour TTL].

**Consequences (testable):**
- Scores are stored in `recommendation_score` with `expiresAt = now + 24h`.
- `getRecommendations` with `recalculate: false` reads cached scores if available.
- `getRecommendations` with `recalculate: true` recomputes and upserts scores.
- If no cached scores exist, the system auto-recomputes on demand (fallback path).

#### FR-11: Recommendation feed with recalculate

[Learner] can view [their personalized recommendation feed] [and trigger a recalculation] [to get fresh recommendations].

**Consequences (testable):**
- `/recommendations` web page requires authentication (redirects to `/login` if not authenticated).
- Feed displays content items as cards in a 3-column responsive grid.
- Each card shows: title, description snippet, CEFR level badge, content type badge, tags, recommendation score, and recommendation reason.
- "Refresh" / "Recalculate" button triggers `getRecommendations({ recalculate: true })`.
- Skeleton loading states display during fetch.
- Default limit: 10 items.

**Feature-specific NFRs:**
- Feed load time (first paint to interactive cards) p95 ≤ 2s on a 4G connection.
- Recalculation time (button press to updated feed) p95 ≤ 5s for a user with ≤200 candidate items.

### 4.4 User Interactions

**Description:** Learners can interact with recommended content via like, bookmark, share, dismiss, view, and complete actions. These interactions serve two purposes: (1) immediate UX feedback (liked items can be revisited), and (2) recommendation signal (interactions inform future scoring by excluding seen content and, in future versions, by adjusting weights).

**Status:** ✅ Implemented. `trackInteraction` and `getInteractions` endpoints are functional. Web UI interaction buttons (like, bookmark, share, dismiss) are present on content cards.

#### FR-12: Track user interaction

[Learner] can [like, bookmark, share, dismiss, view, or complete] [a content item] [and the interaction is recorded].

**Consequences (testable):**
- `trackInteraction` endpoint validates: `contentId` (UUID), `action` (enum: `view | like | bookmark | complete | share | dismiss`), optional `value` (integer, e.g., percent watched), optional `metadata` (JSON).
- Interactions are upserted on `(userId, contentId, action)` — a user can only have one interaction of each type per content item. Re-liking updates the timestamp.
- Interaction immediately affects future recommendation scoring: interacted content is excluded from the candidate pool on next recalculation.

#### FR-13: View interaction history

[Learner] can view [their interaction history] [filtered by action type] [with pagination].

**Consequences (testable):**
- `getInteractions` endpoint returns the learner's interactions, optionally filtered by `action`, limited to `limit` (1–100, default 50), ordered by `createdAt DESC`.
- Only the authenticated user's own interactions are returned.

**Gap — FR-14: Interaction-weighted scoring (NOT YET IMPLEMENTED)**

[System] adjusts [future recommendation scores] [based on the learner's interaction patterns] — e.g., content similar to liked items scores higher; content similar to dismissed items scores lower.

**Status:** ❌ Not implemented. Currently, interactions only affect scoring by *excluding* seen content. The scoring algorithm does not use interaction history as a positive or negative signal. This is the highest-impact gap in the recommendation engine.

**Priority:** High for v2. Requires a feedback loop: like → boost similar content; dismiss → suppress similar content.

### 4.5 User Preferences

**Description:** Learners can explicitly set their interests, goals, preferred content types, preferred CEFR level (override), daily learning goal, and notification settings. These preferences directly influence recommendation scoring.

**Status:** ✅ Implemented. `getPreferences` and `updatePreferences` endpoints are functional.

#### FR-15: Get user preferences with defaults

[System] returns [the learner's preferences] [with sensible defaults if no preferences have been set].

**Consequences (testable):**
- Default preferences (for a user with no stored preferences): interests `[]`, goals `[]`, preferredTypes `[]`, preferredCefr `null`, dailyGoal `15` (minutes), notifications `{ dailyReminder: true, newContent: true, progressUpdates: true }`.
- Preferences are returned with the user's ID regardless of whether they've been explicitly set.

#### FR-16: Update user preferences

[Learner] can update [any combination of]: interests (up to 20 tags), goals (up to 10), preferred content types (up to 4 from: video/article/exercise/dialogue), preferred CEFR level override, daily goal (1–120 minutes), notification settings.

**Consequences (testable):**
- Partial updates are supported — only the fields provided are changed.
- If no preference record exists, a new one is created with the provided values + defaults for unspecified fields.
- Updated preferences take effect on the next recommendation recalculation (not retroactively applied to cached scores).

**Gap — FR-17: Preferences UI on web (NOT YET IMPLEMENTED)**

[Learner] can view and edit [their preferences] [in a web settings page].

**Status:** ❌ No web UI for preference management. The API endpoints exist but there is no `/settings/preferences` or similar page. Learners cannot currently set their interests/goals/types through the web app — only via direct API calls or the seed endpoint.

**Priority:** High. Without a preferences UI, the 30% of the scoring algorithm that depends on user interests and type preferences (FR-8 signals 3 and 4) receives empty inputs for all real users, degrading recommendation quality to CEFR + embedding similarity only.

### 4.6 Admin Dashboard & Analytics

**Description:** Administrators have a dedicated, role-gated admin panel with a dashboard, content management, user management, and analytics views. The dashboard provides at-a-glance metrics; the sub-pages provide operational tools.

**Status:** ✅ Implemented. Admin layout with role gate, dashboard with stat cards, recent activity, and popular content. Sub-pages for `/admin/content`, `/admin/users`, `/admin/analytics`.

#### FR-18: Admin dashboard

[Admin] can view [a dashboard] [showing four key metrics: total users, content items, interactions, recommendation scores] [plus recent activity and most-liked content].

**Consequences (testable):**
- Dashboard is gated by `session.user.role === "admin"` — non-admin users are redirected to `/dashboard`.
- Four stat cards: Total Users, Content Items, Interactions, Rec. Scores — each with count, icon, and color.
- "Recent Activity" panel: last 10 interactions with action emoji, action name, date, and truncated user ID.
- "Most Liked Content" panel: top 10 content items by like count, showing title, CEFR level, type, and like count.
- Skeleton loading states during data fetch.

#### FR-19: Admin user list with enrichments

[Admin] can view [a paginated list of users] [enriched with each user's latest CEFR placement and preferences].

**Consequences (testable):**
- `adminListUsers` endpoint returns users with `id, name, email, role, createdAt` plus `cefr` (latest placement) and `preferences` (if set).
- Pagination: `limit` (1–100, default 50), `offset` (≥0, default 0).
- Ordered by `createdAt DESC`.

#### FR-20: Admin content deletion

[Admin] can delete [a content item] [from the admin panel].

**Consequences (testable):**
- Cascade delete removes the content's embedding, all user interactions with it, and all recommendation scores referencing it.
- The content is immediately removed from all recommendation feeds.

**Gap — FR-21: Admin analytics page (PARTIALLY IMPLEMENTED)**

[Admin] can view [engagement analytics]: interaction counts over time, CEFR distribution of content, top content by engagement type, active users over time.

**Status:** ⚠️ The `/admin/analytics` route exists as a directory with a `page.tsx`, but the analytics page content has not been reviewed in detail in this PRD cycle. The `adminStats` endpoint provides basic counts and top-content data but does not provide time-series data. A full analytics view would require additional API endpoints for time-bucketed queries.

**Priority:** Medium. Operational necessity grows with user count.

### 4.8 Native Mobile Recommendation Feed

**Description:** The Expo native app is the primary client surface (parent PRD §5: "90%+ of active users are on mobile"). Learners need to discover and consume recommended content from their phone — the same personalized feed available on web (`/recommendations`) must be accessible in the native app.

**Status:** ❌ Not implemented. The native app (`apps/native/`) does not have a recommendations screen. The API layer (FR-8..FR-11) is fully functional and client-agnostic — the mobile feed requires only a new screen, not new backend work.

#### FR-23: Native mobile recommendation feed

[Learner] can view [their personalized recommendation feed] [in the Expo native app] [with the same content cards, interaction buttons (like, bookmark, share, dismiss), and recalculate action as the web feed].

**Consequences (testable):**
- A new screen in the native app calls `recommendations.getRecommendations` and renders content cards.
- Each card shows: title, description snippet, CEFR level badge, content type badge, tags, recommendation score, and recommendation reason.
- Interaction buttons call `recommendations.trackInteraction` for like, bookmark, share, and dismiss actions.
- Pull-to-refresh triggers `getRecommendations({ recalculate: true })`.
- Empty state for new users with no recommendations displays an onboarding prompt.
- The screen is gated behind authentication (same as web feed).

**Priority:** High. Without this, the recommendation engine serves only the admin-facing web surface, not the 90%+ of users on mobile.

**Feature-specific NFRs:**
- Feed load time (first paint to interactive cards) p95 ≤ 1.5s on a 4G connection.
- Interaction response (button tap to visual feedback) ≤ 300ms.

---

### 4.7 Seed & Demo Data

**Description:** A public `seed` endpoint populates the database with demo data for development and testing: a demo user with CEFR placement, profile embedding, preferences, 12 content items across all CEFR levels, content embeddings (random vectors), and sample interactions.

**Status:** ✅ Implemented. Used for development bootstrapping.

#### FR-22: Seed demo data

[Developer] can call [the `seed` endpoint] [to populate the database with a demo user, 12 content items (2 per CEFR level), embeddings, preferences, and sample interactions].

**Consequences (testable):**
- Demo user: `demo@example.com`, name "Demo Learner", B1 placement (score 72, source "mcq"), profile embedding (384-dim random), preferences (interests: travel/food/daily-life, goals: improve-conversation/expand-vocabulary, types: video/dialogue, dailyGoal: 20).
- 12 content items: 2 per CEFR level (A1 through C2), mix of types (video, dialogue, exercise, article), with realistic titles/descriptions/tags.
- Content embeddings: random 384-dim vectors (placeholder; see FR-6 gap).
- Sample interactions: 2 liked items.
- Idempotent: `onConflictDoNothing` / `onConflictDoUpdate` prevents duplicate inserts.
- Endpoint is public — **security concern for production** (see Open Question 1).

---

## 5. Non-Goals (Explicit)

- **Collaborative filtering.** The `scoreType` enum includes `"collaborative"` but no collaborative filtering algorithm is implemented. The engine is content-based + CEFR-based only. Collaborative filtering (users-who-liked-X-also-liked-Y) is deferred to v2.
- **Trending / popularity-based recommendations.** The `scoreType` enum includes `"trending"` but no trending algorithm is implemented. Surfacing "what's popular this week" is a v2 feature.
- **Admin tools on mobile.** The admin panel remains web-only for MVP. Admin is a low-frequency, desktop-primary activity.
- **Real-time recommendation updates.** Recommendations are batch-computed with a 24h TTL. There is no real-time scoring as the learner interacts — the learner must explicitly recalculate or wait for cache expiry.
- **Content moderation / quality gating.** Any admin can create any content. There is no review workflow, quality threshold, or automated content moderation.
- **Multi-language content.** All content is assumed to be English-language learning material. Multi-language content catalogs are out of scope.
- **Content authoring tools.** The system stores content metadata and links to external sources (URLs); it does not host or help create the content itself.
- **A/B testing of recommendation algorithms.** Consistent with the parent PRD's non-goal of no experimentation infra in v1.

---

## 6. MVP Scope

### 6.1 In Scope (Already Implemented)

- §4.1 FR-1..FR-3: Content CRUD (create, list/filter, delete).
- §4.2 FR-6 (partial): Content embedding schema + seed pipeline.
- §4.3 FR-8..FR-11: Hybrid scoring, candidate filtering, score caching, recommendation feed.
- §4.4 FR-12..FR-13: Interaction tracking and history.
- §4.5 FR-15..FR-16: Preferences get/update API.
- §4.6 FR-18..FR-20: Admin dashboard, user list, content deletion.
- §4.7 FR-22: Seed endpoint.

### 6.2 Must Complete Before "MVP Done" (Gaps in Existing Implementation)

| Gap | FR | Priority | Effort | Blocker? |
|---|---|---|---|---|
| Real content embeddings (call embedding service on create) | FR-6 | **Blocker** | S | Yes — 40% of scoring is noise without this |
| Real profile embeddings (read actual user data, not hardcoded) | §10 | **Blocker** | S | Yes — profile embedding uses hardcoded values (CEFR: B1, interests: [], goals: [], native: Bangla, age: 25) for every user |
| Native mobile recommendation feed (Expo screen) | FR-23 | **Blocker** | M | Yes — primary user surface has no rec feed |
| User preferences web UI | FR-17 | **Blocker** | M | Yes — 30% of scoring receives empty inputs |
| Secure the seed endpoint for production | OQ-1 | **Blocker** | XS | Yes — public endpoint can overwrite production data |
| Gate `createContent` to admin role | §8.2 | **Blocker** | XS | Yes — any authenticated user can currently create content |
| Update content item endpoint | FR-4 | **Medium** | S | No — workaround exists (delete + re-create) |

### 6.3 Out of Scope for MVP (v2 Roadmap)

| Feature | FR | Priority | Notes |
|---|---|---|---|
| Interaction-weighted scoring (like → boost, dismiss → suppress) | FR-14 | High | Highest-impact quality improvement |
| Bulk content import | FR-5 | Medium | Needed when library > 50 items |
| Content update endpoint | FR-4 | Medium | Blocked by FR-7 (re-embed on update) |
| Content embedding recompute on update | FR-7 | Medium | Depends on FR-4 |
| Full analytics dashboard with time-series | FR-21 | Medium | Operational need grows with users |
| Collaborative filtering | — | Medium | Needs sufficient interaction volume |
| Trending/popular scores | — | Low | Needs sufficient interaction volume |
| Real-time scoring | — | Low | 24h TTL is adequate for MVP |

---

## 7. Success Metrics

Each SM cross-references the FRs it validates. Metrics are measurable from existing schema and API data.

### Primary

- **SM-R1**: Recommendation feed engagement rate — (users who interact with ≥1 recommended item per session) / (users who view the feed). Target: ≥ 30% within 30 days of launch. Validates FR-8, FR-11. **Baseline comparison:** Measure engagement on a simple "newest content at your CEFR level" feed (CEFR-only) vs. the hybrid-scored feed. SM-R1 is only meaningful if the hybrid feed outperforms the baseline by ≥ 10 percentage points.

**Empty state design:** When the candidate pool is exhausted (no items after filtering), the feed displays: "You've explored all the content at your level! Try a different CEFR level or content type." with buttons to (a) expand CEFR ±1 → ±2 for this session, (b) show all content types regardless of preference, (c) browse the full library.
- **SM-R2**: Content coverage — % of content items that appear in at least one user's top-10 recommendations. Target: ≥ 60%. Validates FR-9 (candidate filtering is not over-restrictive). Counter-metric: if coverage is 100%, filtering may be too loose.
- **SM-R3**: Dismiss rate — (dismiss interactions) / (total interactions). Target: ≤ 15%. High dismiss rate indicates poor content-learner matching. Validates FR-8, FR-9.
- **SM-R4**: Like-to-view ratio — (like interactions) / (view interactions). Target: ≥ 20%. Indicates content quality and relevance. Validates FR-8.

### Secondary

- **SM-R5**: Recalculation usage — % of recommendation feed views that trigger a manual recalculate. If > 40%, users feel their feed is stale; reduce TTL or add trigger-on-preference-change. Validates FR-10, FR-11.
- **SM-R6**: Preference completion rate — % of registered users with ≥3 interests and ≥1 preferred type set. Target: ≥ 50% within 60 days. Validates FR-16, FR-17. Prerequisite for SM-R1 to be meaningful.
- **SM-R7**: Admin content creation rate — content items added per week. Target: ≥ 5/week during growth phase. Validates FR-1, FR-5 (when bulk import is available).
- **SM-R8**: Score staleness — % of served recommendations that come from expired cached scores (i.e., stale but served because no recalculate was triggered). Target: ≤ 20%. Validates FR-10.

### Counter-Metrics

- **SM-RC1**: Feed homogeneity — if the same 5 items appear in >50% of users' feeds, the algorithm is over-fitting to CEFR level and ignoring personalization signals. Monitor diversity.
- **SM-RC2**: CEFR-level lock-in — if a learner's recommendations never include content at their next CEFR level (stretch content), the ±1 filter may be too conservative. Monitor stretch-content appearance rate.

---

## 8. Technical Architecture (Code-Validated)

This section documents the implemented architecture — not a proposal, but a record of what exists.

### 8.1 Data Model

```
content_item (PK: id text UUID)
  ├── title text NOT NULL
  ├── description text NOT NULL
  ├── type text NOT NULL ("video" | "article" | "exercise" | "dialogue")
  ├── cefr_level text NOT NULL ("A1".."C2")
  ├── source_url text nullable
  ├── thumbnail_url text nullable
  ├── duration integer nullable (seconds)
  ├── tags text[] NOT NULL DEFAULT []
  ├── metadata jsonb nullable
  ├── created_at timestamp NOT NULL
  └── updated_at timestamp NOT NULL
  Indexes: (cefr_level, type), (tags)

content_embedding (PK: content_id text FK→content_item ON DELETE CASCADE)
  ├── embedding real[] NOT NULL (384 dims)
  ├── model_version text NOT NULL
  └── updated_at timestamp NOT NULL
  Index: (model_version)

user_interaction (PK: id text UUID)
  ├── user_id text FK→user ON DELETE CASCADE
  ├── content_id text FK→content_item ON DELETE CASCADE
  ├── action text NOT NULL ("view"|"like"|"bookmark"|"complete"|"share"|"dismiss")
  ├── value integer nullable
  ├── metadata jsonb nullable
  └── created_at timestamp NOT NULL
  Unique: (user_id, content_id, action)
  Indexes: (user_id, created_at), (content_id, action)

recommendation_score (PK: id text UUID)
  ├── user_id text FK→user ON DELETE CASCADE
  ├── content_id text FK→content_item ON DELETE CASCADE
  ├── score real NOT NULL (0.0–1.0)
  ├── score_type text NOT NULL ("content"|"collaborative"|"hybrid"|"trending")
  ├── reason text nullable
  ├── created_at timestamp NOT NULL
  └── expires_at timestamp nullable
  Unique: (user_id, content_id, score_type)
  Indexes: (user_id, score_type, score), (expires_at)

user_preference (PK: user_id text FK→user ON DELETE CASCADE)
  ├── interests text[] NOT NULL DEFAULT []
  ├── goals text[] NOT NULL DEFAULT []
  ├── preferred_types text[] NOT NULL DEFAULT []
  ├── preferred_cefr text nullable
  ├── daily_goal integer NOT NULL DEFAULT 15
  ├── notifications jsonb DEFAULT {dailyReminder:true,newContent:true,progressUpdates:true}
  └── updated_at timestamp NOT NULL
```

### 8.2 API Surface (oRPC)

| Endpoint | Auth | Method | Description |
|---|---|---|---|
| `recommendations.listContent` | Public | Query | Browse/filter content library |
| `recommendations.getContent` | Public | Query | Get single content item by ID |
| `recommendations.createContent` | **Admin** | Mutation | Create new content item |
| `recommendations.getRecommendations` | Protected | Query | Get personalized feed (cached or recalculated) |
| `recommendations.trackInteraction` | Protected | Mutation | Record like/bookmark/share/dismiss/view/complete |
| `recommendations.getInteractions` | Protected | Query | View own interaction history |
| `recommendations.getPreferences` | Protected | Query | Get own preferences (with defaults) |
| `recommendations.updatePreferences` | Protected | Mutation | Update own preferences |
| `recommendations.adminStats` | Admin | Query | Dashboard metrics + recent activity + popular content |
| `recommendations.adminListUsers` | Admin | Query | Paginated user list with CEFR + preferences |
| `recommendations.adminDeleteContent` | Admin | Mutation | Delete content item (cascading) |
| `recommendations.seed` | **Public** | Mutation | Populate demo data ⚠️ |

### 8.3 Scoring Pipeline

```
User requests recommendations
  → Check cache (recommendation_score WHERE userId AND scoreType='hybrid' AND score > 0)
    → Cache HIT: load content items by cached contentIds, merge scores, return
    → Cache MISS or recalculate=true:
        1. Load user signals in parallel:
           - Profile embedding (user_profile_embedding)
           - Latest CEFR level (cefr_placement ORDER BY createdAt DESC)
           - Preferences (user_preference)
         2. Load excluded IDs: content IDs the user has `dismiss`ed or `complete`d
         3. Query candidate pool:
            - CEFR ±1 filter
            - Type preference filter (if set)
            - Exclude `dismiss`ed and `complete`d content
            - LIMIT 200
        4. Score candidates:
           - Cosine similarity × 0.4 (skip if no user embedding)
           - CEFR closeness × 0.3
           - Tag overlap × 0.2 (skip if no interests)
           - Type match × 0.1 (skip if no preferred types)
        5. Sort by score DESC, take top N
        6. Upsert scores to recommendation_score (TTL: 24h)
        7. Load full content items, merge scores, return
```

### 8.4 Shared Infrastructure with Parent PRD

| Component | Recommendation Engine | Partner Matching (Parent PRD) |
|---|---|---|
| CEFR placement | Used for ±1 content filter | Used for ±1 partner filter |
| Profile embedding (384-dim) | Used for content similarity | Used for partner similarity |
| BGE-small-en-v1.5 model | Embedding service at `EMBED_URL` | Same service |
| User table + auth | Standard Better-Auth session | Same |
| Admin role gate | `adminProcedure` | N/A (partner matching is user-facing) |

---

## 9. Open Questions

1. **Seed endpoint security.** The `seed` endpoint is `publicProcedure` — callable by anyone without authentication. In production, this must be either removed, gated behind an admin procedure, or limited to development environments. Owner: Engineering. Priority: Before production deploy.

2. **Content embedding pipeline automation.** Currently, content embeddings are generated as random vectors by the seed endpoint. When should real embeddings be computed — synchronously on content creation (latency cost) or asynchronously via a job queue (complexity cost)? The embedding service call takes ~200ms per item. Owner: Engineering.

3. **Score TTL tuning.** The current 24-hour TTL for recommendation scores is a starting value. Optimal TTL depends on content creation velocity (how often new content appears) and user interaction frequency (how quickly the exclusion list changes). If content is added daily, 24h may be right; if weekly, it's wasteful recomputation. Owner: PM + Engineering. Revisit after 30 days of usage data.

4. **Mobile recommendation feed — design decisions.** The native mobile recommendation feed is now MVP-scoped (FR-23, §4.8). Open design questions: (a) Should the mobile feed be a dedicated tab or a section within the home screen? (b) Should card layout differ from web (e.g., single-column vs. grid, swipe-to-dismiss vs. button)? (c) Should the mobile app support offline caching of recommended content metadata? Owner: PM + Design. Priority: Resolve before FR-23 implementation begins.

5. **Content type expansion.** Current types are `video | article | exercise | dialogue`. Should the engine support `podcast`, `quiz`, `flashcard`, or user-generated content types? Expanding the type enum affects the scoring algorithm (type preference weighting) and the UI (rendering different card types). Owner: PM.

6. **Interaction signal weights for v2.** When FR-14 (interaction-weighted scoring) is built, what weights should different interactions carry? Proposed starting values: like = +0.3 boost to similar content, dismiss = -0.2 suppression, complete = +0.1 (weaker than like because completion doesn't imply enjoyment), bookmark = +0.2. Owner: PM + Engineering.

7. **CEFR level advancement signal.** When a learner's CEFR placement improves (e.g., A2 → B1), should the recommendation cache be invalidated immediately, or should it wait for the next natural expiry? Immediate invalidation ensures the learner sees level-appropriate content right away. Owner: Engineering.

8. **Content quality signals.** There is no mechanism to surface "high quality" vs "low quality" content beyond like counts. Should there be an admin-assigned quality score, user rating system, or minimum engagement threshold for content to appear in recommendations? Owner: PM.

---

## 10. Assumptions Index

- §1: The recommendation engine adds value *between* voice practice sessions. [ASSUMPTION: users have 5–10 minute idle learning windows. Not validated by user research.]
- §2.1: Rina-style "between sessions" usage is the primary use case. [ASSUMPTION: based on the product's voice-first positioning; content consumption may become primary for some users.]
- §4.2 FR-6: The BGE-small-en-v1.5 embedding service is available at `EMBED_URL` in production. [ASSUMPTION: not verified. The embedding service is referenced in `models.ts` but its deployment status is unknown.]
- §4.3 FR-8: The four-signal hybrid scoring weights (0.4/0.3/0.2/0.1) are reasonable starting values. [ASSUMPTION: not validated. Should be tuned from engagement data after launch.]
- §4.3 FR-9: CEFR ±1 is the right filter width. [ASSUMPTION: ±1 may be too narrow for users at level boundaries (e.g., a strong A2 might benefit from B2 stretch content). Should be revisited.]
- §4.3 FR-9: Exclusion logic was updated (2026-06-13): only `dismiss` and `complete` interactions are permanently excluded. `view`, `like`, `bookmark`, and `share` may reappear after a 7-day decay period. This addresses the depletion spiral risk while preserving the ability to revisit liked content.
- §4.3 FR-10: 24-hour score TTL is appropriate. [ASSUMPTION: see Open Question 3.]
- §4.6 FR-18: The admin panel is web-only. [ASSUMPTION: acceptable for MVP. Admin is a low-frequency, desktop-primary activity.]
- §4.7 FR-22: The seed endpoint should remain public during development. [ASSUMPTION: must be secured before production. See Open Question 1.]
- §7: All success metrics are measurable from existing schema data without additional instrumentation. [VERIFIED: interaction counts, scores, preferences, and user counts are all queryable from the existing tables.]
- §8.4: Profile embedding computation (in `models.ts`) uses hardcoded profile template values (CEFR: "B1", interests: [], goals: [], native: "Bangla", age: 25, style: "gentle correction, slow pace"). [NOTE: the embedding is based on placeholder data, not the user's actual profile. This degrades both recommendation and partner matching quality. The TODO comments in the code acknowledge this.]
