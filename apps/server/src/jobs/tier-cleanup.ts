import { db } from "@community/db";
import { userProfile } from "@community/db/schema/rebuild";
import { lt } from "drizzle-orm";
import { log } from "evlog";

/**
 * Batch-downgrade all user profiles whose `tierExpiresAt` has passed
 * back to `"free"`. This is a safety net — the lazy check in
 * `getEffectiveTier()` handles the common case on access, but this
 * keeps the DB consistent for bulk queries, exports, and admin views.
 */
export async function cleanupExpiredTiers(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(userProfile)
    .set({ tier: "free", tierExpiresAt: null })
    .where(lt(userProfile.tierExpiresAt, now))
    .returning({ id: userProfile.userId });

  if (result.length > 0) {
    log.info({
      action: "tier_cleanup",
      message: `Downgraded ${result.length} expired tiers`,
      count: result.length,
    });
  }

  return result.length;
}

/**
 * Register the tier-cleanup loop on a given interval.
 * Call once at server startup.
 */
export function startTierCleanup(intervalMs = 60 * 60 * 1000): void {
  // Run once immediately on startup
  cleanupExpiredTiers().catch((err) => {
    log.error({ action: "tier_cleanup", message: "Initial tier cleanup failed", error: String(err) });
  });

  // Then repeat on the interval
  const handle = setInterval(() => {
    cleanupExpiredTiers().catch((err) => {
      log.error({ action: "tier_cleanup", message: "Tier cleanup failed", error: String(err) });
    });
  }, intervalMs);

  // Don't prevent the process from exiting
  if (typeof handle === "object" && "unref" in handle) {
    handle.unref();
  }
}
