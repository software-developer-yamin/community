CREATE TYPE "public"."call_end_reason" AS ENUM('user_ended', 'partner_ended', 'connection_lost', 'skip', 'timeout', 'system_error');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('pending', 'connecting', 'active', 'reconnecting', 'ended', 'failed');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'nonbinary', 'undisclosed');--> statement-breakpoint
CREATE TYPE "public"."moderation_state" AS ENUM('clean', 'warned', 'cooldown', 'suspended', 'banned');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('sslcommerz', 'razorpay');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'auto_approved', 'auto_denied', 'human_review', 'approved', 'denied', 'processing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'pending', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('free', 'premium', 'premium_plus');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_record" (
	"id" text PRIMARY KEY NOT NULL,
	"room_name" text NOT NULL,
	"match_id" text NOT NULL,
	"ended_by_user_id" text,
	"end_reason" text NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"duration_sec" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cefr_placement" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"level" text NOT NULL,
	"score" integer NOT NULL,
	"source" text NOT NULL,
	"model_version" text NOT NULL,
	"transcript" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_eval_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"model_name" text NOT NULL,
	"eval_set" text NOT NULL,
	"metrics" jsonb NOT NULL,
	"sample_size" integer NOT NULL,
	"ran_at" timestamp DEFAULT now() NOT NULL,
	"ran_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_inference_log" (
	"id" text PRIMARY KEY NOT NULL,
	"model_name" text NOT NULL,
	"input_hash" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer NOT NULL,
	"user_id" text,
	"call_kind" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pronunciation_score" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"audio_path" text NOT NULL,
	"expected_text" text NOT NULL,
	"score" integer NOT NULL,
	"per_word_errors" jsonb,
	"model_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile_embedding" (
	"user_id" text PRIMARY KEY NOT NULL,
	"embedding" real[] NOT NULL,
	"model_version" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_rating" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"call_room_id" text NOT NULL,
	"stars" integer NOT NULL,
	"helped_practice" integer,
	"comment" text,
	"anonymized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_room" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"room_name" text NOT NULL,
	"participant_a" text NOT NULL,
	"participant_b" text NOT NULL,
	"status" "call_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"end_reason" "call_end_reason",
	"ended_by" text,
	"duration" integer,
	"reconnect_count" integer DEFAULT 0 NOT NULL,
	"last_reconnect_at" timestamp,
	"avg_round_trip_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "call_room_match_id_unique" UNIQUE("match_id")
);
--> statement-breakpoint
CREATE TABLE "crash_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"app_version" text,
	"os_version" text,
	"device_model" text,
	"stack_trace" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"partner_id" text NOT NULL,
	"call_room_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"path" text NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"trigger_crashes" integer,
	"trigger_login_failure" integer,
	"trigger_never_connected" integer,
	"trigger_completed_sessions" integer,
	"trigger_days_since_charge" integer,
	"denial_reason" text,
	"approval_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"provider_refund_id" text,
	"provider_refund_status" text,
	"provider_refund_attempts" integer DEFAULT 0 NOT NULL,
	"last_refund_attempt_at" timestamp,
	"sla_deadline" timestamp NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strike_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"call_room_id" text NOT NULL,
	"trigger_type" text NOT NULL,
	"call_duration" integer,
	"voided_at" timestamp,
	"voided_reason" text,
	"report_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tier" "tier" NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"auto_renew" integer DEFAULT 1 NOT NULL,
	"auto_renew_disabled_at" timestamp,
	"status" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"user_tier" "tier" NOT NULL,
	"sla_deadline" timestamp NOT NULL,
	"first_response_at" timestamp,
	"first_response_by" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"thread_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_ticket_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "support_ticket_message" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"sender_role" text NOT NULL,
	"body" text NOT NULL,
	"is_internal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"gender" "gender",
	"gender_preference" "gender",
	"native_language" text DEFAULT 'bn' NOT NULL,
	"tier" "tier" DEFAULT 'free' NOT NULL,
	"tier_expires_at" timestamp,
	"moderation_state" "moderation_state" DEFAULT 'clean' NOT NULL,
	"cooldown_until" timestamp,
	"strike_count" integer DEFAULT 0 NOT NULL,
	"last_strike_at" timestamp,
	"onboarding_completed" integer DEFAULT 0 NOT NULL,
	"cefr_level" text,
	"phone_number" text,
	"phone_verified" integer DEFAULT 0 NOT NULL,
	"total_call_count" integer DEFAULT 0 NOT NULL,
	"total_call_duration" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_embedding" (
	"content_id" text PRIMARY KEY NOT NULL,
	"embedding" real[] NOT NULL,
	"model_version" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_item" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"cefr_level" text NOT NULL,
	"source_url" text,
	"thumbnail_url" text,
	"duration" integer,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_score" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"score" real NOT NULL,
	"score_type" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "rec_score_user_content_idx" UNIQUE("user_id","content_id","score_type")
);
--> statement-breakpoint
CREATE TABLE "user_interaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"action" text NOT NULL,
	"value" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_interaction_unique_idx" UNIQUE("user_id","content_id","action")
);
--> statement-breakpoint
CREATE TABLE "user_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"interests" text[] DEFAULT '{}' NOT NULL,
	"goals" text[] DEFAULT '{}' NOT NULL,
	"preferred_types" text[] DEFAULT '{}' NOT NULL,
	"preferred_cefr" text,
	"daily_goal" integer DEFAULT 15 NOT NULL,
	"notifications" jsonb DEFAULT '{"dailyReminder":true,"newContent":true,"progressUpdates":true}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_record" ADD CONSTRAINT "call_record_ended_by_user_id_user_id_fk" FOREIGN KEY ("ended_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cefr_placement" ADD CONSTRAINT "cefr_placement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_inference_log" ADD CONSTRAINT "model_inference_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_score" ADD CONSTRAINT "pronunciation_score_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile_embedding" ADD CONSTRAINT "user_profile_embedding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_rating" ADD CONSTRAINT "call_rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_rating" ADD CONSTRAINT "call_rating_partner_id_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_rating" ADD CONSTRAINT "call_rating_call_room_id_call_room_id_fk" FOREIGN KEY ("call_room_id") REFERENCES "public"."call_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_room" ADD CONSTRAINT "call_room_participant_a_user_id_fk" FOREIGN KEY ("participant_a") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_room" ADD CONSTRAINT "call_room_participant_b_user_id_fk" FOREIGN KEY ("participant_b") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_room" ADD CONSTRAINT "call_room_ended_by_user_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crash_event" ADD CONSTRAINT "crash_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_report" ADD CONSTRAINT "partner_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_report" ADD CONSTRAINT "partner_report_partner_id_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_report" ADD CONSTRAINT "partner_report_call_room_id_call_room_id_fk" FOREIGN KEY ("call_room_id") REFERENCES "public"."call_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strike_event" ADD CONSTRAINT "strike_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strike_event" ADD CONSTRAINT "strike_event_call_room_id_call_room_id_fk" FOREIGN KEY ("call_room_id") REFERENCES "public"."call_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_message" ADD CONSTRAINT "support_ticket_message_ticket_id_support_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_message" ADD CONSTRAINT "support_ticket_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_embedding" ADD CONSTRAINT "content_embedding_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_score" ADD CONSTRAINT "recommendation_score_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_score" ADD CONSTRAINT "recommendation_score_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interaction" ADD CONSTRAINT "user_interaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interaction" ADD CONSTRAINT "user_interaction_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expiresAt_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "cefr_placement_user_idx" ON "cefr_placement" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "model_inference_log_model_idx" ON "model_inference_log" USING btree ("model_name","created_at");--> statement-breakpoint
