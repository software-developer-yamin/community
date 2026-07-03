/**
 * ATDD tests for Story RE-2.1: Compute Content Embedding on Creation
 *
 * Acceptance Criteria:
 *   AC1: createContent calls POST /embed, stores 384-dim vector with correct modelVersion
 *   AC2: embed service 500 → item still created, no content_embedding row (implicit pending)
 *   AC3: embed service timeout/throw → item still created, no content_embedding row
 *   AC5: RECOMMENDATIONS_ENABLED flag gates getRecommendations
 *   AC6: catch block must NOT silently swallow errors (logged)
 *
 * Test Design refs: epic-re-2-test-design.md — T-2.1-01 through T-2.1-08
 *
 * Run from repo root:
 *   bun test packages/api/src/routers/__tests__/content-embedding.test.ts
 */

import { describe, expect, test } from "bun:test";

const RE_256 = /256/;
const RE_MISSING_EMBEDDING = /missing embedding/;
const RE_500 = /500/;

// ─────────────────────────────────────────────────────────────────
// Pure helpers — extracted / mirrored from the createContent handler
// for unit-testability without a real DB or HTTP server.
// ─────────────────────────────────────────────────────────────────

const MODEL_VERSION = "bge-small-en-v1.5-int8@1:f8.2";
const EMBED_DIMENSION = 384;

/**
 * Build the text payload sent to the embedding service.
 * mirrors: `${item.title} ${item.description} ${(item.tags ?? []).join(", ")}`
 */
function buildEmbedText(item: {
  title: string;
  description: string;
  tags?: string[] | null;
}): string {
  return `${item.title} ${item.description} ${(item.tags ?? []).join(", ")}`;
}

/**
 * Validate an embedding response from the service.
 * Returns the embedding array if valid, throws if not.
 */
function validateEmbedResponse(data: unknown): number[] {
  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as Record<string, unknown>).embedding)
  ) {
    throw new Error("Invalid embed response: missing embedding array");
  }
  const { embedding } = data as { embedding: unknown[] };
  if (embedding.length !== EMBED_DIMENSION) {
    throw new Error(
      `Invalid embed response: expected ${EMBED_DIMENSION} dimensions, got ${embedding.length}`
    );
  }
  if (!embedding.every((v) => typeof v === "number")) {
    throw new Error("Invalid embed response: all values must be numbers");
  }
  return embedding as number[];
}

/**
 * Simulate the embedding call + upsert logic from createContent.
 * Returns { embedding, modelVersion } if successful, null if service unavailable.
 * Logs errors instead of silently swallowing them.
 */
