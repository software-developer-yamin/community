# F4.1 In-App Help Center — Engineering Spec

**Status:** Ready to ship
**Effort:** 3 days
**ICE:** 8 (impact 9, confidence 8, ease 7)
**Owner:** Support lead
**Metric:** Avg first response <2hr (was 3-5d); "no support" reviews ↓70%

## Problem

Users hit a wall: account issue, payment dispute, call bug → contact support → 3-5d wait → uninstall. From reviews: "support = no support".

## BD-tuned solution

Three channels, tiered by complexity:
1. **Tier 0 self-serve** — FAQ in app + 20 articles, 80% of tickets defected
2. **Tier 1 chat** — WhatsApp bot (BD users default to WhatsApp), AI handles common, human fallback
3. **Tier 2 email** — dispute/billing/refund, 24h SLA

Plus: **public status page** (transparency = trust).

## Stack

- **In-app FAQ** — markdown articles in DB, server-rendered, search-indexed
- **WhatsApp** — WhatsApp Business API via Meta Cloud API (free tier 1k convos/month)
- **AI bot** — Vercel AI SDK with our existing `ai` package (already in deps)
- **Status page** — public endpoint, polls server every 60s
- **Email** — Resend (transactional, free tier 3k/mo)

## Schema

```ts
// packages/db/src/schema/support.ts
import { pgTable, text, timestamp, uuid, pgEnum, index, integer, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { boolean } from 'drizzle-orm/pg-core';

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open', 'pending_user', 'pending_support', 'resolved', 'closed',
]);
export const ticketChannelEnum = pgEnum('ticket_channel', [
  'in_app', 'whatsapp', 'email',
]);
export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'low', 'normal', 'high', 'urgent',
]);

export const supportCategories = pgTable('support_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),         // 'billing', 'call_quality', 'account'
  titleEn: text('title_en').notNull(),
  titleBn: text('title_bn'),                      // Bangla
  iconName: text('icon_name').notNull(),          // Ionicons name
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const helpArticles = pgTable('help_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => supportCategories.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  titleEn: text('title_en').notNull(),
  titleBn: text('title_bn'),
  bodyEn: text('body_en').notNull(),              // markdown
  bodyBn: text('body_bn'),
  tags: text('tags').array().notNull().default([]),
  views: integer('views').notNull().default(0),
  helpfulYes: integer('helpful_yes').notNull().default(0),
  helpfulNo: integer('helpful_no').notNull().default(0),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  categoryIdx: index('ha_category_idx').on(t.categoryId),
}));

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  channel: ticketChannelEnum('channel').notNull(),
  category: text('category'),                     // 'billing' | 'call_quality' | 'account' | 'other'
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: ticketStatusEnum('status').notNull().default('open'),
  priority: ticketPriorityEnum('priority').notNull().default('normal'),
  // bot triage
  botSummary: text('bot_summary'),
  botSuggestedArticles: uuid('bot_suggested_articles').array(),
  // assignment
  assignedTo: text('assigned_to'),
  // contact
  userEmail: text('user_email'),
  userPhone: text('user_phone'),                  // BD format: 01XXXXXXXXX
  // whatsapp
  whatsappThreadId: text('whatsapp_thread_id'),
  // metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  // SLA
  firstResponseAt: timestamp('first_response_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('st_user_idx').on(t.userId),
  statusIdx: index('st_status_idx').on(t.status, t.priority),
}));

export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  sender: text('sender').notNull(),                // 'user' | 'agent' | 'bot' | 'system'
  senderId: text('sender_id'),                     // user id or agent id
  body: text('body').notNull(),
  // for bot messages
  aiModel: text('ai_model'),
  attachments: jsonb('attachments').$type<Array<{ url: string; type: string; name: string }>>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ticketIdx: index('tm_ticket_idx').on(t.ticketId, t.createdAt),
}));

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type HelpArticle = typeof helpArticles.$inferSelect;
```

## Seed: 20 BD-relevant FAQ articles

