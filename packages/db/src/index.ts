import { env } from "@community/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { account, session, user, verification } from "./schema/auth";
import { callRecord } from "./schema/call";
import { callRoom } from "./schema/rebuild";
import {
  contentEmbedding,
  contentItem,
  recommendationScore,
  userInteraction,
  userPreference,
} from "./schema/recommendations";
import { todo } from "./schema/todo";

export function createDb() {
  return drizzle(env.DATABASE_URL, {
    schema: {
      user,
      session,
      account,
      verification,
      callRoom,
      callRecord,
      todo,
      contentItem,
      contentEmbedding,
      userInteraction,
      recommendationScore,
      userPreference,
    },
  });
}

export const db = createDb();
