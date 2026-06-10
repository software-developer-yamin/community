/**
 * Model stack router: chooses between F8.1 (baseline) and F8.2 (new) per request.
 *
 * Modes (set via MODEL_STACK_VERSION env var):
 *   - "f8.1": route to F8.1 baseline (Qwen2.5-3B via llama.cpp on F8.1 port)
 *   - "f8.2": route to F8.2 (Qwen2.5-7B, wav2vec2, bge)
 *   - "shadow": compute BOTH, return F8.1 to user, log F8.2 to model_inference_log
 *   - "ab-10": 10% of users get F8.2, 90% F8.1
 *   - "ab-50": 50/50
 *
 * Per-user assignment in A/B mode is sticky via user_id hash mod bucket.
 */

export type ModelStack = "f8.1" | "f8.2" | "shadow" | "ab-10" | "ab-50";

const STACK: ModelStack =
  (process.env.MODEL_STACK_VERSION as ModelStack) ?? "f8.2";

const STACK_TO_URL: Record<
  "f8.1" | "f8.2",
  { llama: string; embed: string; pron: string }
> = {
  "f8.1": {
    llama: process.env.F81_LLAMA_URL ?? "http://127.0.0.1:8081",
    embed: process.env.F81_EMBED_URL ?? "http://127.0.0.1:9101",
    pron: process.env.F81_PRON_URL ?? "http://127.0.0.1:9201",
  },
  "f8.2": {
    llama: process.env.LLAMA_URL ?? "http://127.0.0.1:8080",
    embed: process.env.EMBED_URL ?? "http://127.0.0.1:9100",
    pron: process.env.PRON_URL ?? "http://127.0.0.1:9200",
  },
};

export function pickStack(userId: string): {
  primary: "f8.1" | "f8.2";
  shadow: "f8.1" | "f8.2" | null;
} {
  switch (STACK) {
    case "f8.1":
      return { primary: "f8.1", shadow: null };
    case "f8.2":
      return { primary: "f8.2", shadow: null };
    case "shadow":
      return { primary: "f8.1", shadow: "f8.2" };
    case "ab-10":
      return bucketUser(userId, 10)
        ? { primary: "f8.2", shadow: "f8.1" }
        : { primary: "f8.1", shadow: null };
    case "ab-50":
      return bucketUser(userId, 50)
        ? { primary: "f8.2", shadow: null }
        : { primary: "f8.1", shadow: null };
    default:
      throw new Error(`Unknown MODEL_STACK_VERSION: ${STACK}`);
  }
}

function bucketUser(userId: string, percent: number): boolean {
  // Sticky hash: same user always lands in same bucket
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (Math.imul(hash, 31) + userId.charCodeAt(i)) % 0x7f_ff_ff_ff;
  }
  return hash % 100 < percent;
}

export function getStackUrls(stack: "f8.1" | "f8.2") {
  return STACK_TO_URL[stack];
}

export function currentStack(): ModelStack {
  return STACK;
}
