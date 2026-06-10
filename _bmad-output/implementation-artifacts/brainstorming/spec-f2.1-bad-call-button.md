# F2.1 "Bad Call?" — Engineering Spec

**Status:** Ready to ship
**Effort:** 2.5 days
**ICE:** 8 (impact 9, confidence 8, ease 8)
**Owner:** Trust & safety
**Metric:** Suspension-related churn ↓60% in 30d; "cut call" reviews ↓50%

## Problem

Current algo: cut call mid-conversation → 2-day account ban. Algo punishes self-defense. Users rage → 1-star "unfair ban" reviews → uninstall.

## Solution

Post-disconnect: "Was this call bad?" → 1-tap flag (with reason). 3 flags/24h = 1hr cooldown (not 2-day ban). 1st-time user grace = 3 free flags before any cooldown. All bans show reason + in-app appeal.

## Flow

```
Call ends
    ↓
"Did this call feel…"
  [ ⚠️ Bad call ] [ 👍 Was fine ]
    ↓ (if bad)
"What went wrong?"
  [ Partner left suddenly ]
  [ No English / hostile ]
  [ Inappropriate content ]
  [ Echo / audio broken ]
    ↓
(Optional) "Tell us more" → textarea, 200 chars
    ↓
[ Submit report ] [ Cancel ]
    ↓
"Thanks for reporting. We'll review."
```

If partner reached 3 flags/24h:
- Partner gets 1hr cooldown (next call attempt shows "1hr cooldown" with countdown)
- Reporter sees nothing changed (privacy)
- If partner appeals → 24h SLA review

## Schema

```ts
// packages/db/src/schema/moderation.ts
import { pgTable, text, timestamp, uuid, pgEnum, index } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { integer } from 'drizzle-orm/pg-core';

export const reportReasonEnum = pgEnum('report_reason', [
  'partner_left',     // "left suddenly" — system-detected
  'no_english',       // not speaking English
  'inappropriate',    // toxic/abuse/NSFW
  'audio_broken',     // echo / black screen / not their fault
  'other',
]);

export const callReports = pgTable('call_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  // reporter + reported user
  reporterId: text('reporter_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  reportedId: text('reported_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  // optional room/session ref
  callId: text('call_id').notNull(),         // LiveKit room name
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
  durationSec: integer('duration_sec').notNull(),
  // why
  reason: reportReasonEnum('reason').notNull(),
  notes: text('notes'),                       // optional, ≤200 chars enforced in app
  // system signal at time of call
  metadata: text('metadata'),                 // JSON: { packetsLost, audioDrop, networkType }
  // resolution
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by'),            // admin user id
  resolution: text('resolution'),             // 'warned' | 'cooldown' | 'banned' | 'dismissed'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  reportedIdx: index('cr_reported_idx').on(t.reportedId, t.createdAt),
  reporterIdx: index('cr_reporter_idx').on(t.reporterId, t.createdAt),
}));

export const userSanctions = pgTable('user_sanctions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),              // 'cooldown' | 'ban' | 'warning'
  reason: text('reason').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  active: integer('active').notNull().default(1),  // soft delete on appeal-grant
  appealId: uuid('appeal_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userActiveIdx: index('us_user_active_idx').on(t.userId, t.active, t.expiresAt),
}));

export const appeals = pgTable('appeals', {
  id: uuid('id').primaryKey().defaultRandom(),
  sanctionId: uuid('sanction_id').notNull().references(() => userSanctions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),          // user's explanation, ≤500 chars
  status: text('status').notNull().default('pending'), // 'pending' | 'granted' | 'denied'
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewerNotes: text('reviewer_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CallReport = typeof callReports.$inferSelect;
export type NewCallReport = typeof callReports.$inferInsert;
export type UserSanction = typeof userSanctions.$inferSelect;
export type Appeal = typeof appeals.$inferSelect;
```

## Server: ORPC router + decision engine

