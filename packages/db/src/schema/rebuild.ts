import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Enums ──────────────────────────────────────────────────────────────

export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "nonbinary",
  "undisclosed",
]);
export const moderationStateEnum = pgEnum("moderation_state", [
  "clean",
  "warned",
  "cooldown",
  "suspended",
  "banned",
]);
export const tierEnum = pgEnum("tier", ["free", "premium", "premium_plus"]);
export const callStatusEnum = pgEnum("call_status", [
  "pending",
  "connecting",
  "active",
  "reconnecting",
  "ended",
  "failed",
]);
export const callEndReasonEnum = pgEnum("call_end_reason", [
  "user_ended",
  "partner_ended",
  "connection_lost",
  "skip",
  "timeout",
  "system_error",
]);
export const paymentProviderEnum = pgEnum("payment_provider", [
  "sslcommerz",
  "razorpay",
]);
export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "auto_approved",
  "auto_denied",
  "human_review",
  "approved",
  "denied",
  "processing",
  "completed",
]);
export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",
  "pending",
  "resolved",
  "closed",
]);

// ─── User Profile Extensions ──────────────────────────────────────────────

/**
 * Extended user profile for the rebuild.
 * Adds gender, native language, tier, moderation state, and onboarding fields.
 */
export const userProfile = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  gender: genderEnum("gender"),
  nativeLanguage: text("native_language").default("bn").notNull(), // bn | hi | ur | en | ta | te
  tier: tierEnum("tier").default("free").notNull(),
  tierExpiresAt: timestamp("tier_expires_at"),
  moderationState: moderationStateEnum("moderation_state")
    .default("clean")
    .notNull(),
  cooldownUntil: timestamp("cooldown_until"),
  strikeCount: integer("strike_count").default(0).notNull(),
  lastStrikeAt: timestamp("last_strike_at"),
  // Onboarding
  onboardingCompleted: integer("onboarding_completed").default(0).notNull(), // 0 = not started, 1 = partial, 2 = complete
  cefrLevel: text("cefr_level"), // A1 | A2 | B1 | B2 | C1 | C2
  // Contact
  phoneNumber: text("phone_number"),
  phoneVerified: integer("phone_verified").default(0).notNull(),
  // Analytics
  totalCallCount: integer("total_call_count").default(0).notNull(),
  totalCallDuration: integer("total_call_duration").default(0).notNull(), // seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// ─── Call Rooms ───────────────────────────────────────────────────────────

/**
 * 1:1 call rooms. One room per match.
 * Tracks lifecycle from creation to teardown.
 */
export const callRoom = pgTable(
  "call_room",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    matchId: text("match_id").notNull().unique(), // correlation ID for the match
    roomName: text("room_name").notNull(), // LiveKit room name: call-{matchId}
    participantA: text("participant_a")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    participantB: text("participant_b")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: callStatusEnum("status").default("pending").notNull(),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    endReason: callEndReasonEnum("end_reason"),
    endedBy: text("ended_by").references(() => user.id, {
      onDelete: "set null",
    }),
    duration: integer("duration"), // seconds
    // Reconnection tracking
    reconnectCount: integer("reconnect_count").default(0).notNull(),
    lastReconnectAt: timestamp("last_reconnect_at"),
    // Audio quality
    avgRoundTripMs: integer("avg_round_trip_ms"),
    // Created/updated
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("call_room_match_idx").on(table.matchId),
    index("call_room_participant_a_idx").on(table.participantA),
    index("call_room_participant_b_idx").on(table.participantB),
    index("call_room_status_idx").on(table.status),
  ]
);

// ─── Strikes & Moderation ─────────────────────────────────────────────────

/**
 * Individual strike events. Append-only log.
 * Used to compute the graduated response (warn → cooldown → review → ban).
 */
export const strikeEvent = pgTable(
  "strike_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    callRoomId: text("call_room_id")
      .notNull()
      .references(() => callRoom.id, { onDelete: "cascade" }),
    // What triggered the strike
    triggerType: text("trigger_type").notNull(), // "short_disconnect" | "reported" | "skip_abuse"
    callDuration: integer("call_duration"), // seconds at time of disconnect
    // Whether the strike was voided (e.g., user reported partner within 60s)
    voidedAt: timestamp("voided_at"),
    voidedReason: text("voided_reason"), // e.g., "partner_reported"
    // Report that voided this strike (if applicable)
    reportId: text("report_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("strike_event_user_idx").on(table.userId, table.createdAt),
    index("strike_event_call_idx").on(table.callRoomId),
    index("strike_event_voided_idx").on(table.voidedAt),
  ]
);

