/**
 * Unit tests for crash-reporter.ts
 *
 * Run from apps/native/:
 *   bun test
 */

import { describe, expect, mock, test } from "bun:test";
import type { CrashType } from "../crash-reporter";
import { reportCrash } from "../crash-reporter";

// ---------------------------------------------------------------------------
// Mock react-native (Flow-typed source breaks Bun parsing)
// ---------------------------------------------------------------------------

mock.module("react-native", () => ({
  Platform: {
    OS: "android",
    Version: 34,
    select: (_spec: Record<string, string>) => _spec.android ?? "",
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("crashReporter", () => {
  const TIMESTAMP_EPSILON = 5000; // 5 s

  // -----------------------------------------------------------------------
  // 6.2-UNIT-001: reportCrash returns a structured CrashReport
  // -----------------------------------------------------------------------
  test("6.2-UNIT-001: reportCrash returns a structured CrashReport", () => {
    const report = reportCrash("force_close", "test error");

    expect(report).not.toBeNull();
    expect(report?.type).toBe("force_close");
    expect(report?.message).toBe("test error");
    expect(Math.abs(Date.now() - (report?.timestamp ?? 0))).toBeLessThan(
      TIMESTAMP_EPSILON
    );
  });

  // -----------------------------------------------------------------------
  // 6.2-UNIT-002: reportCrash includes device metadata
  // -----------------------------------------------------------------------
  test("6.2-UNIT-002: reportCrash includes device metadata", () => {
    const report = reportCrash("anr", "ANR error");

    expect(report).not.toBeNull();
    expect(report?.osVersion).toBe("34");
    expect(report?.deviceModel).toBe("unknown");
  });

  // -----------------------------------------------------------------------
  // 6.2-UNIT-003: reportCrash handles all crash types
  // -----------------------------------------------------------------------
  test("6.2-UNIT-003: reportCrash handles all crash types", () => {
    const types: CrashType[] = [
      "force_close",
      "anr",
      "black_screen",
      "runtime_error",
    ];

    for (const type of types) {
      const report = reportCrash(type, `error-${type}`);
      expect(report).not.toBeNull();
      expect(report?.type).toBe(type);
    }
  });

  // -----------------------------------------------------------------------
  // 6.2-UNIT-004: reportCrash tolerates native module failure
  // -----------------------------------------------------------------------
  test("6.2-UNIT-004: reportCrash tolerates native module failure", () => {
    const report = reportCrash("runtime_error", "native failure");
    expect(report).not.toBeNull();
    expect(report?.type).toBe("runtime_error");
  });

  // -----------------------------------------------------------------------
  // 6.2-UNIT-005: reportCrash handles empty message gracefully
  // -----------------------------------------------------------------------
  test("6.2-UNIT-005: reportCrash handles empty message gracefully", () => {
    const report = reportCrash("black_screen", "");

    expect(report).not.toBeNull();
    expect(report?.message).toBe("");
  });
});
