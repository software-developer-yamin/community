# F8.5 — Topic-Based Rooms

**Status:** spec (1 day, no code in this doc)
**Depends on:** F1.1 (reconnect UI), F8.2 (matching service)
**Ships to:** `apps/web/` (queue UI), `apps/native/` (queue UI), `packages/api/src/routers/topics.ts`

---

## 1. Problem

Today: matching is `(CEFR ± 1, ≥1 shared interest, D7 active)`. Interest is a fixed profile field (3-5 tags picked at signup).

**Churn symptom (from brainstorm Theme 2):**
- "I matched with a B2 guy but we had nothing to talk about"
- "Every call feels like a job interview"
- "I want to practice job interviews, not casual chat"

Matching optimizes for compatibility. But for **deliberate practice**, users want specificity: "I want to practice giving a job interview in English", not "find me a B2 partner who also likes 'movies'".

## 2. Goal

Let users enter a **topic-tagged room** for a finite session. The room:
1. Has a defined topic (e.g., "Job interview practice", "Ordering food at a restaurant", "Discussing climate change").
2. Has a CEFR band (e.g., B1-B2 for "Job interview").
3. Auto-matches 2-4 users with the topic.
4. Times out after 20 min with a "report card" (pronunciation score, vocab used, F3.1 highlights).
5. Is one-shot — no reconnection (vs F1.1 free-call rooms).

## 3. UX

### 3.1 Web/mobile entry point

**Tab: "Practice"** (existing tab: "Talk" → renamed to split):

```
┌─────────────────────────────────────────┐
│  Practice                               │
│                                         │
│  [ Casual Talk  ]  [ Topic Rooms  ]     │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🎯 Job Interview                  │  │
│  │ Practice answering common Qs.     │  │
│  │ B1-B2 · ~15 min · 2 people        │  │
│  │                          [ Join ] │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🍽️  At a Restaurant               │  │
│  │ Order food, ask for the bill.     │  │
│  │ A2-B1 · ~10 min · 2 people        │  │
│  │                          [ Join ] │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🌍 Climate & Environment          │  │
│  │ Discuss current events.           │  │
│  │ B2-C1 · ~20 min · 3-4 people      │  │
│  │                          [ Join ] │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [+ Suggest a topic]                     │
└─────────────────────────────────────────┘
```

### 3.2 Queue state

After tapping Join:
- "Looking for a Job Interview partner (B1-B2)…"
- "1 of 2 found. Average wait 12s."
- Or: "Room full. Try Casual Talk or another topic."

### 3.3 In-room UI

Same call UI as F1.1, plus:
- **Topic chip** sticky at top: "🎯 Job Interview · 14:32 left"
- **Suggested phrases** carousel: 5 phrases relevant to topic (e.g., "I'd say my biggest strength is…", "Where do you see yourself in 5 years?")
- **Vocabulary bank**: tap a chip to highlight it in your transcript (F3.1 vocab tracker integration).

### 3.4 End-of-room report card

```
┌─────────────────────────────────────────┐
│  Job Interview — Complete               │
│                                         │
│  Duration: 18:23                        │
│  Pronunciation: 78/100  (+4 vs your avg)│
│                                         │
│  Vocab you used:                        │
│  ✓ "team player"   ✓ "deadline"         │
│  ✓ "problem-solving"  ✓ "initiative"    │
│  ⌫ skipped: "leverage", "synergy"       │
│                                         │
│  Feedback from partner:                 │
│  ⭐⭐⭐⭐ "Good pacing, speak up more"   │
│                                         │
│  [ Practice again ]  [ Back to topics ] │
└─────────────────────────────────────────┘
```

## 4. Architecture

### 4.1 New table: `topic_room`

