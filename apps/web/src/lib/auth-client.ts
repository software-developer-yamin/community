import type { AuthClient } from "@community/auth/session-refresh";
import { env } from "@community/env/web";
import {
  inferAdditionalFields,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const client = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          input: false,
        },
      },
    }),
    phoneNumberClient(),
  ],
});

/**
 * Better Auth's `getSession()` already auto-extends the session when
 * called near expiry (matching the server's `updateAge: 86400` config).
 * We reuse it as the `refresh` method to satisfy the `AuthClient` interface.
 */
export const authClient = client as AuthClient & typeof client;
