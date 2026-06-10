# F3.1 30-Day Persistent Session (Google-only) — Engineering Spec

**Status:** Ready to ship
**Effort:** 1 day
**ICE:** 9 (impact 10, confidence 9, ease 9)
**Owner:** Backend
**Metric:** Login-related reviews ↓80% in 14d; D7 retention +12%

## Constraints (locked)

- **Auth = Google OAuth only.** No email/password, no magic link.
- **No biometric.** F3.5 dropped.
- Session 7d → 30d, silent refresh, default signed in.

## better-auth Google OAuth (verified against [packages/auth/src/index.ts](file:///home/yamin/Documents/Yamin%20Company/community/packages/auth/src/index.ts))

Better-auth has `socialProviders.google` plugin. Google `refresh_token` → silent `getSession()` on client tick.

## Changes

### 1. Auth config: Google-only + 30d session

[packages/auth/src/index.ts](file:///home/yamin/Documents/Yamin%20Company/community/packages/auth/src/index.ts):

```ts
import { expo } from "@better-auth/expo";
import { createDb } from "@community/db";
import { account, session, user, verification } from "@community/db/schema/auth";
import { env } from "@community/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const schema = { user, session, account, verification };

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),

    trustedOrigins: [
      env.CORS_ORIGIN,
      "community://",
      "exp://",
      "http://localhost:8081",
    ],

    // Google-only
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        scope: ["openid", "email", "profile"],
        // BD users often have multiple Google accounts (personal + work) → force picker
        prompt: "select_account",
        mapProfileToUser: (profile) => ({
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ?? false,
        }),
      },
    },

    // F3.1: 30-day session, silent refresh via cookie cache
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
      preserveSessionInBrowser: true,
    },

    // F3.2: link Google to existing email account (if any)
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },

    plugins: [expo()],

    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    advanced: {
      defaultCookieAttributes: {
        sameSite: env.NODE_ENV === 'production' ? "none" : "lax",
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
      },
      useSecureCookies: env.NODE_ENV === 'production',
    },

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: { '/sign-in/social': { window: 60, max: 10 } },
    },
  });
}

export const auth = createAuth();
```

### 2. Web client: silent refresh tick

[apps/web/src/lib/auth-client.ts](file:///home/yamin/Documents/Yamin%20Company/community/apps/web/src/lib/auth-client.ts):

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
});

export async function signInWithGoogle() {
  return authClient.signIn.social({ provider: "google", callbackURL: "/home" });
}
```

Root layout:

```tsx
// apps/web/src/app/layout.tsx
'use client';
import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const tick = setInterval(async () => {
      const session = await authClient.getSession();
      if (!session) return;
      const daysLeft = (new Date(session.expiresAt).getTime() - Date.now()) / 86_400_000;
      if (daysLeft < 5) await authClient.refreshSession();
    }, 10 * 60 * 1000);
    return () => clearInterval(tick);
  }, []);
  return <html><body>{children}</body></html>;
}
```

### 3. Web sign-in (Google-only)

[apps/web/src/app/(auth)/sign-in/page.tsx](file:///home/yamin/Documents/Yamin%20Company/community/apps/web/src/app/(auth)/sign-in/page.tsx):

```tsx
'use client';
import { View, Pressable, Text } from 'react-native';
import { signInWithGoogle } from '@/lib/auth-client';
import { useState } from 'react';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';

export default function SignInPage() {
  const { theme } = useUnistyles();
  const [loading, setLoading] = useState(false);
  const onPress = async () => {
    setLoading(true);
    try { await signInWithGoogle(); } finally { setLoading(false); }
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.typography }}>AceFluency</Text>
      <Text style={{ fontSize: 15, color: theme.colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>
        Speak English with real people. Learn faster.
      </Text>
      <Pressable onPress={onPress} disabled={loading} style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border,
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, marginTop: 32,
        opacity: loading ? 0.6 : 1,
      }}>
        <Ionicons name="logo-google" size={20} color="#000" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#000' }}>
          {loading ? 'Opening Google…' : 'Continue with Google'}
        </Text>
      </Pressable>
      <Text style={{ fontSize: 12, color: theme.colors.mutedForeground, marginTop: 16, textAlign: 'center' }}>
        By continuing you agree to our Terms and Privacy Policy.
      </Text>
    </View>
  );
}
```

### 4. Native client: secure store

[apps/native/lib/auth-client.ts](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/lib/auth-client.ts):

```ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { env } from "@community/env/native";

