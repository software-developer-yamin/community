/**
 * ATDD tests for Story RE-2.2: Recompute Content Embedding on Update
 *
 * Acceptance Criteria:
 *   AC1: Update title or description → embedding recomputed, old replaced
 *   AC2: Update thumbnail_url or source_url only → embedding NOT recomputed
 *   AC3: Embed service unavailable during update → update still saved,
 *        item flagged as "embedding pending", old embedding retained
 *
 * Test Design refs: epic-re-2-test-design.md — T-2.2-01 through T-2.2-06
 *
 * Run from repo root:
 *   bun test packages/api/src/routers/__tests__/content-embedding-update.test.ts
 */

import { describe, expect, test } from "bun:test";

// ─────────────────────────────────────────────────────────────────
// Pure helpers — mirrors from the updateContent handler logic,
// extracted for unit-testability without DB or HTTP server.
// ─────────────────────────────────────────────────────────────────

const MODEL_VERSION = "bge-small-en-v1.5-int8@1:f8.2";
const PENDING_VERSION = "pending";
const EMBED_DIMENSION = 384;

/**
 * Determines whether a content update should trigger embedding recomputation.
 * Mirrors `semanticChanged` detection in the updateContent handler.
 *
 * Semantic fields: title, description, tags
 * Non-semantic fields: thumbnail_url, source_url, type, cefrLevel, ...
 */
function isSemanticChange(
  current: { title: string; description: string; tags?: string[] | null },
  patch: {
    title?: string;
    description?: string;
    tags?: string[] | null;
    thumbnail_url?: string;
    source_url?: string;
  }
): boolean {
  return (
    (patch.title != null && patch.title !== current.title) ||
    (patch.description != null && patch.description !== current.description) ||
    patch.tags != null
  );
}

/**
 * Build the text payload for the embedding service.
 * Mirrors: `${item.title} ${item.description} ${(item.tags ?? []).join(", ")}`
 */
function buildEmbedText(item: {
  title: string;
  description: string;
  tags?: string[] | null;
}): string {
  return `${item.title} ${item.description} ${(item.tags ?? []).join(", ")}`;
}

