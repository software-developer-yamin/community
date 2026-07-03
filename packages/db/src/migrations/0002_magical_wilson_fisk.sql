CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "user_profile_embedding" ALTER COLUMN "embedding" SET DATA TYPE vector(384) USING embedding::vector(384);--> statement-breakpoint
ALTER TABLE "content_embedding" ALTER COLUMN "embedding" SET DATA TYPE vector(384) USING embedding::vector(384);--> statement-breakpoint
CREATE INDEX "user_profile_embedding_hnsw_idx" ON "user_profile_embedding" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "content_embedding_hnsw_idx" ON "content_embedding" USING hnsw ("embedding" vector_cosine_ops);