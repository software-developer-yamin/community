import {
  decideRefundAttempt,
  isRefundSettleable,
  type RefundAttemptDecision,
} from "./refund-executor";

export interface PollerCandidate {
  createdAt?: Date;
  id: string;
  lastRefundAttemptAt: Date | null;
  providerRefundAttempts: number;
  status: string;
}

export type PollerAction = "execute" | "skip" | "exhaust";

export interface ClassifiedPollerCandidate {
  action: PollerAction;
  decision: RefundAttemptDecision;
  id: string;
}

export interface PollerBatchPartition {
  toExecute: ClassifiedPollerCandidate[];
  toExhaust: ClassifiedPollerCandidate[];
  toSkip: ClassifiedPollerCandidate[];
}

export function partitionPollerCandidates(
  candidates: readonly PollerCandidate[],
  now: Date
): PollerBatchPartition {
  const toExecute: ClassifiedPollerCandidate[] = [];
  const toSkip: ClassifiedPollerCandidate[] = [];
  const toExhaust: ClassifiedPollerCandidate[] = [];

  for (const candidate of candidates) {
    if (!isRefundSettleable(candidate.status)) {
      continue;
    }

    const decision = decideRefundAttempt({
      attempts: candidate.providerRefundAttempts,
      lastAttemptAt: candidate.lastRefundAttemptAt,
      now,
    });

    const item: ClassifiedPollerCandidate = {
      id: candidate.id,
      action: decision.action,
      decision,
    };

    if (decision.action === "execute") {
      toExecute.push(item);
    } else if (decision.action === "exhaust") {
      toExhaust.push(item);
    } else {
      toSkip.push(item);
    }
  }

  return { toExecute, toSkip, toExhaust };
}

export interface SettlementBatchSummary {
  errors: number;
  executed: number;
  exhausted: number;
  scanned: number;
  skipped: number;
}
