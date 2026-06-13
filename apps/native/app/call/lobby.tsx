import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItem,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

interface Room {
  createdAt: number;
  maxParticipants: number;
  metadata: string | null;
  name: string;
  participantCount: number;
}

export default function LobbyScreen() {
  const { theme } = useUnistyles();
  const { data: session } = authClient.useSession();
  const [newRoomName, setNewRoomName] = useState("");

  const roomsQuery = useQuery(
    orpc.livekit.listRooms.queryOptions({
      enabled: Boolean(session?.user),
    })
  );

  const createRoomMutation = useMutation(
    orpc.livekit.createRoom.mutationOptions({
      onSuccess: () => {
        setNewRoomName("");
        queryClient.invalidateQueries({ queryKey: ["livekit"] });
      },
      onError: (error_) => {
        Alert.alert("Failed to create room", error_.message);
      },
    })
  );

  const rooms: Room[] = roomsQuery.data ?? [];

  const handleCreateRoom = () => {
    const name = newRoomName.trim();
    if (!name) {
      Alert.alert("Room name is required");
      return;
    }
    createRoomMutation.mutate({ name });
  };

  const renderRoom: ListRenderItem<Room> = ({ item }) => (
    <View style={[styles.roomCard, { borderColor: theme.colors.border }]}>
      <View style={styles.roomInfo}>
        <Text style={[styles.roomName, { color: theme.colors.typography }]}>
          {item.name}
        </Text>
        <Text
          style={[styles.roomMeta, { color: theme.colors.mutedForeground }]}
        >
          {item.participantCount}/{item.maxParticipants} participants
        </Text>
      </View>
      <Link asChild href={`/call/${encodeURIComponent(item.name)}`}>
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Call Lobby" }} />

      {session?.user ? (
        <>
          {/* Create Room */}
          <View
            style={[styles.createSection, { borderColor: theme.colors.border }]}
          >
            <Text
              style={[styles.sectionTitle, { color: theme.colors.typography }]}
            >
              Create a Room
            </Text>
            <View style={styles.createRow}>
              <TextInput
                onChangeText={setNewRoomName}
                onSubmitEditing={handleCreateRoom}
                placeholder="Room name"
                placeholderTextColor={theme.colors.mutedForeground}
                style={[
                  styles.createInput,
                  {
                    color: theme.colors.typography,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={newRoomName}
              />
              <TouchableOpacity
                disabled={createRoomMutation.isPending}
                onPress={handleCreateRoom}
                style={[
                  styles.createButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                {createRoomMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Room List */}
          <View style={styles.listSection}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.typography }]}
            >
              Active Rooms
            </Text>

            {(() => {
              if (roomsQuery.isLoading) {
                return (
                  <ActivityIndicator
                    color={theme.colors.foreground}
                    size="large"
                    style={styles.loader}
                  />
                );
              }
              if (rooms.length === 0) {
                return (
                  <Text
                    style={[
                      styles.mutedText,
                      { color: theme.colors.mutedForeground },
                    ]}
                  >
                    No active rooms. Create one to get started.
                  </Text>
                );
              }
              return (
                <FlatList
                  contentContainerStyle={styles.roomList}
                  data={rooms}
                  keyExtractor={(item) => item.name}
                  renderItem={renderRoom}
                />
              );
            })()}
          </View>
        </>
      ) : (
        <View style={styles.centered}>
          <Text
            style={[styles.mutedText, { color: theme.colors.mutedForeground }]}
          >
            Sign in to access calls.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  createSection: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    marginBottom: 12,
  },
  createRow: {
    flexDirection: "row",
    gap: 8,
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: theme.fontSize.base,
  },
  createButton: {
    paddingHorizontal: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  listSection: {
    flex: 1,
  },
  loader: {
    marginTop: 24,
  },
  mutedText: {
    fontSize: theme.fontSize.base,
    textAlign: "center",
    marginTop: 24,
  },
  roomList: {
    gap: 8,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: theme.fontSize.base,
    fontWeight: "500",
  },
  roomMeta: {
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  joinButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
}));
