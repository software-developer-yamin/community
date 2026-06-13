---
name: AceFluency — Recommendation Engine Surfaces
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-community-recommendation-engine-2026-06-12/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/EXPERIENCE.md
updated: 2026-06-13
project: community
inherits:
  ui_system: shadcn/ui
  source_of_truth:
    - _bmad-output/planning-artifacts/ux-designs/ux-community-2026-06-10/DESIGN.md
---

# UX DESIGN — Recommendation Engine Surfaces

> *This document extends the AceFluency UX design system with surfaces specific to the Content Recommendation Engine. All visual tokens, colors, typography, and component patterns are inherited from the parent DESIGN.md.*

## Architecture

**Three-tier architecture:**
- **Web (Next.js)** — Admin panel only. Content management, analytics, user management. No client-facing surfaces.
- **Mobile (Expo/React Native)** — Client app only. Recommendation feed, content consumption, preferences, interactions. No admin functionality.
- **Server (Hono)** — Shared backend API. Serves both mobile client and web admin. Recommendation scoring, content CRUD, user management, analytics.

## Surfaces Added

| # | Surface | Platforms | Reached from | Primary purpose | PRD refs |
|---|---|---|---|---|---|---|
| S20 | Recommendation Feed | **Native** | S1 (Home) "Learn" tab | Discover personalized content | FR-8, FR-9, FR-10, FR-11, FR-23 |
| S21 | Content Detail | **Native** | S20 card tap | View full content, interact, consume | FR-12, FR-13 |
| S22 | User Preferences | **Native** | S7 (Settings) | Edit interests, goals, types, daily goal | FR-15, FR-16, FR-17 |
| S23 | Content Library | **Native** | S20 "Browse all" | Browse all content, filter, search | FR-2 |
| S24 | Admin Content Management | **Web** | Admin panel | Create, edit, delete, bulk import content | FR-1, FR-3, FR-4, FR-5 |
| S25 | Admin Content Analytics | **Web** | Admin panel | View engagement, CEFR distribution, trends | FR-21 |

> **Note:** Web is strictly for admin use. All client-facing surfaces (feed, content, preferences, library) are native-only.

---

## S20: Recommendation Feed

### Purpose
The primary discovery surface for the recommendation engine. Learners see a personalized feed of content items matched to their CEFR level, interests, and interaction history. Available on both native and web, but native is the primary surface.

### Layout

**Native (Expo) — Client-facing:**
- Single-column scrollable list (vertical)
- Full width minus `gutter` (16px) padding on each side
- Card gap: `card-gap` (12px)
- Pull-to-refresh triggers recalculation
- Bottom tab bar item: "Learn" (book icon, secondary position after "Home")

> **Web is admin-only.** There is no client-facing web recommendation feed.

### Header

- **Title:** "For You" (display-sm, 24px/600)
- **Subtitle:** "Content matched to your level and interests" (caption, 12px/400, muted-foreground)
- **Refresh button:** Secondary variant, icon = `RefreshCw`, label = "Recalculate"
- **Filter button:** (native only) Opens bottom sheet with type + CEFR filters

### Empty State

- **Icon:** `BookOpen` (48px, muted-foreground)
- **Headline:** "You've explored all content at your level!" (heading, 20px/600)
- **Body:** "Try expanding your range or browse the full library." (body, 16px/400)
- **Actions:**
  1. "Expand level range" (primary button) — widens CEFR filter from ±1 to ±2
  2. "Show all types" (secondary button) — ignores type preference
  3. "Browse full library" (secondary button) — navigates to S23

### Loading State

- Skeleton cards: 3 cards with elevated background, rounded-md, pulsing animation
- Each skeleton card: 200px height, 80% width for title, 60% for description, 40% for tags
- Skeleton header: 60% width for title, 40% for subtitle

### Error State

- **Icon:** `AlertCircle` (48px, destructive)
- **Headline:** "Couldn't load recommendations" (heading)
- **Body:** "Check your connection and try again." (body)
- **Action:** "Retry" (primary button)

---

## S20-A: Content Card Component

### Purpose
The primary content unit in the recommendation feed. Displays a content item with its metadata, recommendation score, and interaction affordances.

### Dimensions

- **Width:** 100% of container (native)
- **Height:** Auto (min 200px, max 320px)
- **Background:** `{colors.background-elevated}` (`#161B22`)
- **Border:** 1px `{colors.border}` (`#2A3039`)
- **Radius:** `{rounded.md}` (8px)
- **Padding:** 16px

### Card Layout (top to bottom)

1. **Thumbnail area** (optional)
   - Height: 120px, full width, rounded-top-md
   - Image: thumbnail_url or placeholder gradient (primary → muted)
   - Overlay: CEFR level badge (top-left) and content type badge (top-right)

