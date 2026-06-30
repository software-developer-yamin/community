import { expo } from "@better-auth/expo";
import { createDb } from "@community/db";
import {
  account,
  session,
  user,
  verification,
} from "@community/db/schema/auth";
import { env } from "@community/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";

import { configureSms, sendSms } from "./sms";

const schema = { user, session, account, verification };

export function createAuth() {
  const db = createDb();

  configureSms({
    provider: env.SMS_PROVIDER,
    apiKey: env.SMS_API_KEY,
    senderId: env.SMS_SENDER_ID,
    apiUrl: env.SMS_API_URL,
  });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema,
    }),
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: !!env.GOOGLE_CLIENT_ID,
      },
    },
    trustedOrigins: [
      env.CORS_ORIGIN,
      "community://",
      "exp://",
      "http://localhost:8081",
    ],
    emailAndPassword: {
      enabled: true,
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "email-password"],
      },
    },
    session: {
      expiresIn: 2_592_000, // 30 days (default: 604800 = 7 days)
      updateAge: 86_400, // extend session on use within 1 day of expiry
      freshAge: 0, // always check session from DB (no fresh cache)
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "strict",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      expo(),
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          await sendSms(phone, code);
        },
        signUpOnVerification: {
          getTempEmail: (phone) => `${phone}@community.app`,
          getTempName: (phone) => phone,
        },
      }),
    ],
  });
}

export const auth = createAuth();
