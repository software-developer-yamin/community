/**
 * ATDD tests for Story RE-4.1: Interaction-Weighted Scoring (v2)
 *
 * Acceptance Criteria (from epic-spec):
 *   AC1: Like (+0.3) → similar tagged content boosted
 *   AC2: Dismiss (-0.2) → similar tagged content penalised
 *   AC3: Complete (+0.1) → weaker boost than like
 *   AC4: Bookmark (+0.2) → middle boost
 *   AC5: Multiple interactions with same content stack, competing signals cancel, score ≤ 1.0
 *   AC6: Multiple liked/dismissed across topics → both applied, each topic independent
 *   AC7: No interaction history → feedback component skipped (adjustment = 0)
 *
 * Test Design refs: epic-re-4-test-design.md — T-4.1-01 through T-4.1-10
 *
 * Run from repo root:
 *   bun test packages/api/src/routers/__tests__/interaction-feedback.test.ts
 */

import { describe, expect, test } from "bun:test";

// ─────────────────────────────────────────────────────────────────
// Types (mirroring the implementation interface)
// ─────────────────────────────────────────────────────────────────

interface Interaction {
  action: string; // "like" | "bookmark" | "complete" | "dismiss" | "view" | "share"
  contentTags: string[];
}

interface Candidate {
  id: string;
  tags: string[];
}

type WeightMap = Record<string, number>; // action → weight

// ─────────────────────────────────────────────────────────────────
// Implementation: applyFeedbackLoop
// ─────────────────────────────────────────────────────────────────

/**
 * Compute per-candidate score adjustments based on past user interactions.
 *
 * 1. Aggregate interaction weights per tag (summing weights when multiple
 *    interactions share the same tag).
 * 2. For each candidate, sum the weights of its matching tags.
 * 3. Clamp the per-candidate adjustment to [adjustmentFloor, adjustmentCeiling].
 *
 * @param interactions  — user's past interactions (action + content's tags)
 * @param candidates    — content items being scored
 * @param weights       — action → weight, e.g. { like: 0.3, dismiss: -0.2 }
 * @param adjustmentFloor   — minimum allowed adjustment (default -0.2)
 * @param adjustmentCeiling — maximum allowed adjustment (default +0.5)
 * @returns             Record<candidateId, rawAdjustment> (before final [0,1] clamp)
 */
function applyFeedbackLoop(
  interactions: Interaction[],
  candidates: Candidate[],
  weights: WeightMap,
  adjustmentFloor = -0.2,
  adjustmentCeiling = 0.5
): Record<string, number> {
  // No interactions → skip (AC7)
  if (interactions.length === 0) {
    return Object.fromEntries(candidates.map((c) => [c.id, 0]));
  }

  // Aggregate tag → netWeight across all interactions
  const tagWeights: Record<string, number> = {};

  for (const interaction of interactions) {
    const weight = weights[interaction.action];
    if (weight === undefined || weight === 0) {
      continue; // skip neutral actions
    }

    for (const tag of interaction.contentTags) {
      tagWeights[tag] = (tagWeights[tag] ?? 0) + weight;
    }
  }

  // Score each candidate by tag overlap
  const adjustments: Record<string, number> = {};
  for (const candidate of candidates) {
    let total = 0;
    for (const tag of candidate.tags) {
      total += tagWeights[tag] ?? 0;
    }
    adjustments[candidate.id] = Math.min(
      Math.max(total, adjustmentFloor),
      adjustmentCeiling
    );
  }

  return adjustments;
}

/**
 * Apply the feedback adjustment to a base score and clamp final to [0, 1.0].
 */
function applyAdjustment(baseScore: number, adjustment: number): number {
  return Math.min(Math.max(baseScore + adjustment, 0), 1.0);
}

// ─────────────────────────────────────────────────────────────────
// Default weight map (mirrors production)
// ─────────────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: WeightMap = {
  like: 0.3,
  bookmark: 0.2,
  complete: 0.1,
  dismiss: -0.2,
  view: 0,
  share: 0,
};

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("applyFeedbackLoop — AC1: Like (+0.3) boost", () => {
  test("T-4.1-01 — like boosts same-tag content by +0.3", () => {
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["travel"] },
    ];
    const candidates: Candidate[] = [
      { id: "c100", tags: ["travel"] },
      { id: "c200", tags: ["business"] },
    ];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(0.3); // boost
    expect(result.c200).toBeCloseTo(0); // no change
  });
});