2. **Title**
   - Typography: heading (20px/600)
   - Color: `{colors.foreground}`
   - Max 2 lines, ellipsis overflow
   - Margin-top: 12px

3. **Description**
   - Typography: body (16px/400)
   - Color: `{colors.muted-foreground}`
   - Max 3 lines, ellipsis overflow
   - Margin-top: 4px

4. **Tags row**
   - Display: flex, gap 8px, wrap
   - Each tag: Status Pill component (muted fill, muted-foreground text, full radius)
   - Max 3 visible tags, "+N" overflow indicator
   - Margin-top: 12px

5. **Score + Reason row**
   - Display: flex, justify-between, align-center
   - **Score badge:** Left side. Background: primary at 10% opacity, text: primary color. "Score: 0.85" (caption, 12px/500)
   - **Reason:** Right side. "Matched to your interests" (caption, 12px/400, muted-foreground)
   - Margin-top: 12px

6. **Interaction buttons row**
   - Display: flex, justify-between, align-center
   - **Left group:** Like, Bookmark, Share (icon buttons, 40px touch target)
   - **Right group:** Dismiss (icon button, muted-foreground)
   - Margin-top: 12px
   - Border-top: 1px `{colors.border}` (separator)
   - Padding-top: 12px

### Interaction Button States

| Button | Icon | Default | Active | Disabled |
|--------|------|---------|--------|----------|
| Like | `Heart` | muted-foreground | primary (filled) | muted-foreground at 50% |
| Bookmark | `Bookmark` | muted-foreground | accent (filled) | muted-foreground at 50% |
| Share | `Share2` | muted-foreground | — | muted-foreground at 50% |
| Dismiss | `X` | muted-foreground | — | muted-foreground at 50% |

### Touch Targets

- All icon buttons: 44px × 44px minimum (native)
- Tap feedback: opacity 0.7 on press
- Haptic feedback: light impact on Like, Bookmark (native only)

### Card Tap Behavior

- **Tap card body (not buttons):** Navigate to S21 (Content Detail)
- **Tap Like/Bookmark/Share/Dismiss:** Trigger interaction immediately (optimistic UI)
- **Tap Dismiss:** Card animates out with slide-left + fade (300ms, ease-out)

---

## S21: Content Detail

### Purpose
Full view of a content item with complete metadata, larger interaction affordances, and consumption entry point.

### Layout

**Native (Expo) — Client-facing:**
- **Header:** Back button (left), Share button (right)
- **Thumbnail:** Full width, 200px height, rounded-lg
- **Title:** display-sm (24px/600)
- **CEFR + Type badges:** Inline row, gap 8px
- **Description:** body (16px/400), full text (no truncation)
- **Tags:** Full tag list, wrap
- **Interaction bar:** Fixed to bottom (native)
  - Large Like button (primary variant, with count)
  - Bookmark button (secondary variant)
  - "Complete" button (primary variant, compact)

### Bottom Action Bar (Native)

- Height: 64px + safe area
- Background: `{colors.background-elevated}` with top border
- Left: Like (icon + count), Bookmark (icon)
- Right: "Mark Complete" (primary button, compact)

> **Web is admin-only.** There is no client-facing web content detail view.

---

## S22: User Preferences

### Purpose
Learners manage their personalization signals: interests, goals, preferred content types, CEFR override, daily learning goal, and notification settings. These preferences directly influence recommendation quality.

### Layout

**Native (Expo) — Client-facing:**
- **Header:** "Your Preferences" (display-sm), "Tell us what you like" (caption)
- **Form sections:** Scrollable, grouped by category
- **Save button:** Fixed to bottom (with safe area)

> **Web is admin-only.** There is no client-facing web preferences UI.

### Sections

1. **Interests**
   - Label: "What topics interest you?" (label, 14px/500)
   - Subtitle: "Add up to 20 topics" (caption, muted-foreground)
   - Input: Tag input field (elevated background, border, md radius)
   - Existing tags: Status Pill components with X to remove
   - Suggestions: Horizontal scroll of common tags (travel, food, daily-life, business, technology, health, entertainment, education, sports, culture)

2. **Goals**
   - Label: "What are your learning goals?"
   - Subtitle: "Add up to 10 goals"
   - Same pattern as Interests
   - Suggestions: improve-conversation, expand-vocabulary, prepare-for-interview, practice-grammar, build-confidence, reduce-accent, improve-listening, prepare-for-exam

3. **Preferred Content Types**
   - Label: "What formats do you prefer?"
   - Subtitle: "Select up to 4"
   - Options: Video, Article, Exercise, Dialogue
   - UI: Checkbox cards (2×2 grid)
   - Each card: Icon + label + checkbox
   - Selected state: primary border, primary background at 10%
   - Disabled state: opacity 50% when 4 already selected

