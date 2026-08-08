import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/** Cream background, safe-area, scrolling content. Default shell for Learn-register screens. */
export function LearnScreenShell({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  if (!scroll) {
    return <View style={styles.learnRoot}>{children}</View>;
  }
  return (
    <View style={styles.learnRoot}>
      <ScrollView
        contentContainerStyle={styles.learnScroll}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Stage dark background, no top safe-area bleed — immersive call/room screens. */
export function StageScreenShell({ children }: { children: ReactNode }) {
  return <View style={styles.stageRoot}>{children}</View>;
}

/** Auth/onboarding form screens: cream background, centered content column. */
export function FormScreenShell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.learnRoot}>
      <ScrollView
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Bottom-sheet-style modal content wrapper: paper surface, top-rounded, handle bar. */
export function ModalSheetShell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.sheetRoot}>
      <View style={styles.handle} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  learnRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  learnScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: rt.insets.top + theme.spacing.md,
    paddingBottom: rt.insets.bottom + 68 + theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  stageRoot: {
    flex: 1,
    backgroundColor: theme.colors.stage,
  },
  formScroll: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: rt.insets.top + theme.spacing.xl,
    paddingBottom: rt.insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  sheetRoot: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: rt.insets.bottom + theme.spacing.lg,
    gap: theme.spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginBottom: theme.spacing.sm,
  },
}));
