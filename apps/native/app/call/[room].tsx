import { env } from "@community/env/native";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  type TrackReferenceOrPlaceholder,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  type ListRenderItem,
  Pressable,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const RECONNECTION_TIMEOUT_S = 30;

export default function CallScreen() {
  const { room: roomName } = useLocalSearchParams<{ room: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data: session } = authClient.useSession();
  const [audioSessionActive, setAudioSessionActive] = useState(false);
  const intentionalDisconnectRef = useRef(false);

  const username = session?.user?.name ?? session?.user?.email ?? "guest";

  const tokenQuery = useQuery(
    orpc.livekit.token.queryOptions({
      input: {
        room: roomName ?? "lobby",
        username,
      },
      enabled: Boolean(roomName) && Boolean(session?.user),
    })
  );

  // Store the original token so RoomView can use it for retry
  const tokenRef = useRef<string | null>(null);
  const connectTimeRef = useRef<number>(Date.now());

  // Track intentional disconnect so network blips don't navigate away.
  const handleLeave = useCallback(() => {
    intentionalDisconnectRef.current = true;
  }, []);

  const handleDisconnected = useCallback(() => {
    // Intentional disconnects are handled by the caller (ControlsBar.leave, handleEndCall).
    // Network-blip disconnects are handled inside RoomView.
    // Navigation races avoided — no router.replace here.
  }, []);

  // Start audio session on mount, stop on unmount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await AudioSession.startAudioSession();
        if (active) {
          setAudioSessionActive(true);
        }
      } catch (err) {
        console.warn("AudioSession start failed", err);
      }
    })();
    return () => {
      active = false;
      AudioSession.stopAudioSession().catch(() => undefined);
      setAudioSessionActive(false);
    };
  }, []);

  // Capture token when it becomes available
  useEffect(() => {
    if (tokenQuery.data?.token) {
      tokenRef.current = tokenQuery.data.token;
      connectTimeRef.current = Date.now();
    }
  }, [tokenQuery.data?.token]);

  if (!roomName) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ title: "Call" }} />
        <Text style={{ color: theme.colors.typography }}>
          Missing room name.
        </Text>
      </View>
    );
  }

  if (!session?.user) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ title: "Call" }} />
        <Text style={{ color: theme.colors.typography }}>
          Sign in to join the call.
        </Text>
      </View>
    );
  }

  if (tokenQuery.isLoading || !audioSessionActive) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ title: `Joining ${roomName}…` }} />
        <ActivityIndicator color={theme.colors.foreground} size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.typography }]}>
          Preparing call…
        </Text>
      </View>
    );
  }

  if (tokenQuery.isError || !tokenQuery.data?.token) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ title: "Call" }} />
        <Text style={[styles.errorText, { color: theme.colors.destructive }]}>
          Failed to fetch access token.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: roomName }} />
      <LiveKitRoom
        audio
        connect
        onDisconnected={handleDisconnected}
        options={{
          adaptiveStream: { pixelDensity: "screen" },
          dynacast: true,
        }}
        serverUrl={env.EXPO_PUBLIC_LIVEKIT_URL}
        token={tokenQuery.data.token}
        video
      >
        <RoomView
          connectTimeRef={connectTimeRef}
          intentionalDisconnectRef={intentionalDisconnectRef}
          onLeave={handleLeave}
          originalTokenRef={tokenRef}
          roomName={roomName}
        />
      </LiveKitRoom>
    </View>
  );
}

type ReconnectionPhase = "reconnecting" | "connection_lost" | "connected";

