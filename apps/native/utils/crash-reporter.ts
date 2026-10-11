/**
 * Crash Reporter
 *
 * Captures metadata about the device and app state when an unhandled
 * crash occurs. Best-effort: never throws, even when native modules
 * are unavailable.
 *
 * Crash types (from story 6.2 spec):
 *   - "force_close"    – App was killed while backgrounded (AppState detection)
 *   - "anr"            – Android "Application Not Responding"
 *   - "black_screen"   – App visible but not rendering
 *   - "runtime_error"  – Unhandled React render error caught by ErrorBoundary
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CrashType =
  | "force_close"
  | "anr"
  | "black_screen"
  | "runtime_error";

export interface CrashReport {
  appVersion: string;
  deviceModel: string;
  message: string;
  osVersion: string;
  timestamp: number;
  type: CrashType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAppVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants").default;
    return Constants.expoConfig?.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function getDeviceModel(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants").default;
    return (
      Constants.platform?.ios?.model ??
      Constants.platform?.android?.model ??
      Constants.deviceName ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function getPlatformVersion(): string {
  try {
    // Dynamic require to avoid Flow-type parsing issues in test runners
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require("react-native");
    return Platform.Version?.toString() ?? "unknown";
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a structured crash report with device metadata.
 * Never throws — returns `null` on total failure.
 */
export function reportCrash(
  type: CrashType,
  message: string
): CrashReport | null {
  try {
    return {
      type,
      message,
      appVersion: getAppVersion(),
      osVersion: getPlatformVersion(),
      deviceModel: getDeviceModel(),
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

type RefundQualifyingCrashType = "force_close" | "anr" | "black_screen";

function toRefundQualifying(type: CrashType): RefundQualifyingCrashType | null {
  switch (type) {
    case "force_close":
    case "anr":
    case "black_screen":
      return type;
    default:
      return null;
  }
}

/**
 * Fire-and-forget persistence of a crash report. Never throws and never returns
 * a rejected promise — a crash path must not be able to fail the app.
 * `runtime_error` is a local render error and is not refund-qualifying, so it
 * is dropped here rather than sent.
 */
export function submitCrashReport(report: CrashReport | null): void {
  if (!report) {
    return;
  }
  const type = toRefundQualifying(report.type);
  if (!type) {
    return;
  }
  persistCrashReport(type, report).catch(() => undefined);
}

async function persistCrashReport(
  type: RefundQualifyingCrashType,
  report: CrashReport
): Promise<void> {
  try {
    const { client } = await import("@/utils/orpc");
    await client.rebuild.reportCrash({
      type,
      appVersion: report.appVersion,
      osVersion: report.osVersion,
      deviceModel: report.deviceModel,
    });
  } catch {
    // Offline, unauthenticated, or server down. A lost crash row is
    // preferable to an unhandled rejection on the crash path.
  }
}