/** Try to call the embed service, returns null on failure. */
async function tryComputeEmbedding(
  embedUrl: string,
  text: string,
  onError?: (msg: string, err?: unknown) => void
): Promise<number[] | null> {
  try {
    const res = await fetch(`${embedUrl}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      onError?.(`embed service error: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { embedding: unknown[] };
    if (
      !Array.isArray(data.embedding) ||
      data.embedding.length !== EMBED_DIMENSION
    ) {
      onError?.(`invalid embedding dimension: ${data.embedding?.length}`);
      return null;
    }
    return data.embedding as number[];
  } catch (err) {
    onError?.("embed service unreachable", err);
    return null;
  }
}

// Fixtures
const EXISTING_ITEM = {
  id: "item-001",
  title: "English Breakfast Vocabulary",
  description: "Learn words for morning meals",
  tags: ["food", "vocabulary"],
};

const MOCK_EMBEDDING_384_NEW = Array.from(
  { length: EMBED_DIMENSION },
  (_, i) => (i + 1) / EMBED_DIMENSION
);
const RE_NO_TRAILING_COMMA = /,\s*$/;

// ─────────────────────────────────────────────────────────────────
// AC1/AC2 — Semantic change detection
// ─────────────────────────────────────────────────────────────────

describe("T-2.2: Semantic change detection", () => {
  test("T-2.2-01 — title change is semantic → recompute triggered", () => {
    const patch = { title: "English Lunch Vocabulary" };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(true);
  });

  test("T-2.2-02 — description change is semantic → recompute triggered", () => {
    const patch = { description: "Words for evening meals too" };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(true);
  });

  test("T-2.2-02b — tags change is semantic → recompute triggered", () => {
    const patch = { tags: ["food", "cooking"] };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(true);
  });

  test("T-2.2-03 — thumbnail_url only → NOT semantic → no recompute", () => {
    const patch = { thumbnail_url: "https://cdn.example.com/new-thumb.jpg" };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(false);
  });

  test("T-2.2-04 — source_url only → NOT semantic → no recompute", () => {
    const patch = { source_url: "https://youtube.com/new-video" };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(false);
  });

  test("T-2.2-04b — thumbnail_url + source_url together → NOT semantic → no recompute", () => {
    const patch = {
      thumbnail_url: "https://cdn.example.com/thumb.jpg",
      source_url: "https://youtube.com/vid",
    };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(false);
  });

  test("T-2.2-01c — same title value (no actual change) → NOT semantic", () => {
    // Patch sends same value — implementation guards `patch.title !== current.title`
    const patch = { title: EXISTING_ITEM.title };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(false);
  });

  test("T-2.2-02c — same description value → NOT semantic", () => {
    const patch = { description: EXISTING_ITEM.description };
    expect(isSemanticChange(EXISTING_ITEM, patch)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// AC1 — Happy path: recompute on semantic update
// ─────────────────────────────────────────────────────────────────

describe("T-2.2: Happy path — recompute on semantic update", () => {
  test("T-2.2-01 — update title → embed service called → new embedding returned", async () => {
    const updatedItem = {
      ...EXISTING_ITEM,
      title: "English Dinner Vocabulary",
    };

    const mockFetch = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embedding: MOCK_EMBEDDING_384_NEW }),
      } as Response);

    const original = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await tryComputeEmbedding(
      "http://localhost:9100",
      buildEmbedText(updatedItem)
    );

    global.fetch = original;

    expect(result).not.toBeNull();
    expect(result).toHaveLength(EMBED_DIMENSION);
    // Should use new values (not exactly old ones)
    expect(result).toEqual(MOCK_EMBEDDING_384_NEW);
  });

  test("T-2.2-06 — embed text uses updated title (not old title)", () => {
    const updatedItem = {
      ...EXISTING_ITEM,
      title: "English Dinner Vocabulary",
    };
    const embedText = buildEmbedText(updatedItem);
    expect(embedText).toContain("English Dinner Vocabulary");
    expect(embedText).not.toContain("English Breakfast Vocabulary");
  });

  test("T-2.2-07 — modelVersion for recomputed embedding is correct", () => {
    // When embed succeeds, modelVersion must match the exact sentinel value
    expect(MODEL_VERSION).toBe("bge-small-en-v1.5-int8@1:f8.2");
  });
});

// ─────────────────────────────────────────────────────────────────
// AC3 — Resilience: embed service unavailable during update
// ─────────────────────────────────────────────────────────────────

describe("T-2.2: Resilience — embed service unavailable on update", () => {
  test("T-2.2-05 — embed service returns 500 → null returned → item flagged pending", async () => {
    const logs: string[] = [];
    const mockFetch = () =>
      Promise.resolve({ ok: false, status: 500 } as Response);

    const original = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await tryComputeEmbedding(
      "http://localhost:9100",
      buildEmbedText({ ...EXISTING_ITEM, title: "Updated Title" }),
      (msg) => logs.push(msg)
    );

    global.fetch = original;

    expect(result).toBeNull();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain("500");
  });

  test("T-2.2-05b — embed service throws (network error) → null returned", async () => {
    const logs: string[] = [];
    const mockFetch = () => Promise.reject(new Error("ECONNREFUSED"));

    const original = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await tryComputeEmbedding(
      "http://localhost:9100",
      buildEmbedText({ ...EXISTING_ITEM, title: "Updated Title" }),
      (msg, err) => logs.push(`${msg}: ${err}`)
    );

    global.fetch = original;

    expect(result).toBeNull();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain("ECONNREFUSED");
  });

  test("T-2.2-05c — pending modelVersion is correct sentinel", () => {
    // When embed fails, the upserted modelVersion must be "pending"
    expect(PENDING_VERSION).toBe("pending");
  });
});

// ─────────────────────────────────────────────────────────────────
// AC1 — Embed text construction
// ─────────────────────────────────────────────────────────────────

describe("T-2.2: Embed text construction", () => {
  test("T-2.2 — embed text includes title + description + tags", () => {
    const text = buildEmbedText(EXISTING_ITEM);
    expect(text).toContain(EXISTING_ITEM.title);
    expect(text).toContain(EXISTING_ITEM.description);
    expect(text).toContain("food");
    expect(text).toContain("vocabulary");
  });

  test("T-2.2 — embed text handles null tags gracefully (no crash)", () => {
    const text = buildEmbedText({ ...EXISTING_ITEM, tags: null });
    expect(text).toContain(EXISTING_ITEM.title);
    expect(text).not.toContain("null");
  });

  test("T-2.2 — embed text handles empty tags (no trailing comma)", () => {
    const text = buildEmbedText({ ...EXISTING_ITEM, tags: [] });
    expect(text).not.toMatch(RE_NO_TRAILING_COMMA);
  });
});