```ts
// apps/server/src/routers/moderation.ts
import { z } from 'zod';
import { protectedProcedure } from '../lib/orpc';
import { callReports, userSanctions, appeals } from '@community/db/schema/moderation';
import { and, eq, gte, sql, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

const COOLDOWN_HOURS = 1;
const FLAGS_FOR_COOLDOWN = 3;
const FLAGS_WINDOW_HOURS = 24;
const APPEAL_SLA_HOURS = 24;

export const moderationRouter = {
  // Called from mobile on call end
  report: protectedProcedure
    .input(z.object({
      reportedId: z.string(),
      callId: z.string(),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime(),
      durationSec: z.number().int().min(0).max(86_400),
      reason: z.enum(['partner_left', 'no_english', 'inappropriate', 'audio_broken', 'other']),
      notes: z.string().max(200).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const reporterId = ctx.session.user.id;

      // 1. can't self-report
      if (reporterId === input.reportedId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot report self' });
      }

      // 2. dedupe: 1 report per (reporter, callId)
      const existing = await ctx.db.query.callReports.findFirst({
        where: (r, { and, eq }) =>
          and(eq(r.reporterId, reporterId), eq(r.callId, input.callId)),
      });
      if (existing) return { ok: true, alreadyReported: true };

      // 3. insert report
      await ctx.db.insert(callReports).values({
        reporterId,
        reportedId: input.reportedId,
        callId: input.callId,
        startedAt: new Date(input.startedAt),
        endedAt: new Date(input.endedAt),
        durationSec: input.durationSec,
        reason: input.reason,
        notes: input.notes,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });

      // 4. count reports in last 24h against this user
      const cutoff = new Date(Date.now() - FLAGS_WINDOW_HOURS * 3600_000);
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(callReports)
        .where(
          and(
            eq(callReports.reportedId, input.reportedId),
            gte(callReports.createdAt, cutoff),
          ),
        );

      // 5. grace: 1st-time user (never sanctioned) gets 3 free flags
      const priorSanctions = await ctx.db.query.userSanctions.findFirst({
        where: (s, { eq }) => eq(s.userId, input.reportedId),
      });
      const isFirstTime = !priorSanctions;
      const threshold = isFirstTime ? FLAGS_FOR_COOLDOWN + 2 : FLAGS_FOR_COOLDOWN;

      if (count >= threshold) {
        // 6. issue cooldown
        const expiresAt = new Date(Date.now() + COOLDOWN_HOURS * 3600_000);
        const [sanction] = await ctx.db.insert(userSanctions).values({
          userId: input.reportedId,
          type: 'cooldown',
          reason: `${count} reports in ${FLAGS_WINDOW_HOURS}h: ${input.reason}`,
          expiresAt,
        }).returning();

        // 7. dismiss old reports (cycle reset)
        await ctx.db.update(callReports)
          .set({ resolvedAt: new Date(), resolution: 'cooldown' })
          .where(
            and(
              eq(callReports.reportedId, input.reportedId),
              gte(callReports.createdAt, cutoff),
            ),
          );

        return { ok: true, action: 'cooldown', expiresAt: expiresAt.toISOString() };
      }

      return { ok: true, action: 'flagged', currentFlags: count };
    }),

  // Check if current user is in cooldown
  status: protectedProcedure.query(async ({ ctx }) => {
    const sanction = await ctx.db.query.userSanctions.findFirst({
      where: (s, { and, eq, gt }) =>
        and(
          eq(s.userId, ctx.session.user.id),
          eq(s.active, 1),
          eq(s.type, 'cooldown'),
          gt(s.expiresAt, new Date()),
        ),
      orderBy: (s, { desc }) => desc(s.createdAt),
    });
    if (!sanction) return { inCooldown: false };

    return {
      inCooldown: true,
      reason: sanction.reason,
      expiresAt: sanction.expiresAt!.toISOString(),
      remainingMs: sanction.expiresAt!.getTime() - Date.now(),
    };
  }),

  // User appeals a sanction
  appeal: protectedProcedure
    .input(z.object({
      sanctionId: z.string().uuid(),
      message: z.string().min(20).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const sanction = await ctx.db.query.userSanctions.findFirst({
        where: (s, { and, eq }) =>
          and(eq(s.id, input.sanctionId), eq(s.userId, ctx.session.user.id)),
      });
      if (!sanction) throw new TRPCError({ code: 'NOT_FOUND' });
      if (!sanction.active) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sanction not active' });

      const [appeal] = await ctx.db.insert(appeals).values({
        sanctionId: sanction.id,
        userId: ctx.session.user.id,
        message: input.message,
      }).returning();

      await ctx.db.update(userSanctions)
        .set({ appealId: appeal.id })
        .where(eq(userSanctions.id, sanction.id));

      return { ok: true, appealId: appeal.id, slaHours: APPEAL_SLA_HOURS };
    }),

  // List user's own sanctions (for in-app screen)
  mySanctions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.userSanctions.findMany({
      where: (s, { eq }) => eq(s.userId, ctx.session.user.id),
      orderBy: (s, { desc }) => desc(s.createdAt),
      limit: 20,
    });
  }),
};
```

## Webhook: enforce cooldown on call join

In [apps/native/app/call/[room].tsx](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/app/call/%5Broom%5D.tsx) the LiveKit token endpoint must check sanctions first. Update `livekit.token` router:

