export interface EvalResult {
  gate: string;
  metrics: Record<string, number | string>;
  name: string;
  passed: boolean;
}

export function logResult(results: EvalResult[], allPassed: boolean): void {
  console.log("\n=== F8.2 Eval Results ===\n");
  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    const metricsStr = Object.entries(r.metrics)
      .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(3) : v}`)
      .join(", ");
    console.log(`  [${status}] ${r.name.padEnd(20)} ${metricsStr}`);
    console.log(`           gate: ${r.gate}`);
  }
  console.log(
    `\n  OVERALL: ${allPassed ? "PASS — promote to 100%" : "FAIL — keep F8.1 fallback"}\n`
  );
}