```ts
// apps/server/src/db/seed-support.ts
import { db } from '@community/db';
import { supportCategories, helpArticles } from '@community/db/schema/support';

const CATEGORIES = [
  { slug: 'getting_started', titleEn: 'Getting started', titleBn: 'শুরু করা', iconName: 'rocket-outline', sortOrder: 1 },
  { slug: 'billing', titleEn: 'Billing & payments', titleBn: 'পেমেন্ট ও বিল', iconName: 'card-outline', sortOrder: 2 },
  { slug: 'call_quality', titleEn: 'Call quality', titleBn: 'কলের মান', iconName: 'call-outline', sortOrder: 3 },
  { slug: 'account', titleEn: 'Account & login', titleBn: 'অ্যাকাউন্ট ও লগইন', iconName: 'person-outline', sortOrder: 4 },
  { slug: 'safety', titleEn: 'Safety & reports', titleBn: 'নিরাপত্তা', iconName: 'shield-checkmark-outline', sortOrder: 5 },
];

const ARTICLES = [
  // getting_started
  { cat: 'getting_started', slug: 'first-call', titleEn: 'How to make your first call', bodyEn: 'Tap **Start call** from the home screen. We\'ll match you with a learner at your level. Speak in English — your partner will help with mistakes gently.' },
  { cat: 'getting_started', slug: 'find-partner', titleEn: 'How partner matching works', bodyEn: 'We match by **English level**, **learning goals**, and **time zone**. Most matches in <30s.' },
  { cat: 'getting_started', slug: 'free-vs-pro', titleEn: 'Free vs Pro', bodyEn: '**Free**: 3 calls/day, max 5 min each. **Pro** (৳499/mo): unlimited, all features. Student plan: ৳299/mo with edu email.' },
  // billing
  { cat: 'billing', slug: 'pay-bkash', titleEn: 'How to pay with bKash', bodyEn: '1. Tap **Upgrade** in Settings\n2. Choose **bKash**\n3. Enter your 11-digit bKash number\n4. Confirm in bKash app\n5. Pro activates instantly' },
  { cat: 'billing', slug: 'pay-nagad', titleEn: 'How to pay with Nagad', bodyEn: 'Same as bKash. We support bKash, Nagad, Rocket, Visa, Mastercard, and all major BD banks via SSLCommerz.' },
  { cat: 'billing', slug: 'cancel-subscription', titleEn: 'How to cancel subscription', bodyEn: '**Settings → Subscription → Cancel subscription**. One tap, no survey. You keep access until your period ends. 7-day refund available.' },
  { cat: 'billing', slug: 'refund-policy', titleEn: 'Refund policy', bodyEn: '7 days, no questions asked. Tap **Request refund** in Settings → Subscription. Money back in 1-3 business days to original payment method.' },
  { cat: 'billing', slug: 'auto-renewal', titleEn: 'Will I be auto-charged?', bodyEn: 'Yes — Pro renews automatically. We send a reminder **3 days before** each charge. Toggle off in Settings.' },
  { cat: 'billing', slug: 'student-discount', titleEn: 'How to get student discount', bodyEn: 'Use a `.edu.bd` email when signing up. Discount auto-applies. We re-verify every 30 days.' },
  // call_quality
  { cat: 'call_quality', slug: 'echo-or-audio', titleEn: 'Echo or audio cuts out', bodyEn: '1. Use **earphones** (huge difference)\n2. Switch from WiFi to mobile data (or vice versa)\n3. Close other apps using audio\n4. Still bad? Report the call — we\'ll credit your account.' },
  { cat: 'call_quality', slug: 'partner-left', titleEn: 'Partner left mid-call', bodyEn: 'Tap **Bad call** on the post-call screen. If 3 users in 24h report the same person, they get a 1hr cooldown.' },
  { cat: 'call_quality', slug: 'no-english-partner', titleEn: 'Partner not speaking English', bodyEn: 'Report as **Bad call → No English**. They get a warning. After 3 reports = cooldown.' },
  // account
  { cat: 'account', slug: 'google-signin', titleEn: 'Sign in with Google', bodyEn: 'We use Google sign-in for security. Tap **Continue with Google** on the welcome screen.' },
  { cat: 'account', slug: 'change-name', titleEn: 'Change my display name', bodyEn: 'Settings → Profile → Edit name. Your call partners will see the new name immediately.' },
  { cat: 'account', slug: 'delete-account', titleEn: 'Delete my account', bodyEn: 'Settings → Account → Delete account. Permanent after 30 days. Refund for unused Pro time.' },
  // safety
  { cat: 'safety', slug: 'bad-call-button', titleEn: 'How to report a bad call', bodyEn: 'After every call, tap **Bad call**. Choose a reason (left suddenly, inappropriate, audio broken, no English). Helps us keep AceFluency safe.' },
  { cat: 'safety', slug: 'cooldown', titleEn: 'What is cooldown?', bodyEn: 'If 3 users report you in 24h, you get a 1hr cooldown. You can still use the app, just not take calls. Appeal in-app if it was a mistake.' },
  { cat: 'safety', slug: 'block-user', titleEn: 'How to block a user', bodyEn: 'Tap their name in call history → **Block**. They won\'t be matched with you again.' },
  { cat: 'safety', slug: 'inappropriate-content', titleEn: 'I saw inappropriate content', bodyEn: 'Report it. We review within 24h. Repeat offenders are banned permanently.' },
  { cat: 'safety', slug: 'harassment', titleEn: 'I was harassed', bodyEn: 'Report + block. Email **safety@acefluency.app** for urgent cases. We respond within 2 hours.' },
];

// seed
```

