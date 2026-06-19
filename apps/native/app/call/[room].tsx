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
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Pressable,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

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

  // Track intentional disconnect so network blips don't navigate away.
  const handleLeave = useCallback(() => {
    intentionalDisconnectRef.current = true;
  }, []);

  const handleDisconnected = useCallback(() => {
    if (intentionalDisconnectRef.current) {
      router.back();
    }
  }, [router]);

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
        <RoomView onLeave={handleLeave} roomName={roomName} />
      </LiveKitRoom>
    </View>
  );
}

function RoomView({
  roomName,
  onLeave,
}: {
  roomName: string;
  onLeave: () => void;
}) {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Track connection state for ICE restart reconnection handling.
  useEffect(() => {
    const onReconnecting = () => setIsReconnecting(true);
    const onReconnected = () => setIsReconnecting(false);
    const onDisconnected = () => setIsReconnecting(false);

    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);

    return () => {
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room]);

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
          </View>
        </View>
      );
    }
    return <View style={[styles.tile, styles.placeholder]} />;
  };

  return (
    <View style={styles.roomRoot}>
      {isReconnecting && <ReconnectingBanner />}

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
    router.back();
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

function ReconnectingBanner() {
  const { theme } = useUnistyles();
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.colors.warning ?? "#F59E0B" },
      ]}
    >
      <Text
        style={[
          styles.bannerText,
          { color: theme.colors.warningForeground ?? "#FFFFFF" },
        ]}
      >
        Reconnecting…
      </Text>
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
}));
