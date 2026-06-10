# onnx-pron

Pronunciation scoring service for F8.2. Serves [wav2vec2-base-960h](https://huggingface.co/facebook/wav2vec2-base-960h) as an ONNX INT8 model.

## Why
Real pronunciation scoring (not just STT). wav2vec2 logits → CTC decode → WER against expected text → CEFR-aligned 0-100 score.

## Endpoints
- `POST /score` — `{ audio_b64, expected, format? }` → `{ score, per_word_errors, phoneme_error_rate, transcript, latencyMs }`
- `GET /health` — `{ status: "ok", model: "wav2vec2-base-960h-int8" }`

## Run

```bash
bun install
MODEL_PATH=./models/wav2vec2-base-960h-int8.onnx bun run dev
```

## Model quantization

```bash
pip install optimum onnx onnxruntime
optimum-cli export onnx \
  --model facebook/wav2vec2-base-960h \
  --task automatic-speech-recognition \
  models/wav2vec2-base-960h-onnx/

python -c "
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic(
  'models/wav2vec2-base-960h-onnx/model.onnx',
  'models/wav2vec2-base-960h-int8.onnx',
  weight_type=QuantType.QInt8,
)
"
```

## Pipeline

```
m4a/wav/webm bytes
   ↓ ffmpeg (subprocess)
16kHz mono Float32 PCM
   ↓ pad/truncate to 240000 samples (15s cap)
wav2vec2 ONNX inference
   ↓ CTC argmax decode
transcript (character-level)
   ↓ WER per word vs expected
{ score: 0-100, per_word_errors, phoneme_error_rate }
```

## Memory
- ONNX session: ~200MB resident
- Per-request: +2MB (PCM buffer)
- Idle RSS: ~250MB

## Known limitations (deferred to F8.4)
- Character-level WER proxy, not true phoneme alignment
- BD-accent over-penalization: subtract baseline WER from 5 native-BD speakers
- No prosody/stress scoring yet

## Tuning
- `intraOpNumThreads`: 2 default, bump to 4 for high-traffic
- `MAX_SAMPLES`: 15s default; lower to 10s for faster response
- ffmpeg codec: enforced via `-f f32le -acodec pcm_f32le`
