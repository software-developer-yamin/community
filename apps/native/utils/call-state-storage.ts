import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

const CALL_STATE_KEY = "acefluency_call_state";

export interface SavedCallState {
  roomName: string;
  timestamp: number;
  token: string;
  userId: string;
}

/**
 * Persist the current call room / token so it can be restored after
 * the app is killed while backgrounded.
 */
export async function saveCallState(state: SavedCallState): Promise<void> {
  try {
    await setItemAsync(CALL_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to save call state", err);
  }
}

/**
 * Retrieve a persisted call state (if one exists).
 */
export async function getCallState(): Promise<SavedCallState | null> {
  try {
    const raw = await getItemAsync(CALL_STATE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SavedCallState;
  } catch {
    return null;
  }
}

/**
 * Remove the persisted call state after it has been consumed (or when
 * the user intentionally leaves a room).
 */
export async function clearCallState(): Promise<void> {
  try {
    await deleteItemAsync(CALL_STATE_KEY);
  } catch {
    // Best-effort
  }
}

/**
 * Returns `true` when the persisted state is stale (older than the
 * supplied TTL in ms — default 5 minutes).
 */
export function isStateStale(
  state: SavedCallState,
  ttlMs = 5 * 60 * 1000
): boolean {
  return Date.now() - state.timestamp > ttlMs;
}
