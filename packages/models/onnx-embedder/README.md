# onnx-embedder

Embedding service for F8.2 partner matching. Serves [bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5) as an ONNX INT8 model.

## Why
Semantic matching > tag-based. 384-dim embedding, ~8ms per profile on CPU.

## Endpoints
- `POST /embed` — `{ text: string }` → `{ embedding: number[384], latencyMs: number }`
- `GET /health` — `{ status: "ok", model: "bge-small-en-v1.5-int8" }`

## Run

```bash
# Local
bun install
MODEL_PATH=./models/bge-small-en-v1.5-int8.onnx \
TOKENIZER_PATH=./models/bge-small-tokenizer \
bun run dev

# Docker (via compose in apps/server/)
docker compose -f apps/server/docker-compose.models.yml up embed
```

## Required model files

Place these in the mounted `/models` volume:

```
bge-small-en-v1.5-int8.onnx        # ~35MB, INT8 quantized
bge-small-tokenizer/               # directory from Xenova/bge-small-en-v1.5
├── tokenizer.json
├── tokenizer_config.json
└── vocab.txt
```

Download:
```bash
# Model (INT8)
wget -q https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/onnx/model_qint8_avx512.onnx \
  -O models/bge-small-en-v1.5-int8.onnx

# Tokenizer
git clone https://huggingface.co/Xenova/bge-small-en-v1.5 models/bge-small-en-v1.5-hf
cp -r models/bge-small-en-v1.5-hf/* models/bge-small-tokenizer/
rm -rf models/bge-small-en-v1.5-hf
```

## Memory
- ONNX session: ~400MB resident
- Tokenizer: ~5MB
- Per-request peak: +20MB (ortho tensor)
- Idle RSS: ~450MB

## Tuning
- `intraOpNumThreads`: bump to 2 if CPU has 4+ cores idle
- `max_length`: 256 is enough for profile text, faster
- Batch: this server is single-text. For batch, see F8.4.
