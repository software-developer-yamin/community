import { Redirect } from "expo-router";

/** Entry point for the auth group so `/(auth)` resolves; login is the only sensible landing. */
export default function AuthIndex() {
  return <Redirect href="/(auth)/login" />;
}