## Server: ORPC routers

```ts
// apps/server/src/routers/support.ts
import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../lib/orpc';
import { helpArticles, supportCategories, supportTickets, ticketMessages } from '@community/db/schema/support';
import { and, eq, ilike, or, sql } from 'drizzle-orm';

export const supportRouter = {
  // Public: list categories with article counts
  categories: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.supportCategories.findMany({
      orderBy: (c, { asc }) => asc(c.sortOrder),
    });
  }),

  // Public: list articles (auth-optional for SEO)
  articles: publicProcedure
    .input(z.object({ categorySlug: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let qb = ctx.db.query.helpArticles.findMany({
        where: input?.categorySlug
          ? (a, { eq, and }) => and(eq(a.categoryId, sql`(SELECT id FROM support_categories WHERE slug = ${input.categorySlug})`))
          : undefined,
        orderBy: (a, { desc }) => desc(a.publishedAt),
        limit: 50,
      });
      return qb;
    }),

  // Search articles (full-text-ish with ilike; upgrade to pg_trgm later)
  search: publicProcedure
    .input(z.object({ q: z.string().min(2).max(100) }))
    .query(async ({ ctx, input }) => {
      const term = `%${input.q.toLowerCase()}%`;
      return ctx.db.query.helpArticles.findMany({
        where: (a, { or, ilike }) => or(
          ilike(a.titleEn, term),
          ilike(a.bodyEn, term),
          ilike(a.tags, term),
        ),
        limit: 10,
      });
    }),

  // Open a ticket (from any channel)
  open: protectedProcedure
    .input(z.object({
      category: z.enum(['billing', 'call_quality', 'account', 'safety', 'other']).optional(),
      subject: z.string().min(5).max(200),
      body: z.string().min(10).max(5000),
      channel: z.enum(['in_app', 'whatsapp', 'email']).default('in_app'),
    }))
    .mutation(async ({ ctx, input }) => {
      const [ticket] = await ctx.db.insert(supportTickets).values({
        userId: ctx.session.user.id,
        channel: input.channel,
        category: input.category,
        subject: input.subject,
        body: input.body,
        status: 'open',
        priority: input.category === 'safety' ? 'high' : 'normal',
        userEmail: ctx.session.user.email,
      }).returning();

      // bot triage: summarize + suggest articles
      const { botSummary, suggested } = await triageTicket(input.subject, input.body);
      await ctx.db.update(supportTickets)
        .set({ botSummary, botSuggestedArticles: suggested })
        .where(eq(supportTickets.id, ticket.id));

      // if bot found an article match with high confidence, return it
      if (suggested.length > 0) {
        const top = await ctx.db.query.helpArticles.findFirst({
          where: eq(helpArticles.id, suggested[0]),
        });
        if (top) return { ticket, suggestedArticle: top, confidence: 'high' };
      }

      return { ticket, suggestedArticle: null, confidence: 'low' };
    }),

  // List user's tickets
  myTickets: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.supportTickets.findMany({
      where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: 20,
    });
  }),

  // Get ticket + messages
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.supportTickets.findFirst({
        where: (t, { and, eq }) => and(eq(t.id, input.id), eq(t.userId, ctx.session.user.id)),
      });
      if (!ticket) return null;
      const messages = await ctx.db.query.ticketMessages.findMany({
        where: (m, { eq }) => eq(m.ticketId, input.id),
        orderBy: (m, { asc }) => asc(m.createdAt),
      });
      return { ticket, messages };
    }),

  // Reply to ticket
  reply: protectedProcedure
    .input(z.object({ ticketId: z.string().uuid(), body: z.string().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.supportTickets.findFirst({
        where: (t, { and, eq }) => and(eq(t.id, input.ticketId), eq(t.userId, ctx.session.user.id)),
      });
      if (!ticket) throw new Error('Ticket not found');
      if (ticket.status === 'closed') throw new Error('Ticket closed');

      await ctx.db.insert(ticketMessages).values({
        ticketId: input.ticketId,
        sender: 'user',
        senderId: ctx.session.user.id,
        body: input.body,
      });

      await ctx.db.update(supportTickets)
        .set({ status: 'pending_support', updatedAt: new Date() })
        .where(eq(supportTickets.id, input.ticketId));

      return { ok: true };
    }),

  // Mark article helpful
  articleHelpful: publicProcedure
    .input(z.object({ id: z.string().uuid(), helpful: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(helpArticles)
        .set({ [input.helpful ? 'helpfulYes' : 'helpfulNo']: sql`${input.helpful ? helpArticles.helpfulYes : helpArticles.helpfulNo} + 1` })
        .where(eq(helpArticles.id, input.id));
      return { ok: true };
    }),
};

async function triageTicket(subject: string, body: string) {
  // use Vercel AI SDK to summarize + match
  // for now, simple keyword match — upgrade later
  const text = `${subject} ${body}`.toLowerCase();
  const keywordMap: Array<{ kw: string[]; cat: string }> = [
    { kw: ['pay', 'bkash', 'nagad', 'charge', 'money', 'refund', 'cancel sub', 'subscription'], cat: 'billing' },
    { kw: ['audio', 'echo', 'drop', 'cut', 'no sound', 'black screen'], cat: 'call_quality' },
    { kw: ['login', 'sign in', 'google', 'password', 'account'], cat: 'account' },
    { kw: ['harass', 'abuse', 'inappropriate', 'nsfw', 'safety'], cat: 'safety' },
  ];
  const cat = keywordMap.find((m) => m.kw.some((k) => text.includes(k)))?.cat ?? 'other';
  const suggested = await fetch(`/api/support/suggest?category=${cat}&q=${encodeURIComponent(text.slice(0, 200))}`);
  return { botSummary: `User issue: ${subject}`, suggested: suggested.length ? [suggested[0].id] : [] };
}
```

