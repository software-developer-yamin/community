# 0005. LiveKit for realtime voice, which makes a custom native dev client mandatory

**Status:** Accepted
**Date:** 2026-10-11
**Evidence:** pnpm-workspace.yaml, packages/api/src/routers/livekit.ts, apps/native/app.json, docker/livekit/docker-compose.yml, apps/native/eas.json, apps/server/src/index.ts

## Context

The product is voice. `GLOSSARY.md` records a Call as "one live 1:1 voice conversation"
hosted in a LiveKit room, and the whole matching loop depends on a learner reaching a room
within a p95 of 45 seconds. That makes reconnection a first-class case rather than an edge
case, and it rules out a transport where reconnect is "re-establish a connection" instead of
"resume a session." The native side compounds this: `apps/native/app/call/[room].tsx` calls
`AudioSession.startAudioSession()` and handles reconnection with a 30 s
`RECONNECTION_TIMEOUT_S`, which is media-layer behaviour, not HTTP behaviour.

## Decision

Realtime audio runs over **LiveKit**. The client stack is `livekit-client: ^2.13.0`,
`@livekit/react-native: ^2.11.0`, and `@livekit/react-native-webrtc: ^144.1.0`; the server
mints tokens with `livekit-server-sdk` via a `RoomServiceClient` in
`packages/api/src/routers/livekit.ts`, issuing 5-minute `AccessToken`s scoped to a single
room name (`call-{matchId}`). Room lifecycle is closed-loop: `apps/server/src/index.ts`
runs a `WebhookReceiver` on `/livekit/webhook` and writes `callRecord` rows on
`room.finished`. Local development runs a self-hosted server from
`docker/livekit/docker-compose.yml` — `livekit/livekit-server` plus `redis:7-alpine`,
reachable through `pnpm livekit:up`. The consequence is accepted rather than worked around:
`@livekit/react-native-webrtc` is a native module, so `apps/native/app.json` registers both
`@livekit/react-native-expo-plugin` and `@config-plugins/react-native-webrtc` as config
plugins, declares camera and microphone usage strings plus `voip`/`audio` background modes
on iOS and a thirteen-permission list on Android, and **Expo Go cannot run this app**. Builds
go through `expo-dev-client`, with `apps/native/eas.json` declaring
`developmentClient: true` and pinning the Android debug variant explicitly.

## Rationale

LiveKit supplies the thing the product actually needs — resumable sessions over an ICE
restart, which `GLOSSARY.md` names as the Reconnection contract ("a 1s blip resumes
invisibly") — without the team operating media infrastructure. The self-hosted compose file
is the evidence that they chose self-hosting over LiveKit Cloud for at least local and
single-node deployments: `docker/livekit/livekit.yaml` ships real keys, a port range, and a
commented-out TURN block. **Inference:** the cost of the WebRTC dependency being felt
full-force is visible in `apps/native/app.json` — thirteen Android permissions, two
background modes, two config plugins, and a dev-client-only build path — and no repository
file evaluates the LiveKit Cloud alternative.

## Consequences

**Accepts:**
- Reconnection is a transport feature, so `callEndReasonEnum` can distinguish
  `connection_lost` from `user_ended` and the "victim vs aggressor" rule in `GLOSSARY.md`
  has a reliable signal.
- One SDK family covers client, server, and webhook, so room state is observable from the
  same API the app calls (`listRooms`, `createRoom`, `closeRoom` in the livekit router).
- Rooms are named by match id and never reused, so a stale client cannot silently rejoin
  someone else's conversation.
- Local development needs no cloud account: `pnpm livekit:up` is the whole setup.

**Costs:**
- Expo Go is permanently off the table. Every developer and every device needs a built
  binary, and `apps/native/eas.json` pins the Android debug variant (`:app:assembleDebug`)
  because the default does not suit the WeChat/communication audio session.
- The native permission surface is large and permanent; `app.json` requests
  `CAMERA`, `RECORD_AUDIO`, `BLUETOOTH_CONNECT`, and five foreground-service permissions up
  front.
- Self-hosting a single LiveKit node means no multi-region edge. `livekit.yaml` sets
  `use_external_ip: false` and TURN is commented out, which will not survive a hostile
  network — and the product's users are explicitly on unstable South Asian mobile networks.
- `livekit-server-sdk` appears at `^2.15.4` in `apps/server/package.json` and
  `packages/api/package.json` while the catalog declares `^2.13.0`, so the catalog entry
  does not actually govern the installed server SDK.

## Revisit when

Voice quality on cellular degrades in a way TURN/stun configuration does not solve, or call
volume requires more than one LiveKit node — either would make the self-hosted single-node
compose file the thing to replace.
