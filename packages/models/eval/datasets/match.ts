/**
 * Match test set: 100 user profiles with ground-truth partner IDs.
 *
 * Ground truth = (CEFR match) AND (≥1 shared interest) AND (D7 active).
 * Recall@10 = how often the ground truth partner appears in top-10 matches.
 *
 * For dev: synthetic set. For production: derive from past 30d
 *   call-pair data (user A called user B → ground truth = B).
 */

export interface MatchTestItem {
  groundTruthPartnerId: string;
  userId: string;
}

const MOCK: MatchTestItem[] = [
  { userId: "user-001", groundTruthPartnerId: "user-042" },
  { userId: "user-002", groundTruthPartnerId: "user-078" },
  { userId: "user-003", groundTruthPartnerId: "user-105" },
  // TODO: derive 100 real pairs from past call history before production
];

export function loadMatchTest(limit: number): Promise<MatchTestItem[]> {
  if (limit <= MOCK.length) {
    return MOCK.slice(0, limit);
  }
  const out: MatchTestItem[] = [];
  while (out.length < limit) {
    out.push(MOCK[out.length % MOCK.length] as MatchTestItem);
  }
  return out;
}