## Status page (public, no auth)

```ts
// apps/server/src/routes/status.ts
import { Hono } from 'hono';

export const statusRoute = new Hono().get('/api/status', async (c) => {
  // quick health checks
  const checks = await Promise.allSettled([
    checkDb(),
    checkLiveKit(),
    checkSSLCommerz(),
    checkWhatsApp(),
  ]);
  return c.json({
    overall: checks.every((r) => r.status === 'fulfilled') ? 'operational' : 'degraded',
    services: {
      database: checks[0].status === 'fulfilled' ? 'operational' : 'degraded',
      calls: checks[1].status === 'fulfilled' ? 'operational' : 'degraded',
      billing: checks[2].status === 'fulfilled' ? 'operational' : 'degraded',
      chat: checks[3].status === 'fulfilled' ? 'operational' : 'degraded',
    },
    lastIncident: lastIncident(),  // from cache
    updatedAt: new Date().toISOString(),
  });
});
```

`apps/web/src/app/status/page.tsx` — public status page with green/yellow/red dots + 90d incident log.

## WhatsApp bot (Meta Cloud API)

```ts
// apps/server/src/routes/whatsapp.ts
import { Hono } from 'hono';
import { env } from '@community/env/server';

export const whatsappRoute = new Hono()
  // Meta webhook verification
  .get('/webhook', (c) => {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');
    if (mode === 'subscribe' && token === env.WA_VERIFY_TOKEN) {
      return c.text(challenge);
    }
    return c.text('Forbidden', 403);
  })
  // Incoming message
  .post('/webhook', async (c) => {
    const body = await c.req.json();
    const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return c.text('OK', 200);

    const fromPhone = msg.from;  // 8801XXXXXXXXX
    const text = msg.text?.body ?? '';
    const waMessageId = msg.id;

    // find or create user by phone
    let user = await findUserByPhone(fromPhone);
    if (!user) {
      // create anonymous ticket; will link on next sign-in
      user = { id: `wa_${fromPhone}`, isAnon: true };
    }

    // bot triage
    const intent = await classifyIntent(text);  // 'billing' | 'call' | 'account' | 'human'
    if (intent === 'human') {
      // create ticket, notify support team
      await escalateToHuman(user, fromPhone, text);
      await sendWhatsAppMessage(fromPhone, 'একজন এজেন্ট শীঘ্রই যোগাযোগ করবেন। আপনার টিকেট আইডি: ' + ticketId);
    } else {
      // send relevant FAQ
      const articles = await findArticlesForIntent(intent);
      const list = articles.slice(0, 3).map((a) => `📖 ${a.titleEn}\nhttps://acefluency.app/help/${a.slug}`).join('\n\n');
      await sendWhatsAppMessage(fromPhone, `AceFluency সাহায্য:\n\n${list}\n\nআরও সাহায্য লাগলে "agent" লিখুন।`);
    }

    return c.text('OK', 200);
  });

