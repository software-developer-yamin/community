/**
 * Pronunciation scoring service: wav2vec2-base-960h ONNX INT8
 *
 * POST /score
 *   { audio_b64: string, expected: string }
 *   → { score: number, per_word_errors: [...], phoneme_error_rate: number, latencyMs: number }
 *
 * Pipeline:
 *   audio bytes (m4a/wav/webm) → ffmpeg → 16kHz mono PCM → wav2vec2 → logit argmax → phoneme sequence
 *   expected text → phonemizer-style character/phoneme set
 *   jiwer-style WER against expected
 *   score = max(0, 100 - WER * 150) + small prosody bonus
 *
 * Note: full phoneme-level alignment requires CTC decoding + a tokenizer.
 * For F8.2 we use character-level proxy (good enough for CEFR-aligned scoring,
 * refined in F8.4 with BD-accent fine-tune).
 */

import { spawn } from "node:child_process";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { InferenceSession, Tensor } from "onnxruntime-node";
import { z } from "zod";

const WHITESPACE_RE = /\s+/;

const MODEL_PATH =
  process.env.MODEL_PATH ?? "/models/wav2vec2-base-960h-int8.onnx";
const PORT = Number.parseInt(process.env.PORT ?? "9200", 10);
const TARGET_SR = 16_000;

let session: InferenceSession | null = null;

function loadModel(): Promise<void> {
  if (session) {
    return Promise.resolve();
  }
  return (async () => {
    console.log(`[pron] loading ONNX model from ${MODEL_PATH}`);
    session = await InferenceSession.create(MODEL_PATH, {
      executionMode: "sequential",
      graphOptimizationLevel: "all",
      enableCpuMemArena: true,
      enableMemoryPattern: true,
      intraOpNumThreads: 2,
    });
    console.log(`[pron] ready (inputs: ${session.inputNames.join(", ")})`);
  })();
}