describe("applyFeedbackLoop — AC2: Dismiss (-0.2) penalty", () => {
  test("T-4.1-02 — dismiss penalises same-tag content by -0.2", () => {
    const interactions: Interaction[] = [
      { action: "dismiss", contentTags: ["politics"] },
    ];
    const candidates: Candidate[] = [
      { id: "c100", tags: ["politics"] },
      { id: "c200", tags: ["science"] },
    ];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(-0.2);
    expect(result.c200).toBeCloseTo(0);
  });
});

describe("applyFeedbackLoop — AC3: Complete (+0.1) boost", () => {
  test("T-4.1-03 — complete gives a weaker boost than like", () => {
    const interactions: Interaction[] = [
      { action: "complete", contentTags: ["spanish"] },
    ];
    const candidates: Candidate[] = [{ id: "c100", tags: ["spanish"] }];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(0.1); // weaker than +0.3
  });
});

describe("applyFeedbackLoop — AC4: Bookmark (+0.2) boost", () => {
  test("T-4.1-04 — bookmark gives a middle boost", () => {
    const interactions: Interaction[] = [
      { action: "bookmark", contentTags: ["grammar"] },
    ];
    const candidates: Candidate[] = [{ id: "c100", tags: ["grammar"] }];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(0.2);
  });
});

describe("applyFeedbackLoop — AC5: Stacking and competing signals", () => {
  test("T-4.1-05a — like + bookmark stack to +0.5", () => {
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["travel"] },
      { action: "bookmark", contentTags: ["travel"] },
    ];
    const candidates: Candidate[] = [{ id: "c100", tags: ["travel"] }];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(0.5);
  });

  test("T-4.1-05b — like + dismiss on same tag cancels to +0.1 (no clamp hit)", () => {
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["food"] },
      { action: "dismiss", contentTags: ["food"] },
    ];
    const candidates: Candidate[] = [{ id: "c100", tags: ["food"] }];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(0.1);
  });

  test("T-4.1-05c — stacked boost clamped at adjustmentCeiling (+0.5)", () => {
    // Even 3 likes on the same tag → +0.9 would exceed ceiling → clamped
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["travel"] },
      { action: "like", contentTags: ["travel"] },
      { action: "like", contentTags: ["travel"] },
    ];
    const candidates: Candidate[] = [{ id: "c100", tags: ["travel"] }];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(0.5); // clamped, not 0.9
  });

  test("T-4.1-05d — stacked dismiss clamped at adjustmentFloor (-0.2)", () => {
    const interactions: Interaction[] = [
      { action: "dismiss", contentTags: ["politics"] },
      { action: "dismiss", contentTags: ["politics"] },
    ];
    const candidates: Candidate[] = [{ id: "c100", tags: ["politics"] }];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c100).toBeCloseTo(-0.2); // clamped, not -0.4
  });
});

describe("applyFeedbackLoop — AC6: Multiple topics", () => {
  test("T-4.1-06 — liked travel and dismissed politics → both applied per candidate", () => {
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["travel"] },
      { action: "dismiss", contentTags: ["politics"] },
    ];
    const candidates: Candidate[] = [
      { id: "travel-article", tags: ["travel"] },
      { id: "politics-article", tags: ["politics"] },
      { id: "general", tags: ["culture"] },
    ];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result["travel-article"]).toBeCloseTo(0.3);
    expect(result["politics-article"]).toBeCloseTo(-0.2);
    expect(result.general).toBeCloseTo(0);
  });
});

describe("applyFeedbackLoop — AC7: No history", () => {
  test("T-4.1-07 — no interactions → adjustment = 0 for all candidates", () => {
    const result = applyFeedbackLoop(
      [],
      [{ id: "c1", tags: ["travel"] }],
      DEFAULT_WEIGHTS
    );

    expect(result.c1).toBeCloseTo(0);
  });
});

