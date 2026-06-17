"use client";

import { useState } from "react";

import PhoneSignIn from "@/components/phone-sign-in";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

type AuthMode = "sign-in" | "sign-up" | "phone";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("sign-up");

  if (mode === "phone") {
    return <PhoneSignIn onSwitchToEmail={() => setMode("sign-up")} />;
  }

  return mode === "sign-in" ? (
    <SignInForm onSwitchToSignUp={() => setMode("sign-up")} />
  ) : (
    <SignUpForm
      onSwitchToPhone={() => setMode("phone")}
      onSwitchToSignIn={() => setMode("sign-in")}
    />
  );
}