function ffmpegToPcm16k(
  input: Buffer,
  inputFormat: string
): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-f",
      inputFormat,
      "-i",
      "pipe:0",
      "-ac",
      "1",
      "-ar",
      String(TARGET_SR),
      "-f",
      "f32le",
      "-acodec",
      "pcm_f32le",
      "pipe:1",
    ]);
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    ff.stdout.on("data", (c: Buffer) => chunks.push(c));
    ff.stderr.on("data", (c: Buffer) => errChunks.push(c));
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffmpeg exit ${code}: ${Buffer.concat(errChunks).toString()}`
          )
        );
        return;
      }
      const buf = Buffer.concat(chunks);
      // f32le little-endian
      const ab = new ArrayBuffer(buf.length);
      const view = new Uint8Array(ab);
      for (let i = 0; i < buf.length; i++) {
        view[i] = buf[i] ?? 0;
      }
      resolve(new Float32Array(ab));
    });
    ff.stdin.write(input);
    ff.stdin.end();
  });
}

// Greedy CTC-like decoder using argmax over logits.
// For F8.2 we collapse repeats + blanks to characters, then WER against expected.
// wav2vec2-base outputs 29-char vocab (a-z + ' + blank + space token).
const WAV2VEC_VOCAB = [
  "<pad>",
  "|",
  "e",
  "t",
  "a",
  "o",
  "i",
  "n",
  "s",
  "r",
  "h",
  "l",
  "d",
  "c",
  "u",
  "m",
  "w",
  "f",
  "g",
  "y",
  "p",
  "b",
  "v",
  "k",
  "j",
  "x",
  "q",
  "z",
  " ",
];

function ctcDecode(
  logits: Float32Array,
  timeSteps: number,
  vocabSize: number,
  blankId = 0
): string {
  let prev = -1;
  let out = "";
  for (let t = 0; t < timeSteps; t++) {
    let maxIdx = 0;
    let maxVal = Number.NEGATIVE_INFINITY;
    for (let v = 0; v < vocabSize; v++) {
      const val = logits[t * vocabSize + v] ?? Number.NEGATIVE_INFINITY;
      if (val > maxVal) {
        maxVal = val;
        maxIdx = v;
      }
    }
    if (maxIdx !== blankId && maxIdx !== prev) {
      const ch = WAV2VEC_VOCAB[maxIdx];
      if (ch) {
        out += ch;
      }
    }
    prev = maxIdx;
  }
  return out.trim().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }
  const m = a.length;
  const n = b.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost
      );
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j] ?? 0;
    }
  }
  return prev[n] ?? 0;
}

function werPerWord(
  hyp: string,
  ref: string
): Array<{
  word: string;
  wer: number;
  error: "substitution" | "deletion" | "insertion" | "none";
}> {
  const refWords = ref.toLowerCase().split(WHITESPACE_RE).filter(Boolean);
  const hypWords = hyp.toLowerCase().split(WHITESPACE_RE).filter(Boolean);
  return refWords.map((rw, i) => {
    const hw = hypWords[i] ?? "";
    if (!hw) {
      return { word: rw, wer: 1, error: "deletion" as const };
    }
    const dist = levenshtein(rw, hw);
    const w = dist / Math.max(rw.length, 1);
    if (dist === 0) {
      return { word: rw, wer: 0, error: "none" as const };
    }
    if (rw.length === hw.length) {
      return { word: rw, wer: w, error: "substitution" as const };
    }
    return {
      word: rw,
      wer: w,
      error:
        rw.length > hw.length ? ("deletion" as const) : ("insertion" as const),
    };
  });
}

const app = new Hono();

app.get("/health", (c) =>
  c.json({ status: "ok", model: "wav2vec2-base-960h-int8" })
);

const scoreInput = z.object({
  audio_b64: z.string().min(1),
  expected: z.string().min(1).max(200),
  format: z.enum(["m4a", "wav", "webm", "ogg", "mp3"]).default("m4a"),
});

app.post("/score", async (c) => {
  const started = Date.now();
  const body = await c.req.json();
  const { audio_b64, expected, format } = scoreInput.parse(body);

  if (!session) {
    await loadModel();
  }
  if (!session) {
    return c.json({ error: "model_not_loaded" }, 503);
  }

  // Decode base64 → ffmpeg → 16kHz mono PCM float32
  const audioBytes = Buffer.from(audio_b64, "base64");
  let samples: Float32Array;
  try {
    samples = await ffmpegToPcm16k(audioBytes, format);
  } catch (err) {
    return c.json({ error: "decode_failed", detail: String(err) }, 400);
  }

  // wav2vec2 expects fixed-size input; for variable-length we use a max length
  // and pad/truncate. 5 sec @ 16kHz = 80000 samples.
  const MAX_SAMPLES = TARGET_SR * 15; // 15 sec cap
  const inputSamples =
    samples.length > MAX_SAMPLES ? samples.subarray(0, MAX_SAMPLES) : samples;
  const padded = new Float32Array(MAX_SAMPLES);
  for (let i = 0; i < inputSamples.length; i++) {
    padded[i] = inputSamples[i] ?? 0;
  }

  const feeds: Record<string, Tensor> = {
    input_values: new Tensor("float32", padded, [1n, BigInt(MAX_SAMPLES)]),
  };

  let logits: Float32Array;
  let timeSteps: number;
  let vocabSize: number;
  try {
    const out = await session.run(feeds);
    const logitsTensor = out[session.outputNames[0] ?? "logits"];
    if (!logitsTensor?.data) {
      return c.json({ error: "no_logits" }, 500);
    }
    logits = logitsTensor.data as Float32Array;
    timeSteps = logitsTensor.dims[1] ?? 0;
    vocabSize = logitsTensor.dims[2] ?? WAV2VEC_VOCAB.length;
  } catch (err) {
    return c.json({ error: "inference_failed", detail: String(err) }, 500);
  }

  const transcript = ctcDecode(logits, timeSteps, vocabSize);
  const perWord = werPerWord(transcript, expected);
  const totalErr = perWord.reduce((s, w) => s + w.wer, 0);
  const phonemeErrorRate = Math.min(1, totalErr / Math.max(perWord.length, 1));
  const score = Math.max(0, Math.min(100, 100 - phonemeErrorRate * 150));

  return c.json({
    score,
    per_word_errors: perWord,
    phoneme_error_rate: phonemeErrorRate,
    transcript,
    latencyMs: Date.now() - started,
  });
});

loadModel().catch((err) => console.error("[pron] preload failed:", err));
serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" });
console.log(`[pron] listening on :${PORT}`);