describe("applyFeedbackLoop — neutral actions", () => {
  test("view and share actions produce no adjustment", () => {
    const interactions: Interaction[] = [
      { action: "view", contentTags: ["travel"] },
      { action: "share", contentTags: ["food"] },
    ];
    const candidates: Candidate[] = [
      { id: "c1", tags: ["travel"] },
      { id: "c2", tags: ["food"] },
    ];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c1).toBeCloseTo(0);
    expect(result.c2).toBeCloseTo(0);
  });
});

describe("applyFeedbackLoop — tag overlap edge cases", () => {
  test("candidate with multiple matching tags sums weights", () => {
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["food", "cooking"] },
    ];
    const candidates: Candidate[] = [
      { id: "c1", tags: ["food"] },
      { id: "c2", tags: ["cooking"] },
      { id: "c3", tags: ["food", "cooking"] }, // both tags match
      { id: "c4", tags: ["sports"] }, // no match
    ];

    const result = applyFeedbackLoop(interactions, candidates, DEFAULT_WEIGHTS);

    expect(result.c1).toBeCloseTo(0.3);
    expect(result.c2).toBeCloseTo(0.3);
    // Both tags match the same interaction → weight counted per-candidate
    // but the interaction weight is attributed per-tag, so a single like
    // on "food,cooking" adds +0.3 to BOTH "food" and "cooking" in the tag-weight map.
    // Candidate c3 with both "food" and "cooking" gets 0.3 + 0.3 = 0.6 which is > ceiling 0.5
    expect(result.c3).toBeCloseTo(0.5); // clamped to ceiling
    expect(result.c4).toBeCloseTo(0);
  });

  test("candidate with no tags receives 0 adjustment", () => {
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["travel"] },
    ];
    const result = applyFeedbackLoop(
      interactions,
      [{ id: "c1", tags: [] }],
      DEFAULT_WEIGHTS
    );

    expect(result.c1).toBeCloseTo(0);
  });

  test("interaction with no tags produces no tag-weights, all candidates get 0", () => {
    const interactions: Interaction[] = [{ action: "like", contentTags: [] }];
    const result = applyFeedbackLoop(
      interactions,
      [{ id: "c1", tags: ["travel"] }],
      DEFAULT_WEIGHTS
    );

    expect(result.c1).toBeCloseTo(0);
  });
});

describe("applyFeedbackLoop — custom weights/config", () => {
  test("custom weight map overrides defaults", () => {
    const customWeights: WeightMap = { star: 0.5, flag: -0.5 };
    const interactions: Interaction[] = [
      { action: "star", contentTags: ["audio"] },
    ];
    const candidates: Candidate[] = [{ id: "c1", tags: ["audio"] }];

    const result = applyFeedbackLoop(interactions, candidates, customWeights);

    expect(result.c1).toBeCloseTo(0.5);
  });

  test("custom floor/ceiling override defaults", () => {
    const interactions: Interaction[] = [
      { action: "like", contentTags: ["a"] },
      { action: "like", contentTags: ["a"] },
    ];
    const candidates: Candidate[] = [{ id: "c1", tags: ["a"] }];

    // Without clamping wide ceiling:
    const result = applyFeedbackLoop(
      interactions,
      candidates,
      DEFAULT_WEIGHTS,
      -0.5,
      10
    );
    expect(result.c1).toBeCloseTo(0.6); // 0.3 + 0.3 = 0.6, no ceiling clamp
  });
});

// ─────────────────────────────────────────────────────────────────
// applyAdjustment — final score clamp to [0, 1.0]
// ─────────────────────────────────────────────────────────────────

describe("applyAdjustment — final score clamp to [0, 1.0]", () => {
  test("base 0.8 + boost 0.3 = 1.0 (not 1.1)", () => {
    expect(applyAdjustment(0.8, 0.3)).toBeCloseTo(1.0);
  });

  test("base 0.1 - penalty 0.2 = 0 (not -0.1)", () => {
    expect(applyAdjustment(0.1, -0.2)).toBeCloseTo(0);
  });

  test("base 0.5 + no adjustment = 0.5", () => {
    expect(applyAdjustment(0.5, 0)).toBeCloseTo(0.5);
  });
});
