import { env } from "@community/env/web";
import {
  inferAdditionalFields,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
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