function RoomView({
  roomName,
  onLeave,
  intentionalDisconnectRef,
  originalTokenRef,
  connectTimeRef,
}: {
  roomName: string;
  onLeave: () => void;
  intentionalDisconnectRef: React.MutableRefObject<boolean>;
  originalTokenRef: React.MutableRefObject<string | null>;
  connectTimeRef: React.MutableRefObject<number>;
}) {
  const room = useRoomContext();
  const router = useRouter();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const [phase, setPhase] = useState<ReconnectionPhase>("connected");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectStartRef = useRef<number | null>(null);
  const prevReconnectingRef = useRef(false);
  const retryInProgressRef = useRef(false);
  const mountedRef = useRef(false);
  const userId = authClient.useSession().data?.user?.id ?? "";

  // Token refresh mutation
  const refreshTokenMutation = useMutation(
    orpc.livekit.refreshToken.mutationOptions()
  );
  // Stable ref to avoid regenerating handleRetry on every render
  const refreshTokenRef = useRef(refreshTokenMutation);
  refreshTokenRef.current = refreshTokenMutation;

  // Update participant status mutation
  const updateStatusMutation = useMutation(
    orpc.livekit.updateParticipantStatus.mutationOptions()
  );
  // Stable ref to avoid re-registering effect on mutation object change
  const updateStatusRef = useRef(updateStatusMutation);
  updateStatusRef.current = updateStatusMutation;

  // Increment reconnection count mutation
  const incrementReconnectMutation = useMutation(
    orpc.livekit.incrementReconnectionCount.mutationOptions()
  );
  // Stable ref to avoid re-registering room event listeners on mutation object change
  const incrementReconnectRef = useRef(incrementReconnectMutation);
  incrementReconnectRef.current = incrementReconnectMutation;

  // Track partner reconnection status from ParticipantMetadata events
  const [partnerReconnecting, setPartnerReconnecting] = useState(false);

  // Track connection state for reconnection handling.
  useEffect(() => {
    const onReconnecting = () => {
      setPhase("reconnecting");
      reconnectStartRef.current = Date.now();
      setElapsedSeconds(0);
    };
    const onReconnected = () => {
      setPhase("connected");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      reconnectStartRef.current = null;
      setElapsedSeconds(0);

      // Increment reconnection count for observability
      incrementReconnectRef.current.mutate({ roomName });
    };
    const onDisconnected = () => {
      // If a retry is in progress, don't override the phase — the
      // retry handler manages its own state transitions.
      if (retryInProgressRef.current) {
        return;
      }
      // Intentional disconnects navigate via ControlsBar.leave or
      // handleEndCall; skip UI banner on screen reader path.
      if (intentionalDisconnectRef.current) {
        return;
      }
      // For network blips without a Reconnecting event, surface the
      // connection_lost banner so the user can retry or end.
      setPhase("connection_lost");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedSeconds(0);
    };

    // Listen for partner's participant metadata changes (reconnect status)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onParticipantMetadata = (_participant: any, metadata: string) => {
      try {
        const parsed = JSON.parse(metadata) as {
          reconnectStatus?: string;
        };
        if (parsed.reconnectStatus === "reconnecting") {
          setPartnerReconnecting(true);
        } else if (parsed.reconnectStatus === "connected") {
          setPartnerReconnecting(false);
        }
      } catch {
        // Non-JSON metadata or unknown format — ignore
      }
    };

    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.ParticipantMetadata, onParticipantMetadata);

    return () => {
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.ParticipantMetadata, onParticipantMetadata);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [room, roomName]);

  // Start/stop elapsed timer based on reconnection phase
  useEffect(() => {
    const wasReconnecting = prevReconnectingRef.current;
    const isNowReconnecting = phase === "reconnecting";

    if (isNowReconnecting && !wasReconnecting) {
      // Reconnection just started — start the interval
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isNowReconnecting && wasReconnecting) {
      // Just reconnected — stop the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedSeconds(0);
    }

    prevReconnectingRef.current = isNowReconnecting;

    // Cleanup on unmount — clear interval
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase]);

  // Check for 30s timeout
  useEffect(() => {
    if (elapsedSeconds >= RECONNECTION_TIMEOUT_S) {
      setPhase((prev) => (prev === "reconnecting" ? "connection_lost" : prev));
    }
  }, [elapsedSeconds]);

  // Notify partner via metadata when reconnecting >10s, and clear on reconnect
  useEffect(() => {
    if (!mountedRef.current) {
      // Skip initial mount — participant hasn't joined yet
      return;
    }

    if (phase === "reconnecting" && elapsedSeconds === 10) {
      updateStatusRef.current.mutate({
        roomName,
        status: "reconnecting",
      });
    }
    if (phase === "connected") {
      updateStatusRef.current.mutate({
        roomName,
        status: "connected",
      });
    }
  }, [phase, elapsedSeconds, roomName]);

  // Set mounted flag after first render — participant should be joined by now
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const handleRetry = useCallback(async () => {
    if (!roomName) {
      return;
    }

    // Guard: prevent concurrent retry attempts
    if (retryInProgressRef.current) {
      return;
    }

    retryInProgressRef.current = true;
    setPhase("reconnecting");
    setElapsedSeconds(0);
    reconnectStartRef.current = Date.now();

    try {
      // Disconnect from current room — the onDisconnected handler
      // skips phase reset when retryInProgressRef is true.
      await room.disconnect().catch(() => {
        // Room may already be disconnected — swallow
      });

      // Determine if token is expired (>4min since original connect —
      // use 4min buffer against 5min token TTL to account for network latency)
      const elapsedMs = Date.now() - connectTimeRef.current;
      let tokenToUse: string;

      if (elapsedMs > 4 * 60 * 1000) {
        // Token expired — get a fresh one
        const result = await refreshTokenRef.current.mutateAsync({ roomName });
        tokenToUse = result.token;
        // Update the ref so subsequent retries use the new token
        originalTokenRef.current = result.token;
      } else {
        // Use stored original token
        tokenToUse = originalTokenRef.current ?? "";
        if (!tokenToUse) {
          // Fallback: try to refresh anyway
          const result = await refreshTokenRef.current.mutateAsync({
            roomName,
          });
          tokenToUse = result.token;
          originalTokenRef.current = result.token;
        }
      }

      await room.connect(env.EXPO_PUBLIC_LIVEKIT_URL, tokenToUse);
      // Reset connect time so subsequent retries don't eagerly refresh
      connectTimeRef.current = Date.now();
      // Increment reconnection count (manual retry won't fire RoomEvent.Reconnected)
      incrementReconnectRef.current.mutate({ roomName });
      setPhase("connected");
    } catch (err) {
      console.warn("Retry reconnection failed", err);
      setPhase("connection_lost");
    } finally {
      retryInProgressRef.current = false;
    }
  }, [roomName, room, connectTimeRef, originalTokenRef]);

  const handleEndCall = useCallback(() => {
    intentionalDisconnectRef.current = true;
    room.disconnect();

    // Call endCall with connection_lost reason
    orpc.livekit.endCall
      .mutate({ roomName, endReason: "connection_lost" })
      .catch(() => {
        // Fire-and-forget: room cleanup best-effort
      });

    router.replace("call/ended?reason=connection_lost");
  }, [roomName, room, router, intentionalDisconnectRef]);

  // Animated pulse for reconnecting banner
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === "reconnecting") {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    pulseAnim.setValue(1);
  }, [phase, pulseAnim]);

  const renderItem: ListRenderItem<TrackReferenceOrPlaceholder> = ({
    item,
  }) => {
    if (isTrackReference(item)) {
      return (
        <View style={styles.tile}>
          <VideoTrack objectFit="cover" style={styles.video} trackRef={item} />
          <View style={styles.tileOverlay}>
            <Text numberOfLines={1} style={styles.tileLabel}>
              {item.participant.name ?? item.participant.identity}
            </Text>
            {/* Show "Connection unstable" for partner during reconnect */}
            {item.participant.identity !== userId &&
              (phase !== "connected" || partnerReconnecting) && (
                <Text
                  nativeID="partner-reconnecting-indicator"
                  style={styles.unstableText}
                >
                  Connection unstable
                </Text>
              )}
          </View>
        </View>
      );
    }
    return <View style={[styles.tile, styles.placeholder]} />;
  };

  return (
    <View style={styles.roomRoot}>
      {phase === "reconnecting" && (
        <ReconnectingBanner
          elapsedSeconds={elapsedSeconds}
          pulseAnim={pulseAnim}
        />
      )}

      {phase === "connection_lost" && (
        <ConnectionLostBanner onEndCall={handleEndCall} onRetry={handleRetry} />
      )}

      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Room: {roomName}</Text>
        <Text style={styles.headerSubtitle}>
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        </Text>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={tracks}
        keyExtractor={(item, idx) =>
          isTrackReference(item)
            ? (item.publication.trackSid ?? `pub-${idx}`)
            : `placeholder-${idx}`
        }
        numColumns={1}
        renderItem={renderItem}
      />

      <ControlsBar onLeave={onLeave} />
    </View>
  );
}