CREATE INDEX "model_inference_log_user_idx" ON "model_inference_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "model_inference_log_kind_idx" ON "model_inference_log" USING btree ("call_kind","created_at");--> statement-breakpoint
CREATE INDEX "pronunciation_score_user_idx" ON "pronunciation_score" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "call_rating_user_idx" ON "call_rating" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "call_rating_partner_idx" ON "call_rating" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "call_rating_call_idx" ON "call_rating" USING btree ("call_room_id");--> statement-breakpoint
CREATE INDEX "call_room_match_idx" ON "call_room" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "call_room_participant_a_idx" ON "call_room" USING btree ("participant_a");--> statement-breakpoint
CREATE INDEX "call_room_participant_b_idx" ON "call_room" USING btree ("participant_b");--> statement-breakpoint
CREATE INDEX "call_room_status_idx" ON "call_room" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crash_event_user_idx" ON "crash_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "partner_report_reporter_idx" ON "partner_report" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "partner_report_partner_idx" ON "partner_report" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_report_call_idx" ON "partner_report" USING btree ("call_room_id");--> statement-breakpoint
CREATE INDEX "refund_request_user_idx" ON "refund_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refund_request_status_idx" ON "refund_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refund_request_sla_idx" ON "refund_request" USING btree ("sla_deadline");--> statement-breakpoint
CREATE INDEX "strike_event_user_idx" ON "strike_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "strike_event_call_idx" ON "strike_event" USING btree ("call_room_id");--> statement-breakpoint
CREATE INDEX "strike_event_voided_idx" ON "strike_event" USING btree ("voided_at");--> statement-breakpoint
CREATE INDEX "subscription_user_idx" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_provider_idx" ON "subscription" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_ticket_user_idx" ON "support_ticket" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_ticket_status_idx" ON "support_ticket" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_ticket_sla_idx" ON "support_ticket" USING btree ("sla_deadline");--> statement-breakpoint
CREATE INDEX "support_ticket_number_idx" ON "support_ticket" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "ticket_message_ticket_idx" ON "support_ticket_message" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "content_embedding_model_idx" ON "content_embedding" USING btree ("model_version");--> statement-breakpoint
CREATE INDEX "content_item_cefr_idx" ON "content_item" USING btree ("cefr_level","type");--> statement-breakpoint
CREATE INDEX "content_item_tags_idx" ON "content_item" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "rec_score_user_score_idx" ON "recommendation_score" USING btree ("user_id","score_type","score");--> statement-breakpoint
CREATE INDEX "rec_score_expires_idx" ON "recommendation_score" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_interaction_user_idx" ON "user_interaction" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_interaction_content_idx" ON "user_interaction" USING btree ("content_id","action");