# F1.1 Reconnect UI — Engineering Spec

**Status:** Ready to ship
**Effort:** 1 sprint (5 days)
**ICE:** 9 (impact 10, confidence 9, ease 9)
**Owner:** Mobile eng lead
**Metric:** Drop-related 1-star reviews ↓50% in 30 days

## Problem

Network drops = #1 user pain. Current code ([call/[room].tsx:128](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/app/call/%5Broom%5D.tsx#L128)) calls `router.back()` on disconnect = silent failure = user rage = 1-star review.

## LiveKit API (verified against `@livekit/react-native@2.11.0` + `livekit-client@2.13.0`)

```ts
import { RoomEvent, ConnectionState } from 'livekit-client';

room.on(RoomEvent.ConnectionStateChanged, (state) => { ... });
room.on(RoomEvent.Reconnecting, () => { ... });
room.on(RoomEvent.Reconnected, () => { ... });
room.on(RoomEvent.Disconnected, (reason) => { ... });
```

States: `Disconnected | Connecting | Connected | Reconnecting | SignalReconnecting`.

`LiveKitRoom` props (use these, not raw events where possible):
- `onDisconnected(reason)` — final, can't recover
- `onError(error)` — fatal
- `connectOptions: { autoSubscribe, maxRetries: 3, peerConnectionTimeout: 15000 }`

The library auto-reconnects up to 3× with exponential backoff. **We just need to show it.**

## UX States

| State | UI | User sees | Backend |
|---|---|---|---|
| `Connected` | Normal call | Video + audio | n/a |
| `Reconnecting` | **NEW: full-screen banner** | "Reconnecting… (3s)" + spinner + tap-to-cancel | emit `call.reconnect_start` |
| `SignalReconnecting` (signal lost, room alive) | **NEW: amber toast** | "Reconnecting signal…" | emit `call.signal_drop` |
| `Reconnected` | **NEW: green toast 3s** | "Back online ✓" + duration | emit `call.reconnect_ok` with duration_ms |
| `Disconnected(reason)` | **NEW: reason screen** | "Call ended: [reason]. Rejoin?" + button | emit `call.drop` with reason |

Reconnect counter on banner: `attempt 1/3`, `attempt 2/3`, `attempt 3/3`.

After 3 fails → reason screen with **"Rejoin call"** button (calls `room.connect()` again).

## Code Changes

### 1. New component: `ReconnectOverlay.tsx`

```tsx
// apps/native/components/reconnect-overlay.tsx
import { ConnectionState } from 'livekit-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  state: ConnectionState;
  attempt: number;        // 0..3
  reason?: string;
  onRejoin: () => void;
  onCancel: () => void;
};

export function ReconnectOverlay({ state, attempt, reason, onRejoin, onCancel }: Props) {
  const { theme } = useUnistyles();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state !== ConnectionState.Reconnecting) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  if (state === ConnectionState.Connected) return null;

  if (state === ConnectionState.Reconnecting) {
    return (
      <View style={styles.banner}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.bannerText}>
          Reconnecting… ({elapsed}s, attempt {attempt}/3)
        </Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // Disconnected with reason
  return (
    <View style={styles.fullscreen}>
      <Ionicons name="cloud-offline" size={64} color={theme.colors.destructive} />
      <Text style={styles.title}>Call ended</Text>
      <Text style={styles.reason}>{reason ?? 'Connection lost'}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.rejoin} onPress={onRejoin}>
          <Text style={styles.rejoinText}>Rejoin call</Text>
        </Pressable>
        <Pressable style={styles.exit} onPress={onCancel}>
          <Text style={styles.exitText}>Leave</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingTop: 60, // safe area
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 100,
  },
  bannerText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  cancelText: { color: '#fff', fontSize: 14, textDecorationLine: 'underline' },
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    zIndex: 200,
  },
  title: { color: theme.colors.typography, fontSize: 22, fontWeight: '700' },
  reason: { color: theme.colors.mutedForeground, fontSize: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  rejoin: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  rejoinText: { color: theme.colors.primaryForeground, fontSize: 15, fontWeight: '600' },
  exit: { backgroundColor: 'transparent', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border },
  exitText: { color: theme.colors.typography, fontSize: 15 },
}));
```

### 2. Wire up in `call/[room].tsx`