```ts
// apps/server/src/routers/livekit.ts (add to existing token procedure)
const sanction = await ctx.db.query.userSanctions.findFirst({
  where: (s, { and, eq, gt }) =>
    and(
      eq(s.userId, ctx.session.user.id),
      eq(s.active, 1),
      gt(s.expiresAt, new Date()),
    ),
});
if (sanction) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'cooldown_active',
    cause: { reason: sanction.reason, expiresAt: sanction.expiresAt },
  });
}
```

## Mobile UI: post-call sheet

New component `apps/native/components/post-call-sheet.tsx`:

```tsx
import { orpc } from '@/utils/orpc';
import { useMutation } from '@tanstack/react-query';
import { BottomSheet } from '@gorhom/bottom-sheet';
import { Pressable, Text, View, TextInput } from 'react-native';
import { useState } from 'react';
import { useUnistyles } from 'react-native-unistyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  partnerId: string;
  callId: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  metadata?: Record<string, unknown>;
};

const REASONS = [
  { value: 'partner_left', label: '👋 Left suddenly', desc: 'Hung up mid-call' },
  { value: 'no_english', label: '🚫 No English', desc: 'Refused to speak English' },
  { value: 'inappropriate', label: '⚠️ Inappropriate', desc: 'Abuse, NSFW, or toxic' },
  { value: 'audio_broken', label: '🔊 Audio broken', desc: 'Echo or not their fault' },
  { value: 'other', label: '⋯ Other', desc: 'Something else' },
] as const;

export function PostCallSheet({ visible, onClose, partnerId, callId, startedAt, endedAt, durationSec, metadata }: Props) {
  const { theme } = useUnistyles();
  const [step, setStep] = useState<'ask' | 'reason' | 'done'>('ask');
  const [reason, setReason] = useState<typeof REASONS[number]['value'] | null>(null);
  const [notes, setNotes] = useState('');

  const report = useMutation(orpc.moderation.report.mutationOptions());

  const submit = async () => {
    if (!reason) return;
    await report.mutateAsync({
      reportedId: partnerId,
      callId,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSec,
      reason,
      notes: notes || undefined,
      metadata,
    });
    setStep('done');
    setTimeout(onClose, 2000);
  };

  return (
    <BottomSheet snapPoints={['40%', '70%']} index={visible ? 0 : -1} onClose={onClose}>
      <View style={{ padding: 20 }}>
        {step === 'ask' && (
          <>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>How was your call?</Text>
            <Text style={{ color: theme.colors.mutedForeground, marginTop: 4 }}>
              Your feedback helps us keep AceFluency safe.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <Pressable
                onPress={() => { onClose(); }}
                style={{ flex: 1, padding: 16, backgroundColor: theme.colors.primary, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>👍 Was fine</Text>
              </Pressable>
              <Pressable
                onPress={() => setStep('reason')}
                style={{ flex: 1, padding: 16, backgroundColor: theme.colors.destructive, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: theme.colors.destructiveForeground, fontWeight: '600' }}>⚠️ Bad call</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'reason' && (
          <>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>What went wrong?</Text>
            <View style={{ gap: 8, marginTop: 16 }}>
              {REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  onPress={() => setReason(r.value)}
                  style={{
                    padding: 14, borderRadius: 10,
                    borderWidth: 2,
                    borderColor: reason === r.value ? theme.colors.primary : theme.colors.border,
                    backgroundColor: reason === r.value ? theme.colors.primary + '15' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>{r.label}</Text>
                  <Text style={{ fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 }}>{r.desc}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Tell us more (optional, ≤200 chars)"
              maxLength={200}
              multiline
              style={{
                marginTop: 12, padding: 12, borderRadius: 10,
                borderWidth: 1, borderColor: theme.colors.border,
                minHeight: 60, color: theme.colors.typography,
              }}
            />
            <Pressable
              onPress={submit}
              disabled={!reason || report.isPending}
              style={{
                marginTop: 16, padding: 14, borderRadius: 10,
                backgroundColor: reason ? theme.colors.primary : theme.colors.muted,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
                {report.isPending ? 'Submitting…' : 'Submit report'}
              </Text>
            </Pressable>
          </>
        )}

        {step === 'done' && (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Text style={{ fontSize: 48 }}>✓</Text>
            <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 12 }}>Thanks for reporting</Text>
            <Text style={{ color: theme.colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>
              We'll review and take action within 24 hours.
            </Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
```

Wire up in [call/[room].tsx](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/app/call/%5Broom%5D.tsx) — open sheet on `RoomEvent.Disconnected` (skip if `CLIENT_INITIATED`).

## Cooldown screen (shown when token endpoint throws FORBIDDEN)

