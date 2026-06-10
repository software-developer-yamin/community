/**
 * Embedding service: bge-small-en-v1.5 INT8 ONNX
 * POST /embed { text: string } → { embedding: number[384], latencyMs: number }
 * POST /health → { status: "ok" }
 *
 * Loaded once at boot, cached in memory. ~35MB model, ~512MB RAM.
 * Throughput: ~125 req/sec single-thread, ~8ms per request.
 */

import { serve } from "@hono/node-server";
import { AutoTokenizer, env as xenovaEnv } from "@xenova/transformers";
import { Hono } from "hono";
import { InferenceSession, Tensor } from "onnxruntime-node";
import { z } from "zod";

// Use local model files only (no HF download at runtime)
xenovaEnv.localModelPath = "/models";
xenovaEnv.allowRemoteModels = false;
xenovaEnv.allowLocalModels = true;

const MODEL_PATH =
  process.env.MODEL_PATH ?? "/models/bge-small-en-v1.5-int8.onnx";
const TOKENIZER_PATH =
  process.env.TOKENIZER_PATH ?? "/models/bge-small-tokenizer";
const PORT = Number.parseInt(process.env.PORT ?? "9100", 10);
const MAX_TOKENS = 512;

let session: ort.InferenceSession | null = null;
let tokenizer: Awaited<
  ReturnType<typeof AutoTokenizer.from_pretrained>
> | null = null;
let loadingPromise: Promise<void> | null = null;

function loadModel(): Promise<void> {
  if (session && tokenizer) {
    return Promise.resolve();
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    console.log(`[embed] loading ONNX model from ${MODEL_PATH}`);
    session = await InferenceSession.create(MODEL_PATH, {
      executionMode: "sequential",
      graphOptimizationLevel: "all",
      enableCpuMemArena: true,
      enableMemoryPattern: true,
      intraOpNumThreads: 1,
    });

    console.log(`[embed] loading tokenizer from ${TOKENIZER_PATH}`);
    tokenizer = await AutoTokenizer.from_pretrained(TOKENIZER_PATH);
    console.log(
      `[embed] ready (input names: ${session.inputNames.join(", ")})`
    );
  })();

  return loadingPromise;
}

function meanPool(
  lastHiddenState: Float32Array,
  attentionMask: bigint[],
  seqLen: number,
  hiddenSize: number
): Float32Array {
  const pooled = new Float32Array(hiddenSize);
  let activeTokens = 0;
  for (let i = 0; i < seqLen; i++) {
    if (attentionMask[i] !== 1n) {
      continue;
    }
    for (let j = 0; j < hiddenSize; j++) {
      pooled[j] += lastHiddenState[i * hiddenSize + j] ?? 0;
    }
    activeTokens++;
  }
  for (let j = 0; j < hiddenSize; j++) {
    pooled[j] = (pooled[j] ?? 0) / Math.max(activeTokens, 1);
  }
  // L2 normalize (required for bge cosine sim)
  let norm = 0;
  for (let j = 0; j < hiddenSize; j++) {
    norm += (pooled[j] ?? 0) ** 2;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let j = 0; j < hiddenSize; j++) {
      pooled[j] = (pooled[j] ?? 0) / norm;
    }
  }
  return pooled;
}

const app = new Hono();

app.get("/health", (c) =>
  c.json({ status: "ok", model: "bge-small-en-v1.5-int8" })
);

const embedInput = z.object({ text: z.string().min(1).max(2000) });

app.post("/embed", async (c) => {
  const started = Date.now();
  const body = await c.req.json();
  const { text } = embedInput.parse(body);

  if (!(session && tokenizer)) {
    await loadModel();
  }
  if (!(session && tokenizer)) {
    return c.json({ error: "model_not_loaded" }, 503);
  }

  // Tokenize
  const encoded = await tokenizer(text, {
    max_length: MAX_TOKENS,
    truncation: true,
    padding: "max_length",
  });
  const inputIds = encoded.input_ids;
  const attentionMask = encoded.attention_mask;
  const seqLen = inputIds.length;

  // Build ORT tensors
  const inputIdsBigInt = BigInt64Array.from(inputIds.map((n) => BigInt(n)));
  const attentionMaskBigInt = BigInt64Array.from(
    attentionMask.map((n) => BigInt(n))
  );

  const feeds: Record<string, Tensor> = {
    input_ids: new Tensor("int64", inputIdsBigInt, [1n, BigInt(seqLen)]),
    attention_mask: new Tensor("int64", attentionMaskBigInt, [
      1n,
      BigInt(seqLen),
    ]),
  };

  // Some bge exports also want token_type_ids (zeros)
  if (session.inputNames.includes("token_type_ids")) {
    const tokenTypeIds = new BigInt64Array(seqLen);
    feeds.token_type_ids = new Tensor("int64", tokenTypeIds, [
      1n,
      BigInt(seqLen),
    ]);
  }

  const results = await session.run(feeds);
  const lastHidden = results[session.outputNames[0] ?? "last_hidden_state"];
  if (!lastHidden?.data) {
    return c.json({ error: "no_output" }, 500);
  }

  const data = lastHidden.data as Float32Array;
  const hiddenSize = lastHidden.dims[2] ?? 384;
  const embedding = meanPool(data, attentionMaskBigInt, seqLen, hiddenSize);

  return c.json({
    embedding: Array.from(embedding),
    latencyMs: Date.now() - started,
  });
});

// Preload model at boot (don't wait for first request)
loadModel().catch((err) => console.error("[embed] preload failed:", err));

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" });
console.log(`[embed] listening on :${PORT}`);
