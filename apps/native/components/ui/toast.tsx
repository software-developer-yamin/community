import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type ToastTone = "success" | "error" | "info";

interface ToastEntry {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 2600;

/** Success/failure/booking/payment confirmations — a brief top toast, not a full-screen interrupt. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const TONE_ICON: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "close-circle",
  info: "information-circle",
};

function getToneColor(
  colors: { destructive: string; success: string; info: string },
  tone: ToastTone
): string {
  if (tone === "error") {
    return colors.destructive;
  }
  if (tone === "success") {
    return colors.success;
  }
  return colors.info;
}

function ToastBanner({ entry }: { entry: ToastEntry }) {
  const { theme } = useUnistyles();
  const toneColor = getToneColor(theme.colors, entry.tone);

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutUp}
      style={[styles.banner, theme.shadow.card]}
    >
      <Ionicons color={toneColor} name={TONE_ICON[entry.tone]} size={20} />
      <Text style={styles.message}>{entry.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setEntries((prev) => [...prev, { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (entries.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      setEntries((prev) => prev.slice(1));
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [entries]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={styles.stack}>
        {entries.map((entry) => (
          <ToastBanner entry={entry} key={entry.id} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  stack: {
    position: "absolute",
    top: rt.insets.top + theme.spacing.sm,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  message: {
    flex: 1,
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
}));
