/**
 * HTTP clients to local model services.
 * Wraps fetch with timeout + error normalization.
 */

const TIMEOUT_MS = 90_000;

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} from ${url}: ${text}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const LLAMA_URL = process.env.LLAMA_URL ?? "http://127.0.0.1:8080";
const EMBED_URL = process.env.EMBED_URL ?? "http://127.0.0.1:9100";
const PRON_URL = process.env.PRON_URL ?? "http://127.0.0.1:9200";

export interface GradeCefrInput {
  difficulty: number;
  priorCefr?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  transcript: string;
}

export interface GradeCefrOutput {
  cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  latencyMs: number;
  score: number;
}

export function gradeCEFR(input: GradeCefrInput): Promise<GradeCefrOutput> {
  return call<GradeCefrOutput>(`${LLAMA_URL}/v1/grade-cefr`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export interface ScorePronInput {
  audioUrl: string;
  expectedText: string;
}

export interface ScorePronOutput {
  latencyMs: number;
  score: number;
}

export async function scorePronunciation(
  input: ScorePronInput
): Promise<ScorePronOutput> {
  // Server endpoint: POST /api-reference/models/scorePronunciation
  // But for direct test we hit the local service:
  const audioRes = await fetch(input.audioUrl);
  const audioBytes = new Uint8Array(await audioRes.arrayBuffer());
  const audioB64 = Buffer.from(audioBytes).toString("base64");
  return call<ScorePronOutput>(`${PRON_URL}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audio_b64: audioB64, expected: input.expectedText }),
  });
}

export interface MatchPartnerInput {
  limit: number;
  userId: string;
}

export interface MatchPartnerOutput {
  latencyMs: number;
  partners: Array<{ id: string }>;
}

export function matchPartners(
  input: MatchPartnerInput
): Promise<MatchPartnerOutput> {
  return call<MatchPartnerOutput>(`${EMBED_URL}/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
