ALTER TABLE "refund_request" ADD COLUMN "payment_transaction_id" text;--> statement-breakpoint
ALTER TABLE "refund_request" ADD COLUMN "refund_amount" integer;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_payment_transaction_id_payment_transaction_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refund_request_payment_transaction_idx" ON "refund_request" USING btree ("payment_transaction_id");