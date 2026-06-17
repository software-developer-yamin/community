"use client";

import { Button } from "@community/ui/components/button";
import { Input } from "@community/ui/components/input";
import { Label } from "@community/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

export default function PhoneSignIn({
  onSwitchToEmail,
}: {
  onSwitchToEmail: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");

  const phoneForm = useForm({
    defaultValues: {
      phone: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.phoneNumber.sendOtp({
        phoneNumber: value.phone,
      });
      if (error) {
        toast.error(error.message || error.statusText);
        return;
      }
      setPhoneNumber(value.phone);
      setStep("otp");
      toast.success("OTP sent to your phone");
    },
    validators: {
      onSubmit: z.object({
        phone: z.string().min(10, "Enter a valid phone number"),
      }),
    },
  });

  const otpForm = useForm({
    defaultValues: {
      code: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.phoneNumber.verify({
        phoneNumber,
        code: value.code,
      });
      if (error) {
        toast.error(error.message || error.statusText);
        return;
      }
      router.push("/dashboard");
      toast.success("Signed in successfully");
    },
    validators: {
      onSubmit: z.object({
        code: z.string().length(6, "OTP must be 6 digits"),
      }),
    },
  });

  if (step === "otp") {
    return (
      <div className="mx-auto mt-10 w-full max-w-md p-6">
        <h1 className="mb-6 text-center font-bold text-3xl">Enter OTP</h1>
        <p className="mb-4 text-center text-gray-600">
          Enter the code sent to {phoneNumber}
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            otpForm.handleSubmit();
          }}
        >
          <div>
            <otpForm.Field name="code">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>OTP Code</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter 6-digit code"
                    type="text"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p className="text-red-500" key={error?.message}>
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </otpForm.Field>
          </div>

          <otpForm.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                className="w-full"
                disabled={!canSubmit || isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Verifying..." : "Verify & Sign In"}
              </Button>
            )}
          </otpForm.Subscribe>
        </form>

        <div className="mt-4 space-y-2 text-center">
          <Button
            className="text-indigo-600 hover:text-indigo-800"
            onClick={() => {
              setStep("phone");
            }}
            variant="link"
          >
            Change phone number
          </Button>
          <div>
            <Button
              className="text-gray-600 hover:text-gray-800"
              onClick={onSwitchToEmail}
              variant="link"
            >
              Use email instead
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center font-bold text-3xl">
        Sign in with Phone
      </h1>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          phoneForm.handleSubmit();
        }}
      >
        <div>
          <phoneForm.Field name="phone">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Phone Number</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="+8801712345678"
                  type="tel"
                  value={field.state.value}
                />
                {field.state.meta.errors.map((error) => (
                  <p className="text-red-500" key={error?.message}>
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </phoneForm.Field>
        </div>

        <phoneForm.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Sending OTP..." : "Send OTP"}
            </Button>
          )}
        </phoneForm.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={onSwitchToEmail}
          variant="link"
        >
          Use email/password instead
        </Button>
      </div>
    </div>
  );
}
