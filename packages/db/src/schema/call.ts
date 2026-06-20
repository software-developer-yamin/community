import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Append-only log of every call that ended.
 * Written when a room is closed (by disconnect, explicit end, or timeout).
 */
export const callRecord = pgTable("call_record", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  roomName: text("room_name").notNull(),
  matchId: text("match_id").notNull(),
  endedByUserId: text("ended_by_user_id").references(() => user.id),
  endReason: text("end_reason", {
    enum: ["disconnect", "explicit", "timeout", "connection_lost"],
  }).notNull(),
  participantCount: integer("participant_count").notNull().default(0),
  durationSec: integer("duration_sec"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
