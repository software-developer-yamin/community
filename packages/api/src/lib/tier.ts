import { db } from "@community/db";
import { userProfile } from "@community/db/schema/rebuild";
import { eq } from "drizzle-orm";
import { log } from "evlog";

export type Tier = "free" | "premium" | "premium_plus";

export interface EffectiveTierResult {
  /** The tier to use for feature enforcement. */
  effectiveTier: Tier;
  /** Whether the tier has expired (tierExpiresAt in the past). */
  isExpired: boolean;
  /** The raw tier stored in the database. */
  tier: Tier;
  /** When the tier expires (null = never / free). */
  tierExpiresAt: Date | null;
}

/**
 * Returns the effective tier for a user, considering `tierExpiresAt`.
 *
 * If `tierExpiresAt` has passed, treats as `"free"` for enforcement
 * purposes and lazily downgrades the database row so subsequent reads
 * see the correct value without a separate cron job.
 *
 * If `tierExpiresAt` is null or still in the future, returns the
 * current tier unchanged.
 */
export async function getEffectiveTier(
  userId: string
): Promise<EffectiveTierResult> {
  const [profile] = await db
    .select({
      tier: userProfile.tier,
      tierExpiresAt: userProfile.tierExpiresAt,
    })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  if (!profile) {
    return {
      effectiveTier: "free",
      tier: "free",
      tierExpiresAt: null,
      isExpired: false,
    };
  }

  const now = new Date();
  const isExpired =
    profile.tierExpiresAt !== null && profile.tierExpiresAt < now;

  if (isExpired && profile.tier !== "free") {
    // Lazy downgrade — update DB inline instead of waiting for cron
    await db
      .update(userProfile)
      .set({ tier: "free", tierExpiresAt: null })
      .where(eq(userProfile.userId, userId));

    log.info({
      action: "tier_lazy_downgrade",
      userId,
      previousTier: profile.tier,
    });

    return {
      effectiveTier: "free",
      tier: "free",
      tierExpiresAt: null,
      isExpired: true,
    };
  }

  if (isExpired) {
    return {
      effectiveTier: "free",
      tier: profile.tier as Tier,
      tierExpiresAt: profile.tierExpiresAt,
      isExpired: true,
    };
  }

  return {
    effectiveTier: profile.tier as Tier,
    tier: profile.tier as Tier,
    tierExpiresAt: profile.tierExpiresAt,
    isExpired: false,
  };
}

/**
 * Synchronous version that only does the comparison logic.
 * Useful when the DB row is already loaded in the caller.
 */
export function computeEffectiveTier(
  tier: Tier,
  tierExpiresAt: Date | null
): { effectiveTier: Tier; isExpired: boolean } {
  const isExpired = tierExpiresAt !== null && tierExpiresAt < new Date();

  if (isExpired && tier !== "free") {
    return { effectiveTier: "free", isExpired: true };
  }

  return { effectiveTier: tier, isExpired: false };
}