4. **Preferred CEFR Level**
   - Label: "Override your level (optional)"
   - Subtitle: "Your assessed level is [B1]. Change only if you know your level."
   - UI: Dropdown/select (A1, A2, B1, B2, C1, C2)
   - Default: "Use assessed level" (null)

5. **Daily Goal**
   - Label: "Daily learning goal"
   - Subtitle: "How many minutes per day?"
   - UI: Slider (1–120, default 15)
   - Display: "15 minutes" (heading, updates dynamically)
   - Markers: 5, 15, 30, 60, 120

6. **Notifications**
   - Label: "Notifications"
   - Items:
     - Daily reminder (toggle)
     - New content alerts (toggle)
     - Progress updates (toggle)
   - UI: Toggle switches (primary color when on)

### Save Behavior

- **Auto-save:** None (explicit save only)
- **Save button:** Primary, "Save Preferences", full width
- **On save:** Toast "Preferences saved. Your recommendations will update."
- **Cache invalidation:** Recommendations recalculated on next feed load
- **Unsaved changes:** Alert if user tries to navigate away

### Empty State

- If user has no preferences: Show inline suggestions and defaults
- Do not show empty state screen — always show the form with defaults

---

## S23: Content Library

### Purpose
Browse the entire content library with filters. Available on native only. The web admin panel has a separate content management table (S24) for admin operations.

### Layout (Native)

- **Header:** "Content Library" (display-sm), subtitle "Browse all learning content"
- **Filter bar:**
  - Type filter: Dropdown (All, Video, Article, Exercise, Dialogue)
  - CEFR filter: Dropdown (All, A1, A2, B1, B2, C1, C2)
  - Tag filter: Search input (filters by tag containment)
  - Sort: Dropdown (Newest, Oldest, Most liked, Most completed)
- **List:** Single column (native), scrollable
- **Pagination:** Load more button (infinite scroll optional)

### Card Variant (Library Card)

- Simplified version of Content Card
- No recommendation score or reason
- Shows: thumbnail, title, CEFR badge, type badge, tags, like count, completion count
- No interaction buttons on card (tap to open detail)

> **Web is admin-only.** The public content library is native-only. The web admin panel uses S24 (Admin Content Management) for content operations.

---

## S24: Admin Content Management

### Purpose
Admin-only surface for creating, editing, deleting, and bulk importing content items.

### Layout (Web)

- **Header:** "Content Management" (display-sm), "Create, edit, and manage learning content" (body)
- **Stats row:** Total items, items created this week, items pending embeddings, average engagement
- **Action bar:**
  - "Create Item" (primary button) → opens create dialog
  - "Bulk Import" (secondary button) → opens import dialog
  - Search input (filters by title/description)
- **Table:**
  - Columns: Thumbnail, Title, Type, CEFR, Tags, Created, Actions
  - Row actions: Edit, Delete (with confirmation)
  - Sortable columns: Title, Type, CEFR, Created
  - Pagination: 20 items per page

### Create/Edit Dialog

- **Title:** "Create Content Item" or "Edit Content Item"
- **Fields:**
  - Title (input, required, 1–200 chars)
  - Description (textarea, required, 1–2000 chars)
  - Type (select: video, article, exercise, dialogue)
  - CEFR Level (select: A1–C2)
  - Tags (tag input, max 10, each 1–50 chars)
  - Source URL (input, optional, URL validation)
  - Thumbnail URL (input, optional, URL validation)
  - Duration (number input, optional, seconds)
  - Metadata (JSON textarea, optional, validates as JSON)
- **Actions:** "Save" (primary), "Cancel" (secondary)
- **Validation:** Inline validation, submit blocked until valid

### Bulk Import Dialog

- **Title:** "Bulk Import Content"
- **Instructions:** "Upload a CSV with columns: title, description, type, cefr_level, tags, source_url, thumbnail_url, duration"
- **Upload area:** Drag-and-drop zone, accepts .csv, .json
- **Preview:** First 5 rows preview before import
- **Validation:** Show errors per row
- **Actions:** "Import" (primary, disabled if errors), "Cancel" (secondary)
- **Progress:** Progress bar during import, result summary after

### Delete Confirmation

- **Title:** "Delete Content Item"
- **Body:** "Are you sure you want to delete '[title]'? This will also delete all associated embeddings, interactions, and recommendation scores."
- **Actions:** "Delete" (destructive), "Cancel" (secondary)
- **Warning:** "This action cannot be undone."

---

## S25: Admin Content Analytics

### Purpose
Admin-only analytics dashboard for understanding content engagement, library health, and user behavior.

### Layout (Web)

- **Header:** "Content Analytics" (display-sm)
- **Date range picker:** 7d, 30d, 90d, custom
- **Stats cards (top row):**
  - Total content items
  - Total interactions (views + likes + completions + dismisses)
  - Average engagement per item
  - Preference completion rate (% users with ≥3 interests)