Replace [lines 122-141](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/app/call/%5Broom%5D.tsx#L122-L141) and [lines 143-190](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/app/call/%5Broom%5D.tsx#L143-L190):

```tsx
import { RoomEvent, ConnectionState, DisconnectReason } from 'livekit-client';
import { useRef, useState } from 'react';
import { ReconnectOverlay } from '@/components/reconnect-overlay';
import { trackCallEvent } from '@/lib/call-telemetry';

function RoomView({ roomName }: { roomName: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const [connState, setConnState] = useState(ConnectionState.Connected);
  const [attempt, setAttempt] = useState(0);
  const [dropReason, setDropReason] = useState<string>();
  const rejoinStart = useRef<number>(0);

  useEffect(() => {
    const onState = (s: ConnectionState) => {
      if (s === ConnectionState.Reconnecting) {
        rejoinStart.current = Date.now();
        setAttempt((a) => a + 1);
        trackCallEvent('call.reconnect_start', { room: roomName });
      } else if (s === ConnectionState.Connected && connState === ConnectionState.Reconnecting) {
        const dur = Date.now() - rejoinStart.current;
        trackCallEvent('call.reconnect_ok', { room: roomName, duration_ms: dur });
        setAttempt(0);
      }
      setConnState(s);
    };
    const onDisconnected = (reason?: DisconnectReason) => {
      trackCallEvent('call.drop', { room: roomName, reason: reason ?? 'unknown' });
      setDropReason(humanizeReason(reason));
    };
    room.on(RoomEvent.ConnectionStateChanged, onState);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onState);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, roomName, connState]);

  const rejoin = async () => {
    setDropReason(undefined);
    await room.connect(env.EXPO_PUBLIC_LIVEKIT_URL!, tokenQuery.data!.token);
  };

  return (
    <View style={styles.roomRoot}>
      {/* existing UI */}
      <ControlsBar />

      <ReconnectOverlay
        state={connState}
        attempt={attempt}
        reason={dropReason}
        onRejoin={rejoin}
        onCancel={() => router.back()}
      />
    </View>
  );
}

function humanizeReason(r?: DisconnectReason): string {
  switch (r) {
    case DisconnectReason.CLIENT_INITIATED: return 'You left the call';
    case DisconnectReason.DUPLICATE_IDENTITY: return 'Account signed in elsewhere';
    case DisconnectReason.SERVER_SHUTDOWN: return 'Server restarting';
    case DisconnectReason.PARTICIPANT_REMOVED: return 'Removed by host';
    case DisconnectReason.ROOM_DELETED: return 'Room closed';
    case DisconnectReason.STATE_MISMATCH: return 'Connection error';
    case DisconnectReason.JOIN_FAILURE: return 'Failed to join';
    case DisconnectReason.MIGRATION: return 'Server moved';
    case DisconnectReason.SIGNAL_CLOSE: return 'Network lost';
    default: return 'Connection lost';
  }
}
```

Replace the `<LiveKitRoom>` block:

```tsx
<LiveKitRoom
  audio
  video
  connect
  serverUrl={env.EXPO_PUBLIC_LIVEKIT_URL}
  token={tokenQuery.data.token}
  options={{
    adaptiveStream: { pixelDensity: 'screen' },
    dynacast: true,
  }}
  connectOptions={{
    autoSubscribe: true,
    maxRetries: 3,
    peerConnectionTimeout: 15_000,
  }}
  onError={(err) => trackCallEvent('call.error', { room: roomName, message: err.message })}
>
  <RoomView roomName={roomName} />
</LiveKitRoom>
```

### 3. Telemetry: `lib/call-telemetry.ts`

```ts
// apps/native/lib/call-telemetry.ts
import { orpc } from '@/utils/orpc';

type Event =
  | 'call.reconnect_start'
  | 'call.reconnect_ok'
  | 'call.signal_drop'
  | 'call.drop'
  | 'call.error'
  | 'call.rejoin';

export async function trackCallEvent(event: Event, props: Record<string, unknown>) {
  // fire and forget
  orpc.telemetry.event
    .mutate({ event, props, ts: Date.now() })
    .catch(() => undefined);
}
```

### 4. Server endpoint: `apps/server/src/routers/telemetry.ts`

```ts
import { z } from 'zod';
import { protectedProcedure } from '../lib/orpc';

export const telemetryRouter = {
  event: protectedProcedure
    .input(z.object({
      event: z.string().max(64),
      props: z.record(z.string(), z.unknown()),
      ts: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(callEvents).values({
        userId: ctx.session.user.id,
        event: input.event,
        props: input.props,
        clientTs: new Date(input.ts),
        serverTs: new Date(),
      });
    }),
};
```

### 5. Schema: `packages/db/src/schema/call-events.ts`

```ts
import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const callEvents = pgTable('call_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  props: jsonb('props').$type<Record<string, unknown>>().notNull(),
  clientTs: timestamp('client_ts', { withTimezone: true }).notNull(),
  serverTs: timestamp('server_ts', { withTimezone: true }).notNull().defaultNow(),
});

export type CallEvent = typeof callEvents.$inferSelect;
```

## Rollout

1. **Day 1-2:** ship `ReconnectOverlay` + state wiring (no telemetry). Internal dogfood.
2. **Day 3:** add telemetry endpoint + schema. Run migration.
3. **Day 4:** enable for 10% of users via feature flag (Expo config or ORPC check).
4. **Day 5:** 100% rollout. Monitor `call.reconnect_ok` rate + `call.drop` reason distribution.
5. **Day 14:** measure 1-star review drop. Report.

## Risks

| Risk | Mitigation |
|---|---|
| Token expires mid-reconnect (10 min default) | Server: extend to 60 min for active calls. Client: refresh on `signal.reconnecting`. |
| `RoomEvent.Disconnected` fires even on user-initiated leave | Guard with `DisconnectReason.CLIENT_INITIATED` — don't show "rejoin" screen. |
| Reconnect succeeds but user already pressed Cancel | Track intent in `useRef`; on success, no-op if cancelled. |
| Token endpoint down → reconnect fails | Cache last token, attempt with cached first, refresh on next reconnect. |

## Success Metrics (30 days)

- Drop-related 1-star reviews ↓50%
- `call.reconnect_ok` rate ≥70% (of `call.reconnect_start` events)
- `call.drop` → `call.rejoin` rate ≥20%
- Mean `call.reconnect_ok` duration <8s

## Companion fixes (this week, same PR)

- **F1.3 Pre-flight check:** on call screen mount, ping `EXPO_PUBLIC_LIVEKIT_URL` wss, show "Poor connection" warning if >2s RTT.
- **F1.4 Drop telemetry:** the events above (built-in).
- **F1.5 Bad-call refund:** `call.drop` event with `reason: USER_REPORTED_BAD_CALL` → trigger refund.

---

*Spec complete. Ready for eng review.*
