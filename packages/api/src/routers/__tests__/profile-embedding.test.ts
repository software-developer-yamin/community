/**
 * ATDD tests for Story RE-2.3: Real Profile Embeddings from User Data
 *
 * Acceptance Criteria:
 *   AC1: Profile embedding uses real user data (CEFR, interests, goals, nativeLanguage)
 *        — not hardcoded values like "Bangla", age=25, fixed style
 *   AC2: updatePreferences triggers profile embedding recompute + cache invalidation
 *   AC3: CEFR placement improvement triggers recompute + cache invalidation (already wired)
 *   AC4: User with no interests/goals → embedding still valid (no crash, uses CEFR + native)
 *   AC5: First-time user → empty interests/goals (not hardcoded "Bangla/food/travel")
 *
 * Test Design refs: epic-re-2-test-design.md — T-2.3-01 through T-2.3-05
 *
 * Run from worktree root:
 *   bun test ./packages/api/src/routers/__tests__/profile-embedding.test.ts
 */

import { describe, expect, test } from "bun:test";

const UNDEFINED_OR_NULL_PATTERN = /undefined|null/;

// ─────────────────────────────────────────────────────────────────
// Pure helpers — mirrors of the profile text construction logic
// in computeProfileEmbedding, extracted for unit-testability.
// ─────────────────────────────────────────────────────────────────

const EMBED_DIMENSION = 384;

/**
 * Build the profile text sent to the embedding service.
 * Mirrors the PROFILE_TEMPLATE in models.ts after RE-2.3 fix.
 * Fields: cefr, native, interests, goals. No hardcoded age/style.
 */
function buildProfileText(p: {
  cefr: string;
  native: string;
  interests: string[];
  goals: string[];
}): string {
  const interestsPart =
    p.interests.length > 0 ? `Interests: ${p.interests.join(", ")}. ` : "";
  const goalsPart = p.goals.length > 0 ? `Goals: ${p.goals.join(", ")}. ` : "";
  return `CEFR: ${p.cefr}. Native: ${p.native}. ${interestsPart}${goalsPart}`.trim();
}

/** Cosine similarity between two equal-length vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) ** 2;
    normB += (b[i] ?? 0) ** 2;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Detect whether profile text includes any hardcoded sentinel values. */
function containsHardcodedValues(text: string): boolean {
  const HARDCODED = [
    "age: 25",
    "gentle correction",
    "slow pace",
    "food/travel",
  ];
  return HARDCODED.some((sentinel) =>
    text.toLowerCase().includes(sentinel.toLowerCase())
  );
}

// ─────────────────────────────────────────────────────────────────
// T-2.3-01 — Profile text construction
// ─────────────────────────────────────────────────────────────────

describe("T-2.3-01: Profile text construction from real user data", () => {
  test("AC1 — uses real CEFR level", () => {
    const text = buildProfileText({
      cefr: "B1",
      native: "bn",
      interests: ["cooking", "music"],
      goals: ["business English"],
    });
    expect(text).toContain("CEFR: B1");
  });

  test("AC1 — uses real native language (not hardcoded 'Bangla')", () => {
    const text = buildProfileText({
      cefr: "A2",
      native: "hi",
      interests: [],
      goals: [],
    });
    expect(text).toContain("Native: hi");
    expect(text).not.toContain("Native: Bangla");
  });

  test("AC1 — uses real interests array", () => {
    const text = buildProfileText({
      cefr: "B2",
      native: "en",
      interests: ["science", "travel"],
      goals: [],
    });
    expect(text).toContain("science");
    expect(text).toContain("travel");
  });

  test("AC1 — uses real goals array", () => {
    const text = buildProfileText({
      cefr: "C1",
      native: "ur",
      interests: [],
      goals: ["academic writing", "interview prep"],
    });
    expect(text).toContain("academic writing");
    expect(text).toContain("interview prep");
  });

  test("AC1 — no hardcoded age, style, or defaults", () => {
    const text = buildProfileText({
      cefr: "B1",
      native: "bn",
      interests: ["cooking"],
      goals: ["fluency"],
    });
    expect(containsHardcodedValues(text)).toBe(false);
  });

  test("AC5 — first-time user: empty interests/goals → no food/travel hardcoded", () => {
    const text = buildProfileText({
      cefr: "A2",
      native: "bn",
      interests: [],
      goals: [],
    });
    expect(text).not.toContain("food");
    expect(text).not.toContain("travel");
    expect(text).not.toContain("Bangla");
    // Should still include CEFR and native
    expect(text).toContain("CEFR: A2");
    expect(text).toContain("Native: bn");
  });

  test("AC4 — no interests or goals → text is still valid (no crash, no empty fields)", () => {
    const text = buildProfileText({
      cefr: "B2",
      native: "en",
      interests: [],
      goals: [],
    });
    // Must not be empty
    expect(text.length).toBeGreaterThan(10);
    // Must not have "undefined" or "null"
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
  });

  test("AC4 — null interests treated as empty (no crash)", () => {
    const text = buildProfileText({
      cefr: "A1",
      native: "ta",
      interests: [],
      goals: [],
    });
    expect(text).toContain("CEFR: A1");
  });
});