### Charts

1. **CEFR Distribution**
   - Type: Horizontal bar chart
   - Data: Count of items per CEFR level (A1–C2)
   - Color: Primary color for bars
   - Insight callout: "B1 has the most items. C2 has only 2 items."

2. **Interaction Trends**
   - Type: Line chart
   - X-axis: Date
   - Y-axis: Count
   - Lines: Views (muted), Likes (primary), Completions (accent), Dismisses (destructive)
   - Legend: Interactive toggle

3. **Top Content by Engagement**
   - Type: Horizontal bar chart
   - Data: Top 20 items by total interactions
   - Color: Primary
   - Tooltip: Title, CEFR, type, total interactions

4. **User Engagement Funnel**
   - Type: Vertical funnel
   - Stages: Users who viewed feed → Users who interacted → Users who completed → Users who set preferences
   - Conversion rates between stages

5. **Score Staleness**
   - Type: Pie chart
   - Data: % fresh scores (<24h) vs % stale scores (>24h)
   - Color: Primary (fresh), Muted (stale)

### Table: Content Performance

- Columns: Title, CEFR, Type, Views, Likes, Completions, Dismisses, Avg Score, Last Updated
- Sortable: All numeric columns
- Pagination: 20 per page
- Row click: Navigate to content edit

---

## Component Patterns (New)

### Tag Input

- **Container:** Elevated background, border, md radius, min-height 48px
- **Input:** Inline, no border, transparent background, placeholder "Add a tag..."
- **Tags:** Status Pill components with X remove button
- **Behavior:** Enter or comma to add tag, backspace on empty input to remove last tag
- **Validation:** Max count, max length, no duplicates
- **Suggestions:** Dropdown below input with matching existing tags

### Score Badge

- **Background:** Primary color at 10% opacity
- **Text:** Primary color, caption (12px/500)
- **Content:** "Score: 0.85" or "95% match"
- **Shape:** Rounded-full (pill), padding 4px 12px

### CEFR Badge

- **Variant of Status Pill**
- **Colors per level:**
  - A1: muted-foreground (gray)
  - A2: accent (amber)
  - B1: primary (teal)
  - B2: primary at 80% opacity
  - C1: primary at 60% opacity
  - C2: primary at 40% opacity
- **Text:** White or dark depending on level

### Content Type Badge

- **Variant of Status Pill**
- **Icon + Label:**
  - Video: `Play` icon
  - Article: `FileText` icon
  - Exercise: `PenTool` icon
  - Dialogue: `MessageCircle` icon
- **Text:** muted-foreground

### Interaction Button

- **Size:** 44px × 44px (native), 40px × 40px (web)
- **Icon:** 20px
- **States:**
  - Default: muted-foreground
  - Hover/Press: opacity 0.7
  - Active: primary or accent (filled)
  - Disabled: opacity 0.3
- **Feedback:**
  - Like: Scale animation 1.0 → 1.2 → 1.0 (200ms), haptic (native)
  - Bookmark: Scale animation + color fill
  - Dismiss: Slide-out animation on card

---

## Voice & Tone (Recommendation Surfaces)

Follow the parent EXPERIENCE.md voice rules. Specific additions:

| Surface | Do | Don't |
|---|---|---|
| Feed empty state | "You've explored all content at your level!" | "No content found! 🎉" |
| Score reason | "Matched to your interests" | "97% algorithmic match!" |
| Preference save | "Preferences saved. Your recommendations will update." | "Settings updated successfully!" |
| Content complete | "Completed! Great job." | "You unlocked a completion! 🏆" |
| Dismiss action | "Not interested? We'll show you less like this." | "Item dismissed!" |
| Admin import | "47 items imported. 3 errors found." | "Import complete! 🎉" |

---

## Accessibility

- **Content Card:** Role="article", aria-label="[title] — [type] — [CEFR]"
- **Interaction buttons:** aria-pressed state for Like/Bookmark, aria-label="Like [title]", "Bookmark [title]", "Dismiss [title]"
- **Score badge:** aria-label="Recommendation score: 85%"
- **Tag input:** aria-describedby="Add up to 20 interests"
- **Preferences form:** Fieldset + legend for each section, label association
- **Feed list:** Role="feed" (if supported), or role="list" with role="listitem" on cards
- **Keyboard:** Tab navigates cards, Enter opens detail, Space toggles Like/Bookmark
- **Screen reader:** "Content feed. 10 items. First item: Ordering food at a restaurant. Video. B1 level. Score 85%."

---

*Extends:* `ux-designs/ux-community-2026-06-10/DESIGN.md` and `EXPERIENCE.md`  
*PRD reference:* `prd-community-recommendation-engine-2026-06-12/prd.md`  
*Epics reference:* `epics-recommendation-engine.md`