type CtrlIcon =
  | "mic"
  | "mic-off"
  | "videocam"
  | "videocam-off"
  | "camera-reverse";

function ControlsBar({ onLeave }: { onLeave?: () => void }) {
  const { theme } = useUnistyles();
  const router = useRouter();
  const room = useRoomContext();
  const {
    localParticipant: local,
    isMicrophoneEnabled,
    isCameraEnabled,
  } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(isMicrophoneEnabled);
  const [camEnabled, setCamEnabled] = useState(isCameraEnabled);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  useEffect(() => {
    setMicEnabled(isMicrophoneEnabled);
    setCamEnabled(isCameraEnabled);
  }, [isMicrophoneEnabled, isCameraEnabled]);

  const toggleMic = async () => {
    const next = !micEnabled;
    await local.setMicrophoneEnabled(next);
    setMicEnabled(next);
  };

  const toggleCam = async () => {
    const next = !camEnabled;
    await local.setCameraEnabled(next, { facingMode });
    setCamEnabled(next);
  };

  const flipCam = async () => {
    const nextFacing: "user" | "environment" =
      facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    if (camEnabled) {
      await local.setCameraEnabled(true, { facingMode: nextFacing });
    }
  };

  const leave = async () => {
    onLeave?.();
    await room.disconnect();
    router.replace("call/ended?reason=explicit");
  };

  return (
    <View style={[styles.controls, { borderTopColor: theme.colors.border }]}>
      <ControlButton
        active={micEnabled}
        iconOff="mic-off"
        iconOn="mic"
        offColor={theme.colors.destructive}
        onColor={theme.colors.primary}
        onPress={toggleMic}
      />
      <ControlButton
        active={camEnabled}
        iconOff="videocam-off"
        iconOn="videocam"
        offColor={theme.colors.destructive}
        onColor={theme.colors.primary}
        onPress={toggleCam}
      />
      <ControlButton
        active
        iconOff="camera-reverse"
        iconOn="camera-reverse"
        offColor={theme.colors.primary}
        onColor={theme.colors.primary}
        onPress={flipCam}
      />
      <Pressable
        onPress={leave}
        style={[styles.leaveBtn, { backgroundColor: theme.colors.destructive }]}
      >
        <Ionicons
          color={theme.colors.destructiveForeground}
          name="call"
          size={22}
        />
        <Text
          style={[
            styles.leaveText,
            { color: theme.colors.destructiveForeground },
          ]}
        >
          Leave
        </Text>
      </Pressable>
    </View>
  );
}

