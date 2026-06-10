# F8.2 model downloads (one-time, ~6GB)

```bash
mkdir -p apps/server/models && cd apps/server/models

# Qwen2.5-7B (Apache 2.0) — 4.7GB
wget -q --show-progress https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q5_K_M.gguf

# Whisper base.en (MIT) — 140MB
wget -q --show-progress https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin

# bge-small-en-v1.5 INT8 (MIT) — 35MB
wget -q --show-progress https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/onnx/model_qint8_avx512.onnx -O bge-small-en-v1.5-int8.onnx
# (fallback: model.onnx if INT8 not available)

# wav2vec2-base-960h INT8 (Apache 2.0) — 95MB
# Quantize from HF: optimum-cli export onnx --model facebook/wav2vec2-base-960h --task automatic-speech-recognition
# then quantize via onnxruntime.quantization. See scripts/quantize-wav2vec2.py
```

After download, verify checksums:

```bash
sha256sum *.gguf *.bin *.onnx > CHECKSUMS.txt
```

## Disk usage

```
5.0G  qwen2.5-7b-instruct-q5_k_m.gguf
140M  ggml-base.en.bin
 35M  bge-small-en-v1.5-int8.onnx
 95M  wav2vec2-base-960h-int8.onnx
-----
5.3G  total
```

## First-boot test

```bash
# Start stack
docker compose -f apps/server/docker-compose.models.yml up -d

# Wait for health
sleep 30

# LLM
curl -s http://127.0.0.1:8080/health
# → {"status":"ok"}

curl -s -X POST http://127.0.0.1:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-7b-instruct","messages":[{"role":"user","content":"Say hi in 5 words."}],"max_tokens":20}' | jq

# Embedder
curl -s -X POST http://127.0.0.1:9100/embed \
  -H 'content-type: application/json' \
  -d '{"text":"hello world"}' | jq '.embedding | length'
# → 384

# Pron scorer (needs real audio bytes — see packages/models/onnx-pron/README.md)
```
