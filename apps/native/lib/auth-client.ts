import { expoClient } from "@better-auth/expo/client";
import type { AuthClient } from "@community/auth/session-refresh";
import { env } from "@community/env/native";
import {
  inferAdditionalFields,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
// biome-ignore lint/performance/noNamespaceImport: expoClient requires the SecureStore namespace as the storage adapter
import * as SecureStore from "expo-secure-store";

const client = createAuthClient({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    expoClient({
      scheme: Constants.expoConfig?.scheme as string,
      storagePrefix: Constants.expoConfig?.scheme as string,
      storage: SecureStore,
    }),
    phoneNumberClient(),
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          input: false,
        },
      },
    }),
  ],
});

/**
 * Better Auth's `getSession()` already auto-extends the session when
 * called near expiry (matching the server's `updateAge: 86400` config).
 * We reuse it as the `refresh` method to satisfy the `AuthClient` interface
 * required by `TokenRefreshProvider`.
 */
export const authClient = client as AuthClient & typeof client;
