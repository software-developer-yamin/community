import { describe, expect, test } from "bun:test";
import { REFUND_RETRY_WINDOW_MS } from "../refund-executor";
import {
  type PollerCandidate,
  partitionPollerCandidates,
} from "../refund-settlement-poller";

const NOW = new Date("2026-10-16T12:00:00.000Z");

function candidate(overrides: Partial<PollerCandidate> = {}): PollerCandidate {
  return {
    id: "ref_1",
    status: "approved",
    providerRefundAttempts: 0,
    lastRefundAttemptAt: null,
    createdAt: new Date("2026-10-16T00:00:00.000Z"),
    ...overrides,
  };
}

describe("partitionPollerCandidates", () => {
  test("5.3g-UNIT-001: empty candidate list returns empty partitions", () => {
    const result = partitionPollerCandidates([], NOW);
    expect(result.toExecute).toHaveLength(0);
    expect(result.toSkip).toHaveLength(0);
    expect(result.toExhaust).toHaveLength(0);
  });

  test("5.3g-UNIT-002: non-settleable statuses are completely ignored", () => {
    const nonSettleable = [
      candidate({ id: "1", status: "pending" }),
      candidate({ id: "2", status: "auto_denied" }),
      candidate({ id: "3", status: "human_review" }),
      candidate({ id: "4", status: "completed" }),
      candidate({ id: "5", status: "denied" }),
      candidate({ id: "6", status: "processing" }),
    ];

    const result = partitionPollerCandidates(nonSettleable, NOW);
    expect(result.toExecute).toHaveLength(0);
    expect(result.toSkip).toHaveLength(0);
    expect(result.toExhaust).toHaveLength(0);
  });

  test("5.3g-UNIT-003: fresh approved and auto_approved candidates partition into toExecute", () => {
    const fresh = [
      candidate({ id: "app_1", status: "approved", providerRefundAttempts: 0 }),
      candidate({
        id: "auto_1",
        status: "auto_approved",
        providerRefundAttempts: 0,
      }),
    ];

    const result = partitionPollerCandidates(fresh, NOW);
    expect(result.toExecute).toHaveLength(2);
    expect(result.toExecute[0]?.id).toBe("app_1");
    expect(result.toExecute[1]?.id).toBe("auto_1");
    expect(result.toSkip).toHaveLength(0);
    expect(result.toExhaust).toHaveLength(0);
  });

  test("5.3g-UNIT-004: attempt inside retry window partitions into toSkip", () => {
    const recent = new Date(NOW.getTime() - (REFUND_RETRY_WINDOW_MS - 1000));
    const inFlight = [
      candidate({
        id: "flight_1",
        providerRefundAttempts: 1,
        lastRefundAttemptAt: recent,
      }),
    ];

    const result = partitionPollerCandidates(inFlight, NOW);
    expect(result.toExecute).toHaveLength(0);
    expect(result.toSkip).toHaveLength(1);
    expect(result.toSkip[0]?.id).toBe("flight_1");
    expect(result.toExhaust).toHaveLength(0);
  });

  test("5.3g-UNIT-005: attempt past retry window partitions into toExecute for retry", () => {
    const pastWindow = new Date(
      NOW.getTime() - (REFUND_RETRY_WINDOW_MS + 60_000)
    );
    const readyForRetry = [
      candidate({
        id: "retry_1",
        providerRefundAttempts: 1,
        lastRefundAttemptAt: pastWindow,
      }),
      candidate({
        id: "retry_2",
        providerRefundAttempts: 2,
        lastRefundAttemptAt: pastWindow,
      }),
    ];

    const result = partitionPollerCandidates(readyForRetry, NOW);
    expect(result.toExecute).toHaveLength(2);
    expect(result.toExecute[0]?.id).toBe("retry_1");
    expect(result.toExecute[1]?.id).toBe("retry_2");
    expect(result.toSkip).toHaveLength(0);
    expect(result.toExhaust).toHaveLength(0);
  });

  test("5.3g-UNIT-006: candidates with 3 or more attempts partition into toExhaust", () => {
    const pastWindow = new Date(
      NOW.getTime() - (REFUND_RETRY_WINDOW_MS + 60_000)
    );
    const exhausted = [
      candidate({
        id: "ex_1",
        providerRefundAttempts: 3,
        lastRefundAttemptAt: pastWindow,
      }),
      candidate({
        id: "ex_2",
        providerRefundAttempts: 4,
        lastRefundAttemptAt: pastWindow,
      }),
    ];

    const result = partitionPollerCandidates(exhausted, NOW);
    expect(result.toExecute).toHaveLength(0);
    expect(result.toSkip).toHaveLength(0);
    expect(result.toExhaust).toHaveLength(2);
    expect(result.toExhaust[0]?.id).toBe("ex_1");
    expect(result.toExhaust[1]?.id).toBe("ex_2");
  });

  test("5.3g-UNIT-007: mixed batch partitions accurately across all three sets", () => {
    const pastWindow = new Date(
      NOW.getTime() - (REFUND_RETRY_WINDOW_MS + 60_000)
    );
    const recent = new Date(NOW.getTime() - 1000);

    const mixed = [
      candidate({ id: "fresh_1", providerRefundAttempts: 0 }),
      candidate({
        id: "skip_1",
        providerRefundAttempts: 1,
        lastRefundAttemptAt: recent,
      }),
      candidate({
        id: "retry_1",
        providerRefundAttempts: 2,
        lastRefundAttemptAt: pastWindow,
      }),
      candidate({
        id: "ex_1",
        providerRefundAttempts: 3,
        lastRefundAttemptAt: pastWindow,
      }),
      candidate({ id: "ignore_1", status: "completed" }),
    ];

    const result = partitionPollerCandidates(mixed, NOW);
    expect(result.toExecute.map((x) => x.id)).toEqual(["fresh_1", "retry_1"]);
    expect(result.toSkip.map((x) => x.id)).toEqual(["skip_1"]);
    expect(result.toExhaust.map((x) => x.id)).toEqual(["ex_1"]);
  });
});
