# F8.3 — On-Device Inference for Offline BD Users

**Why:** ~30% of BD target users have flaky 3G/4G in district towns (Khulna, Sylhet, Rangpur, Barisal). Server-roundtrip CEFR grading breaks when offline. Real-time pronunciation feedback impossible.
**Stack:** gemma-2-2b-it-Q6 + whisper.cpp + ONNX Runtime. All on-device, MIT/Apache.
**Status:** Deferred to month-2 (after F8.2 lands + measures F8.2 server accuracy)
**Effort:** 6 days
**ICE:** 7 (impact 8, confidence 6, ease 6)
**Metric:** +12% activation in tier-2/3 BD cities; offline placement test completion rate 0% → 35%

## Target devices

- Android: 6GB+ RAM (covers ~80% of BD Android midrange 2024-2026)
- iOS: iPhone 11+ with A13+ (covers ~60% of BD iOS)
- Storage: 1.8GB for model bundle (gemma-2-2b-Q6_K = 1.6GB + whisper-tiny 75MB + bge-small 35MB + wav2vec2 95MB)

## Models (on-device)

| Slot | Model | Size | Tok/s on SD778G | Tok/s on A13 | License |
|---|---|---|---|---|---|
| CEFR + feedback | **gemma-2-2b-it-Q6_K** | 1.6GB | 4.2 | 9.8 | Gemma license (commercial-OK) |
| STT | whisper-tiny-q5_1 | 75MB | 1.2× realtime | 3× realtime | MIT |
| Matching | bge-small-en-v1.5 INT8 | 35MB | 12ms | 8ms | MIT |
| Pronunciation | wav2vec2-base INT8 | 95MB | 380ms / 5sec | 180ms / 5sec | Apache 2.0 |

## Architecture

```
[Mobile] MCQ answers + audio clip
   ↓
[gemma-2-2b on-device via llama.rn / MLX] CEFR grade + feedback (offline-capable)
   ↓
[whisper-tiny] transcript (offline)
   ↓
[wav2vec2 ONNX] pronunciation score (offline)
   ↓
queue: when network returns → sync to server, reconcile if server grade differs >1 CEFR level
```

## Sync + reconciliation

- On reconnect, mobile uploads placement test result + raw audio
- Server runs F8.2 stack (Qwen2.5-7B) as ground truth
- If server grade > mobile grade +1 level, override user profile to server grade + show banner: "We refined your level based on a deeper review"
- If server grade ≤ mobile grade, keep mobile result (don't downgrade user)

## Distribution

- First launch on capable device: download 1.8GB bundle in background over WiFi only
- Persist to `FileSystem.documentDirectory + 'models/'`
- Update on app upgrade if model version changes
- Compress bundle to ~1.1GB with zstd; serve from apps/web `/public/models/`

## Risks

| Risk | Mitigation |
|---|---|
| gemma-2-2b less accurate than Qwen2.5-7B server | server reconciliation overrides |
| 1.8GB download kills 3G users | WiFi-only download, defer to first session, lazy-load on confirm |
| Battery drain during inference | batch 4-5 placements back-to-back, cap single inference to 90s |
| Older Android < 6GB RAM crashes | fallback to server-only mode, show "needs WiFi for first call" |

## Companion

- F8.4 — accent-specific fine-tune of wav2vec2 on 50hr BD-accented English (deferred month-3)
- F8.5 — topic-based rooms (semantic clustering of user goals) (deferred month-3)
- F8.2 — server-side model stack (this spec upgrades F8.1)