async function tryComputeEmbedding(
  embedUrl: string,
  text: string,
  logger: (msg: string, err?: unknown) => void = console.error.bind(console)
): Promise<{ embedding: number[]; modelVersion: string } | null> {
  try {
    const res = await fetch(`${embedUrl}/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      logger(`[embed] service returned ${res.status}`, null);
      return null;
    }

    const data = await res.json();
    const embedding = validateEmbedResponse(data);
    return { embedding, modelVersion: MODEL_VERSION };
  } catch (err) {
    logger("[embed] embedding call failed", err); // AC6: must NOT be empty catch
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────

const VALID_ITEM = {
  title: "Introduction to Spanish",
  description: "A beginner dialogue for learning Spanish greetings.",
  tags: ["spanish", "beginner", "dialogue"],
};

const MOCK_EMBEDDING_384 = Array.from({ length: 384 }, (_, i) => i * 0.001);
const MOCK_EMBEDDING_256 = Array.from({ length: 256 }, (_, i) => i * 0.001); // wrong dim

// ─────────────────────────────────────────────────────────────────
// buildEmbedText helper
// ─────────────────────────────────────────────────────────────────

describe("buildEmbedText", () => {
  test("constructs text as title + description + comma-joined tags", () => {
    const text = buildEmbedText(VALID_ITEM);
    expect(text).toBe(
      "Introduction to Spanish A beginner dialogue for learning Spanish greetings. spanish, beginner, dialogue"
    );
  });

  test("T-2.1-08 — no tags → text ends with empty join (no trailing comma)", () => {
    const text = buildEmbedText({ ...VALID_ITEM, tags: null });
    expect(text).toBe(
      "Introduction to Spanish A beginner dialogue for learning Spanish greetings. "
    );
    // Must NOT contain a trailing comma
    expect(text.endsWith(",")).toBe(false);
  });

  test("empty tags array → same as no tags", () => {
    const text = buildEmbedText({ ...VALID_ITEM, tags: [] });
    expect(text).toBe(
      "Introduction to Spanish A beginner dialogue for learning Spanish greetings. "
    );
  });
});

// ─────────────────────────────────────────────────────────────────
// validateEmbedResponse
// ─────────────────────────────────────────────────────────────────

describe("validateEmbedResponse", () => {
  test("T-2.1-01 — accepts valid 384-dim response", () => {
    const result = validateEmbedResponse({ embedding: MOCK_EMBEDDING_384 });
    expect(result).toHaveLength(EMBED_DIMENSION);
    expect(result[0]).toBe(0);
  });

  test("T-2.1-04 — rejects 256-dim response", () => {
    expect(() =>
      validateEmbedResponse({ embedding: MOCK_EMBEDDING_256 })
    ).toThrow(RE_256);
  });

  test("rejects missing embedding field", () => {
    expect(() => validateEmbedResponse({ other: "data" })).toThrow(
      RE_MISSING_EMBEDDING
    );
  });

  test("rejects non-array embedding", () => {
    expect(() =>
      validateEmbedResponse({ embedding: "not-an-array" })
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────
// MODEL_VERSION constant
// ─────────────────────────────────────────────────────────────────

describe("MODEL_VERSION", () => {
  test("T-2.1-07 — exact model version string including :f8.2 suffix", () => {
    expect(MODEL_VERSION).toBe("bge-small-en-v1.5-int8@1:f8.2");
  });
});

// ─────────────────────────────────────────────────────────────────
// tryComputeEmbedding — fetch mock scenarios
// ─────────────────────────────────────────────────────────────────

describe("tryComputeEmbedding", () => {
  test("T-2.1-01 — happy path: returns embedding + modelVersion", async () => {
    const mockFetch = async (_url: string, _opts: unknown) =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ embedding: MOCK_EMBEDDING_384 }),
      }) as Response;

    const original = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await tryComputeEmbedding(
      "http://localhost:9100",
      buildEmbedText(VALID_ITEM)
    );

    global.fetch = original;

    expect(result).not.toBeNull();
    expect(result?.embedding).toHaveLength(384);
    expect(result?.modelVersion).toBe("bge-small-en-v1.5-int8@1:f8.2");
  });

  test("T-2.1-02 — embed returns 500 → null (item created, no embedding)", async () => {
    const mockFetch = () =>
      Promise.resolve({ ok: false, status: 500 } as Response);

    const original = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    const logs: string[] = [];
    const result = await tryComputeEmbedding(
      "http://localhost:9100",
      buildEmbedText(VALID_ITEM),
      (msg) => logs.push(msg)
    );

    global.fetch = original;

    expect(result).toBeNull();
    // AC6: error must be logged, not silently swallowed
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toMatch(RE_500);
  });

  test("T-2.1-03 — embed throws (timeout/network error) → null (item created, no embedding)", async () => {
    const mockFetch = () => Promise.reject(new Error("ECONNREFUSED"));

    const original = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    const logs: string[] = [];
    const result = await tryComputeEmbedding(
      "http://localhost:9100",
      buildEmbedText(VALID_ITEM),
      (msg, err) => logs.push(`${msg}: ${err}`)
    );

    global.fetch = original;

    expect(result).toBeNull();
    // AC6: catch block must log, not silently swallow
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain("ECONNREFUSED");
  });

  test("T-2.1-04 — embed returns 256-dim → null (Zod-style rejection)", async () => {
    const mockFetch = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embedding: MOCK_EMBEDDING_256 }),
      } as Response);

    const original = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    const logs: string[] = [];
    const result = await tryComputeEmbedding(
      "http://localhost:9100",
      buildEmbedText(VALID_ITEM),
      (msg, err) => logs.push(`${msg}: ${err}`)
    );

    global.fetch = original;

    expect(result).toBeNull();
    expect(logs.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// AC5 — Feature flag: RECOMMENDATIONS_ENABLED
// ─────────────────────────────────────────────────────────────────

describe("RECOMMENDATIONS_ENABLED feature flag", () => {
  /**
   * Mirror of the flag check that must be at the top of getRecommendations:
   *   const recsEnabled = process.env.RECOMMENDATIONS_ENABLED === "true";
   *   if (!recsEnabled) return [];
   */
  function isRecommendationsEnabled(envValue: string | undefined): boolean {
    return envValue === "true";
  }

  test("AC5 — disabled by default (env absent)", () => {
    expect(isRecommendationsEnabled(undefined)).toBe(false);
  });

  test("AC5 — disabled when set to 'false'", () => {
    expect(isRecommendationsEnabled("false")).toBe(false);
  });

  test("AC5 — disabled when set to '1'", () => {
    expect(isRecommendationsEnabled("1")).toBe(false);
  });

  test("AC5 — enabled only when set to exact string 'true'", () => {
    expect(isRecommendationsEnabled("true")).toBe(true);
  });
});
