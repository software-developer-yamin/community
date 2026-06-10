# Multi-stage build for wav2vec2-base pronunciation scoring service
FROM oven/bun:1.1.42 AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY src ./src
RUN bun build --compile --minify --sourcemap --bytecode ./src/server.ts --outfile /app/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libgomp1 ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/server /app/server
ENV MODEL_PATH=/models/wav2vec2-base-960h-int8.onnx
ENV PORT=9200
EXPOSE 9200
CMD ["/app/server"]
