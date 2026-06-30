import { getNetworkStateAsync } from "expo-network";

/**
 * Quick synchronous-ish check of whether the device has an active
 * internet connection. Falls back to `true` so call flow is not
 * blocked by transient network-state lookups.
 */
export async function checkNetworkAvailable(): Promise<boolean> {
  try {
    const state = await getNetworkStateAsync();
    return state.isConnected ?? true;
  } catch {
    return true;
  }
}

/**
 * Check if a network-state error (e.g. a fetch rejection) looks like
 * an offline / connection-reset scenario rather than a server error.
 */
export function isOfflineError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch throws TypeError for network failures
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("offline") ||
      msg.includes("dns") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("fetch failed")
    );
  }
  return false;
}
