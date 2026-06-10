/**
 * F8.2 Eval Harness
 *
 * Runs three benchmarks against the live model stack:
 *   1. CEFR grader accuracy on EFCAMDAT-style held-out set
 *   2. Pronunciation scorer MAE vs human raters
 *   3. Match recall@10 on holdout partner graph
 *
 * Exit code 0 = pass, 1 = fail (gates rollout).
 *
 * Usage:
 *   bun run eval
 *   MODEL_STACK_VERSION=f8.1 bun run eval   # compare against baseline
 */

import { db } from "@community/db";
import { modelEvalRuns } from "@community/db/schema/models";
import { gradeCEFR, matchPartners, scorePronunciation } from "./clients";
import { loadCefrTest } from "./datasets/cefr";
import { loadMatchTest } from "./datasets/match";
import { loadPronTest } from "./datasets/pron";
import { type EvalResult, logResult } from "./report";

const GATES = {
  cefrAccMin: 0.55,
  pronMaeMax: 1.0,
  matchRecallMin: 0.4,
  latencyP95Max: 60_000, // ms (CEFR grade is async)
};

async function main() {
  const stack = process.env.MODEL_STACK_VERSION ?? "f8.2";
  console.log(`[eval] stack=${stack}`);
  const results: EvalResult[] = [];

  // 1. CEFR grader
  console.log("[eval] running CEFR grader benchmark...");
  const cefrTest = await loadCefrTest(200);
  let correct = 0;
  const cefrLatencies: number[] = [];
  for (const item of cefrTest) {
    const { cefr, latencyMs } = await gradeCEFR({
      transcript: item.transcript,
      priorCefr: item.priorCefr,
      difficulty: 5,
    });
    cefrLatencies.push(latencyMs);
    if (cefr === item.expectedCefr) {
      correct++;
    }
  }
  const cefrAcc = correct / cefrTest.length;
  const cefrLatencyP95 = percentile(cefrLatencies, 0.95);
  results.push({
    name: "cefr-grader",
    passed: cefrAcc >= GATES.cefrAccMin,
    metrics: {
      accuracy: cefrAcc,
      sampleSize: cefrTest.length,
      latencyP95Ms: cefrLatencyP95,
    },
    gate: `accuracy ≥ ${GATES.cefrAccMin}`,
  });

  // 2. Pronunciation scorer
  console.log("[eval] running pronunciation scorer benchmark...");
  const pronTest = await loadPronTest(50);
  let totalErr = 0;
  for (const item of pronTest) {
    const { score } = await scorePronunciation({
      audioUrl: item.audioUrl,
      expectedText: item.expectedText,
    });
    totalErr += Math.abs(score - item.humanAvgScore);
  }
  const pronMae = totalErr / pronTest.length;
  results.push({
    name: "pron-scorer",
    passed: pronMae < GATES.pronMaeMax,
    metrics: { mae: pronMae, sampleSize: pronTest.length },
    gate: `MAE < ${GATES.pronMaeMax}`,
  });

  // 3. Match recall@10
  console.log("[eval] running match recall@10 benchmark...");
  const matchTest = await loadMatchTest(100);
  let hits = 0;
  for (const item of matchTest) {
    const { partners } = await matchPartners({
      userId: item.userId,
      limit: 10,
    });
    if (partners.some((p) => p.id === item.groundTruthPartnerId)) {
      hits++;
    }
  }
  const matchRecall = hits / matchTest.length;
  results.push({
    name: "match-recall",
    passed: matchRecall >= GATES.matchRecallMin,
    metrics: { recall: matchRecall, sampleSize: matchTest.length },
    gate: `recall@10 ≥ ${GATES.matchRecallMin}`,
  });

  // Aggregate + log to DB
  const allPassed = results.every((r) => r.passed);
  for (const r of results) {
    await db.insert(modelEvalRuns).values({
      modelName: stack,
      evalSet: r.name,
      metrics: r.metrics,
      sampleSize: r.metrics.sampleSize ?? 0,
      ranBy: "eval-harness",
    });
  }

  logResult(results, allPassed);
  process.exit(allPassed ? 0 : 1);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) {
    return 0;
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

main().catch((err) => {
  console.error("[eval] fatal:", err);
  process.exit(2);
});
