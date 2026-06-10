# F8.2 Eval Harness

Runs 3 benchmarks against the live model stack. Exit code gates rollout.

## Usage

```bash
# Run eval (defaults to MODEL_STACK_VERSION=f8.2)
bun run eval

# Compare against F8.1 baseline
MODEL_STACK_VERSION=f8.1 bun run eval

# Weekly CI job
0 9 * * 1 cd /app && bun run eval >> /var/log/acefluency-eval.log 2>&1
```

## Gates

| Benchmark | Gate | Source |
|---|---|---|
| CEFR grader accuracy | ≥ 0.55 (vs F8.1 baseline 0.54) | EFCAMDAT holdout 200 items |
| Pronunciation MAE | < 1.0 (vs human 3-rater avg) | 50 clips w/ ground truth |
| Match recall@10 | ≥ 0.40 (vs F8.1 ~0.20) | 100 historical pairs |

## Datasets

Currently MOCK (6-4 items). For production:

- **CEFR**: source EFCAMDAT from [efcamdat.org](https://efcamdat.org/) (CC-BY-NC). Need to obtain license.
- **Pronunciation**: source 50 BD-accented clips. Collect via in-app opt-in banner (F4.1 follow-up).
- **Match**: derive from past 30d call-pair data. Ground truth = (CEFR ±1) ∧ (≥1 shared interest) ∧ (D7 active).

## Files

- `run.ts` — main entry. Loads datasets, runs benchmarks, logs to `model_eval_runs` table.
- `clients.ts` — HTTP wrappers to local model services.
- `report.ts` — pretty-print pass/fail.
- `datasets/{cefr,pron,match}.ts` — test loaders (MOCK in dev).

## Output

- Stdout: per-benchmark pass/fail with metrics
- DB: `model_eval_runs` row per benchmark with full metrics JSON
- Exit 0 = promote to 100%, exit 1 = keep F8.1 fallback

## Shadow mode

During rollout phase, run eval every 4h to detect drift:

```bash
*/4 * * * * cd /app && bun run eval > /dev/null 2>&1
  && pnpm tsx scripts/notify-on-fail.ts
```
