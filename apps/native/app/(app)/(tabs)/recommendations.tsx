import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

interface ContentItem {
  cefrLevel: string;
  description: string;
  duration: number | null;
  id: string;
  recommendationReason: string;
  recommendationScore: number;
  tags: string[];
  thumbnailUrl: string | null;
  title: string;
  type: string;
}

export default function RecommendationsScreen() {
  const [recalculate, setRecalculate] = useState(false);
  const { data, isLoading, error, refetch } = useQuery(
    orpc.recommendations.getRecommendations.queryOptions({
      input: {
        limit: 12,
        recalculate,
      },
    })
  );

  const trackInteraction = useMutation(
    orpc.recommendations.trackInteraction.mutationOptions()
  );

  const recommendations = (data as ContentItem[] | undefined) ?? [];

  const handleRefresh = () => {
    setRecalculate(true);
    refetch().then(() => setRecalculate(false));
  };

  const handleInteraction = (contentId: string, action: string) => {
    trackInteraction.mutate({
      contentId,
      action: action as "like" | "bookmark" | "share" | "dismiss",
    });
  };

  const typeEmoji = {
    video: "▶️",
    article: "📄",
    exercise: "✏️",
    dialogue: "💬",
  } as Record<string, string>;

  const cefrColor = {
    A1: "#dcfce7",
    A2: "#bbf7d0",
    B1: "#fef9c3",
    B2: "#fde047",
    C1: "#ffedd5",
    C2: "#fecaca",
  } as Record<string, string>;

  const cefrTextColor = {
    A1: "#166534",
    A2: "#166534",
    B1: "#854d0e",
    B2: "#854d0e",
    C1: "#9a3412",
    C2: "#991b1b",
  } as Record<string, string>;

  if (isLoading) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ScrollView
          contentContainerStyle={styles.errorContainer}
          refreshControl={
            <RefreshControl onRefresh={handleRefresh} refreshing={isLoading} />
          }
        >
          <Text style={styles.errorText}>
            Failed to load recommendations: {error.message}
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </ScrollView>
      </Container>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Container>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl onRefresh={handleRefresh} refreshing={isLoading} />
          }
        >
          <Text style={styles.emptyText}>
            No recommendations yet. Complete your profile or try refreshing.
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>
              Generate Recommendations
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recommended for You</Text>
          <Text style={styles.subtitle}>
            Personalized content based on your CEFR level and interests
          </Text>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {recommendations.length} items recommended
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshSmallButton}
          >
            <Text style={styles.refreshSmallButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl onRefresh={handleRefresh} refreshing={isLoading} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardEmoji}>
                    {typeEmoji[item.type] ?? "📚"}
                  </Text>
                  <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.cardMeta}>
                      <View
                        style={[
                          styles.cefrBadge,
                          {
                            backgroundColor:
                              cefrColor[item.cefrLevel] ?? "#f3f4f6",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cefrText,
                            {
                              color: cefrTextColor[item.cefrLevel] ?? "#374151",
                            },
                          ]}
                        >
                          {item.cefrLevel}
                        </Text>
                      </View>
                      <Text style={styles.cardType}>{item.type}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.cardDescription}>{item.description}</Text>

              {item.recommendationReason && (
                <Text style={styles.cardReason}>
                  {item.recommendationReason}
                </Text>
              )}

              {item.recommendationScore > 0 && (
                <View style={styles.scoreBarContainer}>
                  <View
                    style={[
                      styles.scoreBar,
                      {
                        width: `${Math.round(item.recommendationScore * 100)}%`,
                      },
                    ]}
                  />
                </View>
              )}

              {item.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  {item.tags.length > 3 && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        +{item.tags.length - 3}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={() => handleInteraction(item.id, "like")}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>👍 Like</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleInteraction(item.id, "bookmark")}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>🔖 Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleInteraction(item.id, "dismiss")}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>✕ Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize["2xl"],
    fontWeight: "bold",
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  countText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  refreshSmallButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  refreshSmallButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  cefrBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cefrText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
  },
  cardType: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    textTransform: "capitalize",
  },
  cardDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  cardReason: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  scoreBarContainer: {
    height: 6,
    backgroundColor: theme.colors.muted,
    borderRadius: 3,
    marginBottom: theme.spacing.sm,
    overflow: "hidden",
  },
  scoreBar: {
    height: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  tag: {
    backgroundColor: theme.colors.muted,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.destructive,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.mutedForeground,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  refreshButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
}));
