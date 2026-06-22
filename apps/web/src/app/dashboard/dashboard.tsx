"use client";

import { Button } from "@community/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { Label } from "@community/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import type { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

interface DashboardProps {
  session: typeof authClient.$Infer.Session;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "undisclosed", label: "Undisclosed" },
] as const;

export default function Dashboard({ session }: DashboardProps) {
  const { data: profile } = useQuery(orpc.rebuild.getProfile.queryOptions());
  const { mutateAsync: updateProfile, isPending } = useMutation(
    orpc.rebuild.updateProfile.mutationOptions()
  );

  const [gender, setGender] = useState<string | undefined>(undefined);
  const [genderPreference, setGenderPreference] = useState<string | undefined>(
    undefined
  );
  const [loaded, setLoaded] = useState(false);

  if (profile && !loaded) {
    setGender(profile.gender ?? undefined);
    setGenderPreference(profile.genderPreference ?? undefined);
    setLoaded(true);
  }

  const isPremiumPlus =
    session.user?.role === "premium_plus" || session.user?.role === "admin";

  const handleSave = async (
    field: "gender" | "genderPreference",
    value: string | undefined
  ) => {
    try {
      await updateProfile({ [field]: value ?? null });
      toast.success(
        field === "gender"
          ? "Gender identity updated"
          : "Gender preference updated"
      );
      queryClient.invalidateQueries({
        queryKey: orpc.rebuild.getProfile.key(),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-2xl">Profile Settings</h2>
        <p className="text-muted-foreground">
          Manage your profile information and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
          <CardDescription>Your basic account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Name:</span>
            <span>{session.user?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Email:</span>
            <span>{session.user?.email}</span>
            {session.user?.emailVerified && (
              <span className="rounded-full border px-2 py-0.5 text-xs">
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Role:</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
              {session.user?.role}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gender Identity</CardTitle>
          <CardDescription>
            How do you identify? This helps us match you with compatible
            partners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="space-y-3">
            {GENDER_OPTIONS.map((option) => (
              <div className="flex items-center gap-2" key={option.value}>
                <input
                  checked={gender === option.value}
                  className="h-4 w-4 accent-primary"
                  id={`gender-${option.value}`}
                  name="gender"
                  onChange={() => {
                    setGender(option.value);
                    handleSave("gender", option.value);
                  }}
                  type="radio"
                  value={option.value}
                />
                <Label htmlFor={`gender-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </fieldset>
          {isPending && (
            <p className="mt-2 text-muted-foreground text-sm">Saving...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partner Gender Preference</CardTitle>
          <CardDescription>
            Who would you like to practice with? Choose a specific gender or
            leave it open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPremiumPlus ? (
            <>
              <fieldset className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    checked={genderPreference === undefined}
                    className="h-4 w-4 accent-primary"
                    id="pref-none"
                    name="genderPreference"
                    onChange={() => {
                      setGenderPreference(undefined);
                      handleSave("genderPreference", undefined);
                    }}
                    type="radio"
                    value=""
                  />
                  <Label htmlFor="pref-none">No preference</Label>
                </div>
                {GENDER_OPTIONS.map((option) => (
                  <div className="flex items-center gap-2" key={option.value}>
                    <input
                      checked={genderPreference === option.value}
                      className="h-4 w-4 accent-primary"
                      id={`pref-${option.value}`}
                      name="genderPreference"
                      onChange={() => {
                        setGenderPreference(option.value);
                        handleSave("genderPreference", option.value);
                      }}
                      type="radio"
                      value={option.value}
                    />
                    <Label htmlFor={`pref-${option.value}`}>
                      {option.label}
                    </Label>
                  </div>
                ))}
              </fieldset>
              {isPending && (
                <p className="mt-2 text-muted-foreground text-sm">Saving...</p>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground text-sm">
                Gender preference is available with{" "}
                <span className="font-medium text-foreground">Premium+</span>{" "}
                tier. Upgrade to filter practice partners by gender.
              </p>
              <Button className="mt-3" size="sm" variant="default">
                Upgrade to Premium+
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
