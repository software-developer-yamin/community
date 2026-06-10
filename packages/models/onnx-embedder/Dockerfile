# Multi-stage build for bge-small-en-v1.5 embedding service
# Stage 1: install + bundle
# Stage 2: runtime image with ONNX model

FROM oven/bun:1.1.42 AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY src ./src
RUN bun build --compile --minify --sourcemap --bytecode ./src/server.ts --outfile /app/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/server /app/server
ENV MODEL_PATH=/models/bge-small-en-v1.5-int8.onnx
ENV PORT=9100
EXPOSE 9100
CMD ["/app/server"]
