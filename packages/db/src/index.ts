import { env } from "@community/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { account, session, user, verification } from "./schema/auth";
import { todo } from "./schema/todo";

export function createDb() {
  return drizzle(env.DATABASE_URL, {
    schema: { user, session, account, verification, todo },
  });
}

export const db = createDb();
