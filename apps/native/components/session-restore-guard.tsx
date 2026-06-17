import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export function SessionRestoreGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, error, isPending, refetch } = authClient.useSession();
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const refetchInFlightRef = useRef(false);
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (isPending) {
      return;
    }

    refetchInFlightRef.current = false;

    if (session) {
      setShowSkeleton(false);
      retryCountRef.current = 0;
      return;
    }

    if (error && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      const delay = BASE_DELAY_MS * 2 ** (retryCountRef.current - 1);
      retryTimerRef.current = setTimeout(() => {
        refetchInFlightRef.current = true;
        refetch();
      }, delay);
      return;
    }

    setShowSkeleton(false);
  }, [isPending, session, error, refetch]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    },
    []
  );

  if (showSkeleton) {
    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonContent}>
          <Text style={styles.appTitle}>AceFluency</Text>
          {retryCountRef.current > 0 && (
            <Text style={styles.retryText}>
              Reconnecting... (attempt {retryCountRef.current}/{MAX_RETRIES})
            </Text>
          )}
          <View style={styles.loaderSection}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              {retryCountRef.current > 0
                ? "Could not reach server. Retrying in a moment…"
                : "Restoring your session…"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create((theme) => ({
  skeletonContainer: {
    flex: 1,
    backgroundColor: theme?.colors?.background ?? "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonContent: {
    alignItems: "center",
    gap: 24,
  },
  appTitle: {
    color: theme?.colors?.typography ?? "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  loaderSection: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: theme?.colors?.mutedForeground ?? "#888",
    fontSize: 14,
  },
  retryText: {
    color: theme?.colors?.warning ?? "#f59e0b",
    fontSize: 13,
  },
}));
