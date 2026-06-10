# F8.4 — Bangladesh-Accented Pronunciation Fine-Tune

**Status:** spec (1 day, no code in this doc)
**Owns:** `apps/server/models/wav2vec2-bd/` artifacts
**Depends on:** F8.2 (deploys on top of F8.2 ONNX pron service)
**Replaces:** F8.2 `onnx-pron` model with BD-fine-tuned variant

---

## 1. Problem

F8.2's pronunciation scorer is `wav2vec2-base-960h` (LibriSpeech, US/UK English).
Bangladesh learners have distinct phonological patterns:

- **Rhotacism / L-drop**: "r" pronounced as "l" or "w" (e.g., "rice" → "lice")
- **Vowel mergers**: short-a / long-a not distinguished ("bat" vs "bought")
- **Aspirated stops**: heavier aspiration on /p, t, k/ (e.g., "top" → "thop")
- **Velar /dʒ/ → /dz/**: "job" → "zobe"
- **Word-final consonant devoicing**: voiced stops devoiced word-finally

These are NOT errors — they're first-language interference patterns.
LibriSpeech-trained model scores them as "wrong" because phoneme output drifts from canonical.
Result: BD users see false-low pronunciation scores → F5.3 churn.

**Quantify:** 60% of in-app pron scores for BD-flagged users fall in the "needs improvement" band, vs 20% for non-BD users (F4.1 telemetry hypothesis, not yet measured).

## 2. Goal

Build a BD-accented wav2vec2 fine-tune that:
1. Recognizes BD phonological patterns as valid English variants, not errors.
2. Surfaces ONLY canonical-vs-BD divergences that impact intelligibility.
3. Improves BD-user pron score MAE from ~1.4 → <1.0 (vs human 3-rater avg).

## 3. Approach

### 3.1 Base model
Start from `wav2vec2-base-960h` (95MB ONNX INT8, already deployed in F8.2).
NOT a new architecture — same size, same inference cost.

### 3.2 Training data

**Primary corpus — Mozilla Common Voice BD subset** (CC0, ~8 hours, free):
- Filter for `accent = "Bangladeshi English"`, `upvotes >= 2`, `downvotes = 0`.
- ~3,000 utterances, ~3 hours. Quality: medium (crowd-sourced, noisy).

**Secondary corpus — L2-ARCTIC BD subset** (CC-BY, ~3 hours, free):
- 5 speakers, studio-recorded, transcribed.
- Cleaner signal, fewer utterances.

**Synthetic augmentation** (script in `scripts/augment-bd-corpus.py`):
- Apply BD phonological substitutions to L1 audio:
  - /ɹ/ → /l/ in coda position (50% prob)
  - /æ/ → /a/ (40% prob)
  - Add aspiration to /p, t, k/ (pre-emphasis filter)
  - Final-devoicing for /b, d, g/ (30% prob word-final)
- Multiply data 3x. Captures BD patterns without recording new audio.

**Target total:** ~10-12 hours labeled audio.

### 3.3 Training pipeline

```python
# scripts/train-bd-pron.py
# 1 epoch, lr=3e-5, batch=4, fp16, 1x A100 (rent 2hr @ $1.20)
base = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h")
processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")

# Freeze CNN encoder, fine-tune transformer + CTC head
for param in base.wav2vec2.feature_encoder.parameters():
    param.requires_grad = False

trainer = Trainer(
    model=base,
    args=TrainingArguments(
        num_train_epochs=1,
        per_device_train_batch_size=4,
        learning_rate=3e-5,
        fp16=True,
        output_dir="/tmp/bd-pron-finetune",
    ),
    train_dataset=combined_corpus,
    data_collator=DataCollatorCTCWithPadding(processor=processor),
)
trainer.train()
```

Export to ONNX INT8 → `/apps/server/models/wav2vec2-bd/`.

### 3.4 Cost
- GPU: Lambda 1x A100, 2hr @ $0.60/hr = **$1.20 per training run**.
- Augmentation script: free (CPU, ~20 min).
- ONNX export: free (CPU, ~5 min).
- **Total: $1.20 + 1 dev-day.**

### 3.5 License compliance
- Common Voice: CC0 — no attribution required, redistribution OK.
- L2-ARCTIC: CC-BY — include attribution in `models/wav2vec2-bd/LICENSE`.
- Synthetic augmentation: generated, no license (US-ARCTIC phonological rules are public linguistics).
- Final model weights: derived from `facebook/wav2vec2-base-960h` (Apache 2.0).
  Derivative works allowed with notice. Add to NOTICE file.

## 4. Deployment

After fine-tune completes:

1. Replace `apps/server/models/wav2vec2-base/model.onnx` with `wav2vec2-bd/model.onnx`.
2. Bump `PRON_MODEL_VERSION=bd-v1` in `apps/server/.env`.
3. ONNX pron service hot-reloads on env change (no rebuild needed).
4. Eval harness (`packages/models/eval/datasets/pron.ts`) gains a new MOCK 3 items for BD-specific patterns.

## 5. Telemetry

Add to `model_inference_log.metadata`:
```json
{
  "model_version": "bd-v1",
  "user_locale": "bn-BD",
  "phoneme_drift": 0.42,        // avg CTC frame error vs canonical
  "bd_substitutions_hit": 3,    // counted: /ɹ/→/l/, /æ/→/a/, etc.
  "score_band": "improving"
}
```

Track BD-user pron score distribution before/after. Goal: BD-user "needs improvement" rate drops from 60% → 35%.

## 6. Rollout

| Stage | Day | Gate |
|---|---|---|
| Train + ship to shadow | 0 | Eval harness passes on new MOCK dataset |
| A/B 10% BD users | 1-3 | BD-user pron score avg +0.2 vs F8.2 baseline |
| A/B 50% BD users | 4-7 | Same gate |
| 100% BD users | 8+ | Hold 50/50 for 1 more week, then promote |

Non-BD users: keep F8.2 base model. (L1-Standard-English users benefit from canonical scoring; only BD users see the BD-fine-tuned model.)

Routing: extend `pickStack` in [model-stack.ts](file:///home/yamin/Documents/Yamin%20Company/community/packages/api/src/lib/model-stack.ts) to return `pronModel = "base" | "bd"` based on `user.locale`.

## 7. What this does NOT solve

- Lexical errors (wrong word choice) — solved by F3.1 call feedback.
- Grammar errors — solved by F8.2 CEFR grader.
- Pronunciation for non-BD accents (Indian, Nigerian, Singaporean) — separate fine-tune each, defer to F8.5+.
- Real-time accent coaching during call — separate spec (F8.6+).

## 8. Open questions

- **Augmentation ratio**: 1x BD + 1x synthetic or 1:3? Need to A/B test in training.
- **Should non-BD users also get a "neutral intl" fine-tune?** Defer. Focus on highest-need cohort first.
- **BD-accented speech data quality**: Common Voice BD has noise. Worth recording 1-2hr studio ourselves? ~$50 + 2 dev-days. Defer; re-evaluate after F8.4 ships.

## 9. Files (when implemented)

- `apps/server/models/wav2vec2-bd/model.onnx` (~95MB, INT8)
- `apps/server/models/wav2vec2-bd/config.json`
- `apps/server/models/wav2vec2-bd/LICENSE` (Apache 2.0 + Common Voice CC0 + L2-ARCTIC CC-BY)
- `apps/server/models/wav2vec2-bd/NOTICE` (model card summary)
- `scripts/train-bd-pron.py` (training entry)
- `scripts/augment-bd-corpus.py` (synthetic data generation)
- `scripts/export-onnx-int8.py` (conversion + quantization)
- `packages/models/eval/datasets/pron.ts` (extend with BD-specific MOCK)

## 10. Anti-goals

- Do NOT build a new architecture. Same wav2vec2 base, fine-tune only.
- Do NOT train on proprietary accent datasets (cost >$500, not needed for MVP).
- Do NOT replace LibriSpeech phoneme dictionary. Use the same CTC head.
- Do NOT ship to non-BD users without A/B test confirming no regression.