async function sendWhatsAppMessage(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v18.0/${env.WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
}
```

BD-specific: Bangla support first, English fallback. Detect via message script detection.

## Mobile UI

`apps/native/app/(drawer)/help.tsx`:

```tsx
import { orpc } from '@/utils/orpc';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, Text, View, TextInput } from 'react-native';
import { useState } from 'react';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function HelpScreen() {
  const { theme } = useUnistyles();
  const categories = useQuery(orpc.support.categories.queryOptions());
  const [search, setSearch] = useState('');
  const search_ = useQuery({
    ...orpc.support.search.queryOptions({ q: search }),
    enabled: search.length >= 2,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 16, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>Help</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search help…"
          style={{
            marginTop: 16, padding: 12, borderRadius: 10,
            backgroundColor: theme.colors.muted, color: theme.colors.typography,
          }}
        />
      </View>

      {search.length >= 2 && search_.data ? (
        <FlatList
          data={search_.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/help/${item.slug}`)}
              style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600' }}>{item.titleEn}</Text>
              {item.titleBn && <Text style={{ fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 }}>{item.titleBn}</Text>}
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={categories.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/help/category/${item.slug}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
            >
              <Ionicons name={item.iconName as any} size={28} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.titleEn}</Text>
                {item.titleBn && <Text style={{ fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 }}>{item.titleBn}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => Linking.openURL('https://wa.me/8801XXXXXXXXX?text=Hi%20AceFluency')}
        style={{
          position: 'absolute', bottom: 24, left: 16, right: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: 14, borderRadius: 12, backgroundColor: '#25D366',
        }}
      >
        <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '600' }}>Chat on WhatsApp</Text>
      </Pressable>
    </View>
  );
}
```

## Env additions

```bash
# apps/server/.env
WA_PHONE_ID=your_meta_phone_id
WA_TOKEN=your_meta_token
WA_VERIFY_TOKEN=any_random_string
RESEND_API_KEY=re_xxx
SUPPORT_EMAIL=support@acefluency.app
```

## Rollout

1. **Day 1:** schema migration. Seed 20 articles. Server routers. Status page route.
2. **Day 2:** mobile help screen + article view. WhatsApp webhook (sandbox first).
3. **Day 2.5:** Resend email template. Admin notification to Slack #support.
4. **Day 3:** 100% rollout. Monitor:
   - First response time (target <2hr)
   - FAQ deflection rate (target 60%)
   - WhatsApp bot → human handoff rate (target <20%)
   - Ticket volume by category

## Risks

| Risk | Mitigation |
|---|---|
| WhatsApp Meta review delays | Submit template messages in week 1. Use sandbox until approved. |
| AI bot gives wrong answer | Always show "Was this helpful?" + "Chat with human" button. |
| Status page exposes internal details | Public: just operational/degraded per service. Internal: full metrics in admin. |
| Support team overwhelmed | Auto-rotate assignment. Burnout signal: tickets aging >12h. |
| Bangla translations missing | Ship EN first. Mark `titleBn: null` to hide Bangla toggle. Translate week 2. |
| Free tier abuse (open 100 tickets) | Rate limit: 3 tickets/day/user, 10/week. |

## Success metrics (30d)

- First response time <2hr (was 3-5d)
- "No support" / "no reply" reviews ↓70%
- FAQ deflection rate ≥60% (visit article → don't open ticket)
- WhatsApp bot resolution ≥40%
- Ticket volume: predict ~5% of MAU
- Status page uptime: 99.9%

## Companion fixes (same month)

- **F4.2 WhatsApp bot** — built in
- **F4.3 24h SLA dashboard** — public status page + admin stats
- **F4.4 Callback** — wait, BD users don't like callbacks. Replaced by WhatsApp.
- **F4.5 Status board** — built in (public status page)

All 5 F4 fixes = 1 PR, 3 days. Support = moat in BD market.

## Admin dashboard (web)

`apps/web/src/app/admin/support/page.tsx`:
- Open tickets queue (sortable by SLA age)
- Per-agent workload
- Top categories this week
- Article "was this helpful?" analytics
- Bot triage accuracy
- Bangla vs English ticket ratio

---

*Spec complete. Ready for eng + support lead review.*