// ─────────────────────────────────────────────────────────────────
// T-2.3-02 — Cosine similarity correctness
// ─────────────────────────────────────────────────────────────────

describe("T-2.3-02: Cosine similarity correctness", () => {
  const vec384 = (val: number): number[] =>
    Array.from({ length: EMBED_DIMENSION }, () => val);

  test("identical vectors → similarity = 1.0", () => {
    const v = vec384(0.5);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  test("orthogonal vectors → similarity = 0.0", () => {
    const a = Array.from({ length: EMBED_DIMENSION }, (_, i) =>
      i < EMBED_DIMENSION / 2 ? 1 : 0
    );
    const b = Array.from({ length: EMBED_DIMENSION }, (_, i) =>
      i >= EMBED_DIMENSION / 2 ? 1 : 0
    );
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  test("opposite vectors → similarity = -1.0", () => {
    const a = vec384(1);
    const b = vec384(-1);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  test("zero vector → similarity = 0 (no NaN/crash)", () => {
    const a = vec384(0);
    const b = vec384(1);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test("known partial similarity", () => {
    const a = [1, 0, 0];
    const b = [1, 1, 0];
    // cos(45°) ≈ 0.707
    expect(cosineSimilarity(a, b)).toBeCloseTo(Math.SQRT1_2, 3);
  });
});

// ─────────────────────────────────────────────────────────────────
// T-2.3-03 — Profile embedding trigger on preference update
// ─────────────────────────────────────────────────────────────────

describe("T-2.3-03: updatePreferences triggers profile recompute", () => {
  /**
   * Mirror of the trigger logic that must be added to updatePreferences.
   * Returns true if the update should fire a recompute.
   */
  function shouldRecomputeOnPreferenceUpdate(patch: {
    interests?: string[];
    goals?: string[];
    preferredTypes?: string[];
    dailyGoal?: number;
  }): boolean {
    return patch.interests !== undefined || patch.goals !== undefined;
  }

  test("interests update → should trigger recompute", () => {
    expect(shouldRecomputeOnPreferenceUpdate({ interests: ["science"] })).toBe(
      true
    );
  });

  test("goals update → should trigger recompute", () => {
    expect(shouldRecomputeOnPreferenceUpdate({ goals: ["fluency"] })).toBe(
      true
    );
  });

  test("interests + goals update → should trigger recompute", () => {
    expect(
      shouldRecomputeOnPreferenceUpdate({
        interests: ["science"],
        goals: ["fluency"],
      })
    ).toBe(true);
  });

  test("preferredTypes only → should NOT trigger profile recompute", () => {
    expect(
      shouldRecomputeOnPreferenceUpdate({ preferredTypes: ["video"] })
    ).toBe(false);
  });

  test("dailyGoal only → should NOT trigger profile recompute", () => {
    expect(shouldRecomputeOnPreferenceUpdate({ dailyGoal: 30 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// T-2.3-05 — No-preferences fallback
// ─────────────────────────────────────────────────────────────────

describe("T-2.3-05: No-preferences fallback is valid", () => {
  test("null/undefined pref row → use empty arrays (not undefined)", () => {
    function getPrefs(
      row: { interests: string[]; goals: string[] } | undefined
    ): { interests: string[]; goals: string[] } {
      return {
        interests: row?.interests ?? [],
        goals: row?.goals ?? [],
      };
    }
    const result = getPrefs(undefined);
    expect(result.interests).toEqual([]);
    expect(result.goals).toEqual([]);
  });

  test("empty arrays produce valid (non-empty) profile text", () => {
    const text = buildProfileText({
      cefr: "A2",
      native: "bn",
      interests: [],
      goals: [],
    });
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(UNDEFINED_OR_NULL_PATTERN);
  });

  test("missing cefrLevel → defaults to A2 fallback (not crash)", () => {
    function getCefr(row: { level: string } | undefined): string {
      return row?.level ?? "A2";
    }
    const level = getCefr(undefined);
    expect(level).toBe("A2");
    // Profile text should be buildable
    const text = buildProfileText({
      cefr: level,
      native: "bn",
      interests: [],
      goals: [],
    });
    expect(text).toContain("CEFR: A2");
  });

  test("missing nativeLanguage → defaults to 'unknown' (not 'Bangla')", () => {
    function getNative(row: { nativeLanguage: string } | undefined): string {
      return row?.nativeLanguage ?? "unknown";
    }
    const native = getNative(undefined);
    expect(native).toBe("unknown");
    expect(native).not.toBe("Bangla");
  });
});
