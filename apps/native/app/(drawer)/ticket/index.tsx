import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const SUPPORT_CATEGORIES = [
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical Issue" },
  { value: "moderation", label: "Moderation" },
  { value: "other", label: "Other" },
] as const;

type Category = "billing" | "technical" | "moderation" | "other";

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

export default function TicketListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: tickets, isLoading } = useQuery(
    orpc.rebuild.getMyTickets.queryOptions()
  );

  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("billing");
  const [description, setDescription] = useState("");

  const createTicket = useMutation(
    orpc.rebuild.createSupportTicket.mutationOptions({
      onSuccess: () => {
        setSubject("");
        setCategory("billing");
        setDescription("");
        setShowCreate(false);
        queryClient.invalidateQueries({
          queryKey: orpc.rebuild.getMyTickets.queryOptions().queryKey,
        });
        Alert.alert("Success", "Ticket created successfully");
      },
      onError: (err) => {
        Alert.alert("Error", err.message);
      },
    })
  );

  const handleCreate = () => {
    if (!(subject.trim() && description.trim())) {
      return;
    }
    createTicket.mutate({ subject, category, description });
  };

  return (
    <Container>
      <ScrollView>
        <View style={styles.page}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Support Tickets</Text>
              <Text style={styles.subtitle}>
                Submit a request or check existing tickets.
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCreate(!showCreate)}
              style={styles.createButton}
            >
              <Text style={styles.createButtonText}>
                {showCreate ? "Cancel" : "New Ticket"}
              </Text>
            </Pressable>
          </View>

          {/* Create Ticket Form */}
          {showCreate ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create a Ticket</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput
                  onChangeText={setSubject}
                  placeholder="Brief summary of your issue"
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                  value={subject}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryRow}>
                  {SUPPORT_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      style={[
                        styles.categoryChip,
                        category === cat.value && styles.categoryChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat.value &&
                            styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  onChangeText={setDescription}
                  placeholder="Describe your issue in detail"
                  placeholderTextColor="#6B7280"
                  style={styles.textarea}
                  value={description}
                />
              </View>

              <Pressable
                disabled={createTicket.isPending}
                onPress={handleCreate}
                style={[
                  styles.submitButton,
                  createTicket.isPending && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Ticket List */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Tickets</Text>
          </View>

          {(() => {
            if (isLoading) {
              return (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" />
                </View>
              );
            }
            if (!tickets || tickets.length === 0) {
              return (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No tickets yet. Create one above.
                  </Text>
                </View>
              );
            }
            return (
              <View style={styles.ticketList}>
                {tickets.map((ticket) => {
                  const config =
                    STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.closed;
                  return (
                    <TicketCard
                      category={ticket.category}
                      config={config}
                      createdAt={ticket.createdAt}
                      description={ticket.description}
                      key={ticket.id}
                      onPress={() =>
                        router.push({
                          // biome-ignore lint/suspicious/noExplicitAny: Expo Router typed routes stale for new ticket dir
                          pathname: "/(drawer)/ticket/[id]" as any,
                          params: { id: ticket.id },
                        })
                      }
                      status={ticket.status}
                      subject={ticket.subject}
                      ticketNumber={ticket.ticketNumber}
                    />
                  );
                })}
              </View>
            );
          })()}
        </View>
      </ScrollView>
    </Container>
  );
}

function TicketCard({
  ticketNumber,
  subject,
  description,
  status,
  category,
  createdAt,
  config,
  onPress,
}: {
  ticketNumber: number | string;
  subject: string;
  description: string;
  status: string;
  category: string;
  createdAt: Date | string;
  config: { badgeBg: string; badgeText: string };
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ticketCard,
        pressed && styles.ticketCardPressed,
      ]}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketSubjectRow}>
          <Text numberOfLines={1} style={styles.ticketSubject}>
            {subject}
          </Text>
          <View
            style={[styles.ticketBadge, { backgroundColor: config.badgeBg }]}
          >
            <Text style={[styles.ticketBadgeText, { color: config.badgeText }]}>
              {status}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.ticketDescription}>
          {description}
        </Text>
      </View>
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketMeta}>#{ticketNumber}</Text>
        <Text style={styles.ticketMeta}>{formatRelative(createdAt)}</Text>
        <Text style={styles.ticketMeta}>{category}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  page: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    color: theme.colors.typography,
    fontSize: theme.fontSize["2xl"],
    fontWeight: "bold",
  },
  subtitle: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  createButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
  fieldGroup: {
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.typography,
    fontSize: theme.fontSize.base,
  },
  textarea: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.typography,
    fontSize: theme.fontSize.base,
    minHeight: 100,
    textAlignVertical: "top",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  categoryChip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
  },
  categoryChipTextActive: {
    color: theme.colors.primaryForeground,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  submitButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sectionHeader: {},
  sectionTitle: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
  },
  centered: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
  },
  ticketList: {
    gap: theme.spacing.sm,
  },
  ticketCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  ticketCardPressed: {
    opacity: 0.7,
  },
  ticketHeader: {
    gap: theme.spacing.xs,
  },
  ticketSubjectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  ticketSubject: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
    flex: 1,
  },
  ticketBadge: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 9999,
  },
  ticketBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  ticketDescription: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
  },
  ticketFooter: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  ticketMeta: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
    textTransform: "capitalize",
  },
}));