function ControlButton({
  onPress,
  active,
  onColor,
  offColor,
  iconOn,
  iconOff,
}: {
  onPress: () => void;
  active: boolean;
  onColor: string;
  offColor: string;
  iconOn: CtrlIcon;
  iconOff: CtrlIcon;
}) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.ctrlBtn, { backgroundColor: active ? onColor : offColor }]}
    >
      <Ionicons
        color={theme.colors.primaryForeground}
        name={active ? iconOn : iconOff}
        size={22}
      />
    </Pressable>
  );
}

function ReconnectingBanner({
  elapsedSeconds,
  pulseAnim,
}: {
  elapsedSeconds: number;
  pulseAnim: Animated.Value;
}) {
  const { theme } = useUnistyles();
  return (
    <Animated.View
      nativeID="reconnecting-banner"
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.warning ?? "#F59E0B",
          opacity: pulseAnim,
        },
      ]}
    >
      <Text
        nativeID="reconnection-countdown"
        style={[
          styles.bannerText,
          { color: theme.colors.warningForeground ?? "#FFFFFF" },
        ]}
      >
        Reconnecting… ({elapsedSeconds}s)
      </Text>
    </Animated.View>
  );
}

function ConnectionLostBanner({
  onRetry,
  onEndCall,
}: {
  onRetry: () => void;
  onEndCall: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <View>
      <View
        nativeID="connection-lost-prompt"
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.destructive ?? "#DC2626",
          },
        ]}
      >
        <Text
          nativeID="connection-lost-text"
          style={[
            styles.bannerText,
            { color: theme.colors.destructiveForeground ?? "#FFFFFF" },
          ]}
        >
          Connection lost.
        </Text>
      </View>
      <View nativeID="connection-lost-actions" style={styles.ctaRow}>
        <Pressable
          nativeID="retry-button"
          onPress={onRetry}
          style={[
            styles.ctaBtn,
            { backgroundColor: theme.colors.primary ?? "#3B82F6" },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: theme.colors.primaryForeground ?? "#FFFFFF" },
            ]}
          >
            Retry
          </Text>
        </Pressable>
        <Pressable
          nativeID="end-call-button"
          onPress={onEndCall}
          style={[
            styles.ctaBtn,
            { backgroundColor: theme.colors.secondary ?? "#6B7280" },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: theme.colors.secondaryForeground ?? "#FFFFFF" },
            ]}
          >
            End call
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: theme.fontSize.base,
  },
  errorText: {
    fontSize: theme.fontSize.base,
    textAlign: "center",
  },
  roomRoot: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  listContent: {
    padding: 8,
  },
  tile: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.muted,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
  },
  placeholder: {
    opacity: 0.5,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  tileOverlay: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tileLabel: {
    color: "#FFFFFF",
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
  },
  unstableText: {
    color: "#FCD34D",
    fontSize: theme.fontSize.xs,
    marginTop: 2,
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
  },
  leaveText: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
}));