```ts
// packages/db/src/schema/topics.ts
export const topicRoom = pgTable("topic_room", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicKey: text("topic_key").notNull(),       // "job-interview", "restaurant"
  cefrMin: text("cefr_min").notNull(),         // "B1"
  cefrMax: text("cefr_max").notNull(),         // "B2"
  groupSize: integer("group_size").notNull(),  // 2, 3, 4
  durationMin: integer("duration_min").notNull(),
  status: text("status").notNull(),           // "open" | "closed"
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 4.2 New table: `topic_room_participant`

```ts
export const topicRoomParticipant = pgTable("topic_room_participant", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => topicRoom.id),
  userId: text("user_id").notNull().references(() => user.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  pronScore: integer("pron_score"),
  rating: integer("rating"),  // 1-5 stars from partner
});
```

### 4.3 Topic catalog

Static JSON in `apps/web/src/data/topics.json` (no CMS needed for v1):

```json
[
  {
    "key": "job-interview",
    "icon": "🎯",
    "titleEn": "Job Interview",
    "titleBn": "চাকরির ইন্টারভিউ",
    "description": "Practice answering common interview questions.",
    "cefrMin": "B1", "cefrMax": "B2",
    "groupSize": 2, "durationMin": 15,
    "suggestedPhrases": [
      "I'd say my biggest strength is...",
      "Where do you see yourself in 5 years?",
      "Can you tell me about a time when..."
    ],
    "vocabTarget": ["team player", "deadline", "problem-solving", "initiative", "leverage", "synergy", "stakeholder"]
  },
  {
    "key": "restaurant",
    "icon": "🍽️",
    "titleEn": "At a Restaurant",
    "titleBn": "রেস্তোরাঁয়",
    "description": "Order food, ask for the bill, make a reservation.",
    "cefrMin": "A2", "cefrMax": "B1",
    "groupSize": 2, "durationMin": 10,
    "suggestedPhrases": [
      "Could I see the menu, please?",
      "I'll have the...",
      "Could we have the bill, please?"
    ],
    "vocabTarget": ["menu", "appetizer", "main course", "bill", "tip", "reservation"]
  },
  // ... 8-12 more topics at launch
]
```

Languages: `titleEn` + `titleBn` for Bangladesh market. UI shows user's locale.

### 4.4 Router: `packages/api/src/routers/topics.ts`

```ts
export const topicsRouter = router({
  list: publicProcedure.query(() => topicCatalog),  // static JSON
  join: protectedProcedure
    .input(z.object({ topicKey: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserCefr(ctx.user.id);
      const topic = topicCatalog.find(t => t.key === input.topicKey);
      if (!topic) throw new TRPCError({ code: "NOT_FOUND" });
      if (!cefrInBand(user.cefr, topic.cefrMin, topic.cefrMax)) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED", 
          message: `Your level (${user.cefr}) doesn't match this room (${topic.cefrMin}-${topic.cefrMax}). Try another topic.` 
        });
      }
      return matchToRoom(ctx.user.id, input.topicKey);
    }),
  reportCard: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input, ctx }) => getReportCard(input.roomId, ctx.user.id)),
  suggestTopic: protectedProcedure
    .input(z.object({ title: z.string(), description: z.string() }))
    .mutation(async ({ input }) => db.insert(topicSuggestion).values({ ...input })),
});
```

### 4.5 Matching logic

Extend F8.2's `matchPartners` to accept `topicKey` constraint:

```ts
// packages/api/src/routers/models.ts (extend)
matchPartners({ userId, topicKey?: string }) {
  const baseQuery = sql`
    SELECT u.id, u.cefr, u.interests, 1 - (${userEmbedding} <=> u.embedding) AS sim
    FROM user u
    WHERE u.d7_active = true
      AND u.cefr BETWEEN ${cefrMin} AND ${cefrMax}
      AND u.id != ${userId}
      ${topicKey ? sql`AND EXISTS (SELECT 1 FROM user_topic ut WHERE ut.user_id = u.id AND ut.topic_key = ${topicKey})` : sql``}
    ORDER BY sim DESC
    LIMIT ${groupSize - 1}
  `;
  return baseQuery;
}
```

**Group rooms (3-4 users):** if no 2-3 user group found in 30s, drop to 2-user.
**2-user rooms:** fall through to F1.1 reconnect after topic timer ends.

## 5. Topic suggestion flow

Users can submit topic ideas. Admin reviews weekly:

```
[+ Suggest a topic]
   ↓
Modal: "What topic would help you practice?"
  Title: _______________
  Description: _______________
  [ Submit ]
   ↓
"Thanks! We review suggestions weekly."
```

Stored in `topic_suggestion` table. Admin gets weekly digest email (separate spec).

## 6. Telemetry

```ts
// packages/api/src/lib/analytics.ts (extend)
track("topic_room_join", { topic_key, cefr, wait_ms, group_size });
track("topic_room_complete", { topic_key, duration_actual, pron_score, rating });
track("topic_room_drop", { topic_key, joined_for_ms, reason: "user_left" | "no_match" | "kicked" });
```

Key metrics:
- **Topic vs Casual completion rate**: do topic rooms have higher F1 retention than casual?
- **Vocab acquisition rate**: do topic rooms add more target-vocab words to F3.1 vocab tracker?
- **Wait time P50/P95 per topic**: identifies under-staffed topics → rebalance.

## 7. Rollout

| Stage | Day | Gate |
|---|---|---|
| Ship 5 topics (interview, restaurant, travel, weather, hobbies) | 0 | Smoke test passes |
| A/B 50% of users see "Practice" tab | 1-3 | Topic room completion rate ≥ Casual completion rate |
| A/B 100% | 4-7 | Same gate |
| Add 5 more topics (climate, news, shopping, healthcare, business) | 8+ | Catalog healthy |

## 8. Anti-goals

- Do NOT build a CMS for topic catalog. Static JSON is fine for v1.
- Do NOT add moderator/teacher presence in rooms. Async topic suggestion only.
- Do NOT replace Casual Talk. Topic rooms are an ADDITIONAL mode, not replacement.
- Do NOT add topic-specific scoring algorithms. Reuse F8.2 pron + CEFR grader.
- Do NOT support topic creation by users in v1. Suggestion only. Defer to v2.

## 9. Open questions

- **Topic auto-balance**: if "Job Interview" is oversubscribed, should we redirect excess to "Casual Talk"? Or queue them? Defer to v2.
- **Topic badges**: should completing 5 rooms in a topic unlock a "Job Interview Ready" badge? Nice-to-have, defer.
- **Native-specific topics**: e.g., "ঈদ সালাম" (Eid greetings) — cultural topics for BN-speaking users. Defer to F8.7.
- **Multi-language UI**: catalog already has titleBn, but phrases are EN-only. Translate? Defer.

## 10. Files (when implemented)

- `apps/web/src/data/topics.json` — 10 topics at launch
- `apps/native/src/data/topics.json` — same file shared
- `packages/db/src/schema/topics.ts` — 3 new tables
- `packages/api/src/routers/topics.ts` — 4 procedures
- `apps/web/src/app/(main)/practice/page.tsx` — practice landing
- `apps/web/src/app/(main)/practice/[topic]/page.tsx` — queue + room
- `apps/native/src/app/practice/index.tsx` — practice landing
- `apps/native/src/app/practice/[topic].tsx` — queue + room
- `apps/web/src/components/TopicCard.tsx` — card UI
- `apps/web/src/components/ReportCard.tsx` — end-of-room card
- `packages/api/src/lib/room-matcher.ts` — extend F8.2 matcher with topic filter