```tsx
// apps/native/app/(cooldown).tsx
import { orpc } from '@/utils/orpc';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text, TextInput, View, Pressable } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { useState } from 'react';
import { router } from 'expo-router';

export default function CooldownScreen() {
  const { theme } = useUnistyles();
  const status = useQuery(orpc.moderation.status.queryOptions(undefined, { refetchInterval: 30_000 }));
  const appeals = useQuery(orpc.moderation.mySanctions.queryOptions());
  const appeal = useMutation(orpc.moderation.appeal.mutationOptions());
  const [showAppeal, setShowAppeal] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  if (!status.data?.inCooldown) {
    setTimeout(() => router.replace('/home'), 100);
    return null;
  }

  const remaining = status.data.remainingMs;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
      <Text style={{ fontSize: 64, textAlign: 'center' }}>⏸️</Text>
      <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 12 }}>
        Quick break
      </Text>
      <Text style={{ color: theme.colors.mutedForeground, textAlign: 'center', marginTop: 8 }}>
        We'll let you back in {minutes}m {seconds}s.
      </Text>
      <Text style={{ color: theme.colors.mutedForeground, textAlign: 'center', marginTop: 4, fontSize: 13 }}>
        Reason: {status.data.reason}
      </Text>

      <Pressable
        onPress={() => setShowAppeal(appeals.data?.[0]?.id ?? null)}
        style={{ marginTop: 24, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' }}
      >
        <Text style={{ color: theme.colors.typography, fontWeight: '600' }}>This was a mistake — appeal</Text>
      </Pressable>

      {showAppeal && (
        <View style={{ marginTop: 16, padding: 16, backgroundColor: theme.colors.muted, borderRadius: 10 }}>
          <Text style={{ fontWeight: '600' }}>Tell us what happened</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="At least 20 characters"
            maxLength={500}
            multiline
            style={{ marginTop: 8, padding: 12, borderRadius: 8, minHeight: 100, backgroundColor: theme.colors.background, color: theme.colors.typography }}
          />
          <Pressable
            onPress={async () => {
              await appeal.mutateAsync({ sanctionId: showAppeal, message });
              setShowAppeal(null);
              setMessage('');
            }}
            disabled={message.length < 20 || appeal.isPending}
            style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: message.length >= 20 ? theme.colors.primary : theme.colors.muted, alignItems: 'center' }}
          >
            <Text style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
              {appeal.isPending ? 'Sending…' : 'Submit appeal'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
```

## Admin queue (web app, trust & safety team)

`apps/web/src/app/admin/appeals/page.tsx` — list pending appeals, see call metadata + reports timeline, grant/deny in 1 click.

## Rollout

1. **Day 1:** schema migration. Router. Webhook in livekit token. Unit test threshold logic.
2. **Day 2:** mobile post-call sheet + cooldown screen. Internal dogfood.
3. **Day 2.5:** admin queue for appeals. Connect to support team Slack.
4. **Day 3:** 10% prod. Compare suspension-related reviews vs control. Tune threshold.
5. **Day 4:** 100%. Monitor:
   - Report volume (target: 5-10% of calls)
   - "Inappropriate" rate (target: <1% of calls)
   - Appeal grant rate (target: <30% — proves cooldown is fair)
   - Cooldown screen view → return rate (target: ≥40%)

## Risks

| Risk | Mitigation |
|---|---|
| Coordinated mass-flag attack on a user | Rate-limit reports: 1/call, 10/day/reporter. IP-based dedup. |
| Bad actors weaponize "inappropriate" reports | Reason weighted: 'inappropriate' = 1.5x, 'audio_broken' = 0.5x. Threshold counts weighted. |
| User rage-bans opponents in legit calls | 1st-time grace = +2 extra flags. Prior-sanctioned users = stricter threshold. |
| Cooldown too short → no deterrent | Start 1hr. If abuse rate doesn't drop, tune to 6hr. Telemetry-driven. |
| Appeal SLA missed | Auto-grant appeal if not reviewed in 24h (with audit log). Better than indefinite wait. |
| Existing 2-day-ban users stranded | Migration script: convert active bans → cooldowns. Email: "Your account is back, new system in place." |

## Success metrics (30d)

- Suspension-related churn ↓60%
- "Cut call" / "unfair ban" reviews ↓50%
- Report rate: 5-10% of calls (signals engagement)
- Appeal grant rate: <30% (proves fairness)
- Cooldown → return rate: ≥40% (proves deterrence works)
- Mean time-to-appeal-decision: <18h

## Companion fixes (same PR or next)

- **F2.2 3-strike grace** — already built in (1st-time = +2 flags)
- **F2.3 Show reason** — `user_sanctions.reason` displayed on cooldown screen
- **F2.4 In-app appeal** — built in
- **F2.5 Replace timeout-based ban** — REMOVED (algo now flag-based, not timeout-based)

All 5 F2 fixes = 1 PR, 2.5 days. Net: trust restoration, not just feature.

---

*Spec complete. Ready for eng + T&S review.*