/**
 * Partner reports. Filed during or within 60s of a call.
 * Auto-voids the reporting user's strike for that call.
 */
export const partnerReport = pgTable(
  "partner_report",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    partnerId: text("partner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    callRoomId: text("call_room_id")
      .notNull()
      .references(() => callRoom.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(), // "non_participation" | "abuse" | "technical_failure" | "other"
    details: text("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("partner_report_reporter_idx").on(table.reporterId),
    index("partner_report_partner_idx").on(table.partnerId),
    index("partner_report_call_idx").on(table.callRoomId),
  ]
);

// ─── Billing ──────────────────────────────────────────────────────────────

/**
 * Subscription records. One per active/past subscription.
 */
export const subscription = pgTable(
  "subscription",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tier: tierEnum("tier").notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    // Billing
    amount: integer("amount").notNull(), // smallest currency unit (e.g., paise for INR)
    currency: text("currency").notNull(), // "BDT" | "INR"
    // Period
    startedAt: timestamp("started_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    // Auto-renew
    autoRenew: integer("auto_renew").default(1).notNull(),
    autoRenewDisabledAt: timestamp("auto_renew_disabled_at"),
    // Status
    status: text("status").notNull(), // "active" | "cancelled" | "expired" | "refunded"
    // Metadata
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("subscription_user_idx").on(table.userId),
    index("subscription_provider_idx").on(
      table.provider,
      table.providerSubscriptionId
    ),
    index("subscription_status_idx").on(table.status),
  ]
);

/**
 * Refund requests. Three-path: auto-approve, auto-deny, human review.
 */
export const refundRequest = pgTable(
  "refund_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscription.id, { onDelete: "cascade" }),
    // Classification
    path: text("path").notNull(), // "auto_approve" | "auto_deny" | "human_review"
    status: refundStatusEnum("status").default("pending").notNull(),
    // Auto-approve triggers
    triggerCrashes: integer("trigger_crashes"), // count of critical crashes
    triggerLoginFailure: integer("trigger_login_failure"), // hours
    triggerNeverConnected: integer("trigger_never_connected"), // boolean as 0/1
    // Auto-deny triggers
    triggerCompletedSessions: integer("trigger_completed_sessions"),
    triggerDaysSinceCharge: integer("trigger_days_since_charge"),
    // Reasoning
    denialReason: text("denial_reason"),
    approvalReason: text("approval_reason"),
    // Human review
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    // Provider refund
    providerRefundId: text("provider_refund_id"),
    providerRefundStatus: text("provider_refund_status"),
    providerRefundAttempts: integer("provider_refund_attempts")
      .default(0)
      .notNull(),
    lastRefundAttemptAt: timestamp("last_refund_attempt_at"),
    // SLA
    slaDeadline: timestamp("sla_deadline").notNull(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("refund_request_user_idx").on(table.userId),
    index("refund_request_status_idx").on(table.status),
    index("refund_request_sla_idx").on(table.slaDeadline),
  ]
);

// ─── Support ──────────────────────────────────────────────────────────────

/**
 * In-app support tickets. SLA-bound first response.
 */
export const supportTicket = pgTable(
  "support_ticket",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ticketNumber: text("ticket_number").notNull().unique(), // e.g., "TKT-20260613-001"
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // "billing" | "technical" | "moderation" | "other"
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: supportTicketStatusEnum("status").default("open").notNull(),
    // Priority
    priority: text("priority").default("medium").notNull(), // "low" | "medium" | "high" | "urgent"
    userTier: tierEnum("user_tier").notNull(),
    // SLA
    slaDeadline: timestamp("sla_deadline").notNull(),
    firstResponseAt: timestamp("first_response_at"),
    firstResponseBy: text("first_response_by"),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: text("resolved_by"),
    // Thread
    threadCount: integer("thread_count").default(0).notNull(),
    // Metadata
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("support_ticket_user_idx").on(table.userId),
    index("support_ticket_status_idx").on(table.status),
    index("support_ticket_sla_idx").on(table.slaDeadline),
    index("support_ticket_number_idx").on(table.ticketNumber),
  ]
);

/**
 * Support ticket thread entries (messages).
 */
export const supportTicketMessage = pgTable(
  "support_ticket_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => supportTicket.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    senderRole: text("sender_role").notNull(), // "user" | "agent" | "system"
    body: text("body").notNull(),
    isInternal: integer("is_internal").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ticket_message_ticket_idx").on(table.ticketId)]
);

// ─── Post-Call Rating ─────────────────────────────────────────────────────

/**
 * Partner ratings after a call. Feeds into match quality scoring.
 */
export const callRating = pgTable(
  "call_rating",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    partnerId: text("partner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    callRoomId: text("call_room_id")
      .notNull()
      .references(() => callRoom.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(), // 1–5
    helpedPractice: integer("helped_practice"), // 0 = no, 1 = yes
    comment: text("comment"),
    // Anonymization
    anonymizedAt: timestamp("anonymized_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("call_rating_user_idx").on(table.userId),
    index("call_rating_partner_idx").on(table.partnerId),
    index("call_rating_call_idx").on(table.callRoomId),
  ]
);

// ─── Crash Log (for FR-20 refund auto-approve) ─────────────────────────────

/**
 * Critical crash events. Tracked per user for refund auto-approval.
 */
export const crashEvent = pgTable(
  "crash_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "force_close" | "anr" | "black_screen"
    appVersion: text("app_version"),
    osVersion: text("os_version"),
    deviceModel: text("device_model"),
    stackTrace: text("stack_trace"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("crash_event_user_idx").on(table.userId, table.createdAt)]
);

// ─── Relations ────────────────────────────────────────────────────────────

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export const callRoomRelations = relations(callRoom, ({ one, many }) => ({
  participantAUser: one(user, {
    fields: [callRoom.participantA],
    references: [user.id],
  }),
  participantBUser: one(user, {
    fields: [callRoom.participantB],
    references: [user.id],
  }),
  strikes: many(strikeEvent),
  reports: many(partnerReport),
  ratings: many(callRating),
}));

export const strikeEventRelations = relations(strikeEvent, ({ one }) => ({
  user: one(user, {
    fields: [strikeEvent.userId],
    references: [user.id],
  }),
  callRoom: one(callRoom, {
    fields: [strikeEvent.callRoomId],
    references: [callRoom.id],
  }),
}));

export const partnerReportRelations = relations(partnerReport, ({ one }) => ({
  reporter: one(user, {
    fields: [partnerReport.reporterId],
    references: [user.id],
  }),
  partner: one(user, {
    fields: [partnerReport.partnerId],
    references: [user.id],
  }),
  callRoom: one(callRoom, {
    fields: [partnerReport.callRoomId],
    references: [callRoom.id],
  }),
}));

export const subscriptionRelations = relations(
  subscription,
  ({ one, many }) => ({
    user: one(user, {
      fields: [subscription.userId],
      references: [user.id],
    }),
    refunds: many(refundRequest),
  })
);

export const refundRequestRelations = relations(refundRequest, ({ one }) => ({
  user: one(user, {
    fields: [refundRequest.userId],
    references: [user.id],
  }),
  subscription: one(subscription, {
    fields: [refundRequest.subscriptionId],
    references: [subscription.id],
  }),
}));

export const supportTicketRelations = relations(
  supportTicket,
  ({ one, many }) => ({
    user: one(user, {
      fields: [supportTicket.userId],
      references: [user.id],
    }),
    messages: many(supportTicketMessage),
  })
);

export const supportTicketMessageRelations = relations(
  supportTicketMessage,
  ({ one }) => ({
    ticket: one(supportTicket, {
      fields: [supportTicketMessage.ticketId],
      references: [supportTicket.id],
    }),
    sender: one(user, {
      fields: [supportTicketMessage.senderId],
      references: [user.id],
    }),
  })
);

export const callRatingRelations = relations(callRating, ({ one }) => ({
  user: one(user, {
    fields: [callRating.userId],
    references: [user.id],
  }),
  partner: one(user, {
    fields: [callRating.partnerId],
    references: [user.id],
  }),
  callRoom: one(callRoom, {
    fields: [callRating.callRoomId],
    references: [callRoom.id],
  }),
}));

export const crashEventRelations = relations(crashEvent, ({ one }) => ({
  user: one(user, {
    fields: [crashEvent.userId],
    references: [user.id],
  }),
}));
