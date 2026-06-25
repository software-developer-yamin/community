import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

const STATUS_CONFIG: Record<string, { badgeBg: string; badgeText: string }> = {
  open: { badgeBg: "#3B82F620", badgeText: "#3B82F6" },
  pending: { badgeBg: "#F59E0B20", badgeText: "#F59E0B" },
  resolved: { badgeBg: "#22C55E20", badgeText: "#22C55E" },
  closed: { badgeBg: "#6B728020", badgeText: "#6B7280" },
};

const SENDER_NAMES: Record<string, string> = {
  user: "You",
  agent: "Support Agent",
  system: "System",
};

function formatRelative(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const secs = Math.floor((now - then) / 1000);
  if (secs < 60) {
    return "just now";
  }
  if (secs < 3600) {
    return `${Math.floor(secs / 60)}m ago`;
  }
  if (secs < 86_400) {
    return `${Math.floor(secs / 3600)}h ago`;
  }
  if (secs < 604_800) {
    return `${Math.floor(secs / 86_400)}d ago`;
  }
  return new Date(date).toLocaleDateString();
}

export default function TicketDetailScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

  const { data: allTickets, isLoading: ticketsLoading } = useQuery(
    orpc.rebuild.getMyTickets.queryOptions()
  );
  const ticket = allTickets?.find((t) => t.id === id);

  const { data: messages, isLoading: messagesLoading } = useQuery(
    orpc.rebuild.getTicketMessages.queryOptions({
      input: { ticketId: id ?? "" },
    })
  );

  const sendMessage = useMutation(
    orpc.rebuild.addTicketMessage.mutationOptions({
      onSuccess: () => {
        setNewMessage("");
        queryClient.invalidateQueries({
          queryKey: orpc.rebuild.getTicketMessages.key(),
        });
        Alert.alert("Sent", "Message sent successfully");
      },
      onError: (err) => {
        Alert.alert("Error", err.message);
      },
    })
  );

  const handleSubmit = () => {
    if (!(newMessage.trim() && id)) {
      return;
    }
    sendMessage.mutate({ ticketId: id, body: newMessage });
  };

  if (ticketsLoading || messagesLoading) {
    return (
      <Container>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  if (!ticket) {
    return (
      <Container>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Ticket not found.</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </Container>
    );
  }

  const config = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.closed;

  const canReply = ticket.status !== "closed" && ticket.status !== "resolved";

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} style={styles.flex}>
          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>{ticket.subject}</Text>
            <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
              <Text style={[styles.badgeText, { color: config.badgeText }]}>
                {ticket.status}
              </Text>
            </View>
          </View>

          <Text style={styles.meta}>
            Ticket #{ticket.ticketNumber} · {ticket.category}
          </Text>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{ticket.description}</Text>
          </View>

          {/* Message Thread */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Messages ({messages?.length ?? 0})
            </Text>
            {messages && messages.length > 0 ? (
              <View style={styles.messageList}>
                {messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      msg.senderRole === "user"
                        ? styles.messageBubbleUser
                        : styles.messageBubbleOther,
                    ]}
                  >
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageSender}>
                        {SENDER_NAMES[msg.senderRole] ?? msg.senderRole}
                      </Text>
                      <Text style={styles.messageTime}>
                        {formatRelative(msg.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.messageBody}>{msg.body}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyMessages}>No messages yet.</Text>
            )}
          </View>
        </ScrollView>

        {/* Reply Form */}
        {canReply ? (
          <View style={styles.replyBar}>
            <TextInput
              multiline
              onChangeText={setNewMessage}
              placeholder="Type your message..."
              placeholderTextColor="#6B7280"
              style={styles.replyInput}
              value={newMessage}
            />
            <Pressable
              disabled={sendMessage.isPending || !newMessage.trim()}
              onPress={handleSubmit}
              style={[
                styles.sendButton,
                (sendMessage.isPending || !newMessage.trim()) &&
                  styles.sendButtonDisabled,
              ]}
            >
              <Text style={styles.sendButtonText}>
                {sendMessage.isPending ? "..." : "Send"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  notFoundText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.base,
    marginBottom: theme.spacing.md,
  },
  backLink: {
    paddingVertical: theme.spacing.sm,
  },
  backLinkText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.base,
  },
  scroll: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    marginBottom: theme.spacing.xs,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.base,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.typography,
    fontSize: theme.fontSize["2xl"],
    fontWeight: "bold",
    flex: 1,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  meta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  description: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.base,
    lineHeight: 22,
  },
  messageList: {
    gap: theme.spacing.sm,
  },
  messageBubble: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  messageBubbleUser: {
    backgroundColor: `${theme.colors.primary}10`,
    borderColor: `${theme.colors.primary}30`,
  },
  messageBubbleOther: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageSender: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
  },
  messageTime: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
  },
  messageBody: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  emptyMessages: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  replyInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.typography,
    fontSize: theme.fontSize.base,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
}));
