CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "payment_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"tran_id" text NOT NULL,
	"val_id" text,
	"bank_tran_id" text,
	"session_key" text,
	"tier" "tier" NOT NULL,
	"billing_period" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"status" "payment_transaction_status" DEFAULT 'pending' NOT NULL,
	"risk_level" integer,
	"fail_reason" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transaction_tran_id_unique" UNIQUE("tran_id")
);
--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."payment_provider";--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('sslcommerz', 'bkash', 'stripe');--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "provider" SET DATA TYPE "public"."payment_provider" USING "provider"::"public"."payment_provider";--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "flagged_for_review" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_transaction_user_idx" ON "payment_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_transaction_tran_id_idx" ON "payment_transaction" USING btree ("tran_id");--> statement-breakpoint
CREATE INDEX "payment_transaction_status_idx" ON "payment_transaction" USING btree ("status");