export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_API_URL,
  plugins: [expoClient({ scheme: "community", storage: SecureStore })],
});

export async function signInWithGoogle() {
  return authClient.signIn.social({ provider: "google", callbackURL: "/home" });
}
```

### 5. Native sign-in screen

[apps/native/app/(auth)/sign-in.tsx](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/app/(auth)/sign-in.tsx):

```tsx
import { signInWithGoogle } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useState } from "react";
import { useUnistyles } from "react-native-unistyles";

export default function SignInScreen() {
  const { theme } = useUnistyles();
  const [loading, setLoading] = useState(false);
  const onPress = async () => {
    setLoading(true);
    try { await signInWithGoogle(); } finally { setLoading(false); }
  };
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 32, fontWeight: "800", color: theme.colors.typography }}>AceFluency</Text>
      <Text style={{ fontSize: 15, color: theme.colors.mutedForeground, marginTop: 8, textAlign: "center" }}>
        Speak English. With real people.
      </Text>
      <Pressable onPress={onPress} disabled={loading} style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "#fff", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, marginTop: 32,
        opacity: loading ? 0.6 : 1,
      }}>
        <Ionicons name="logo-google" size={20} color="#000" />
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>
          {loading ? "Opening Google…" : "Continue with Google"}
        </Text>
      </Pressable>
    </View>
  );
}
```

## Env additions

```bash
# apps/server/.env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

Google Cloud Console:
- Authorized JS origins: `https://api.acefluency.app`, `https://app.acefluency.app`, `http://localhost:3001`
- Authorized redirect URIs: `https://api.acefluency.app/api/auth/callback/google`, `community://`
- OAuth consent: external, scopes openid+email+profile, test users whitelist for BD QA

## User flow (BD user)

1. Open app → "Continue with Google" button
2. Tap → Google account picker (`prompt: select_account`)
3. Pick → instant back in app, signed in
4. Session = 30d. Silent refresh every 10min
5. Token in `expo-secure-store` (native) / `httpOnly cookie` (web)
6. After 30d inactive → re-prompt Google

## Rollout

1. **Hour 1:** Google OAuth config in Better-Auth + GCP. Sandbox.
2. **Hour 2-3:** auth config + web/native sign-in screens. Internal dogfood.
3. **Hour 4:** drop email/password login (was already disabled in screen). Existing email users → first Google sign-in auto-links.
4. **Day 2:** 10% → 100% over 24h. Monitor:
   - sign-in success rate (target ≥95%)
   - "stuck on Google screen" tickets (target 0)
   - session-expiry complaints (target 0)
5. **Day 7:** Settings banner: "Link your Google account" for any stragglers.

## Risks

| Risk | Mitigation |
|---|---|
| Google blocks app (unverified) | Verify in GCP before launch; submit for verification if >100 users |
| BD user with no Google account (rare) | Out of scope. Manual "request access" form. Future: SMS OTP. |
| Google session expired, app thinks signed in | Silent refresh fails → `/sign-in` screen with toast |
| Account linking fails (email → Google) | `accountLinking.trustedProviders: ["google"]` handles it |
| Deep-link hijack on Android | App Links (verified domain); `community://` fallback only |
| `prompt: select_account` too aggressive | Telemetry: track picker-rejected rate. A/B test `prompt: ""` after 2w |

## Success metrics (14d)

- Login-related 1-star reviews ↓80%
- D7 retention +12%
- Mean session length: 7d → 22d
- Google sign-in success rate ≥95% (1st try)
- Auth p95 latency ↓30% (cookie cache)
- "Account logged out" tickets → 0

## Cut from F3 brainstorm (per constraints)

- ~~F3.4 Magic link~~ — Google covers it
- ~~F3.5 Biometric~~ — user said no
- ~~Email/password~~ — Google only
- ~~F3.2 rememberMe toggle~~ — OAuth sessions always remembered

## Settings UI (minimal)

```
╔═════════════════════════╗
║  Account                ║
║                         ║
║  Signed in as:          ║
║  user@gmail.com    ✓   ║
║                         ║
║  Session length: 30 d   ║
║  Auto-refresh     ON    ║
║                         ║
║  [ Sign out ]           ║
╚═════════════════════════╝
```

No biometric toggle. No password change. No magic-link. = "Connected to Google. Tap to disconnect."

---

*Spec complete. Ready for eng + security review.*
