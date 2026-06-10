/**
 * EFCAMDAT-style held-out CEFR test set.
 *
 * For F8.2 dev: use a small mock dataset (20 items).
 * For production eval: load from HuggingFace `efcamdat/efcamdat` or similar
 *   (CC-BY-NC license — needs sourcing).
 *
 * Each item: { transcript, expectedCefr, priorCefr? }
 */

export interface CefrTestItem {
  expectedCefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  priorCefr?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  transcript: string;
}

const MOCK: CefrTestItem[] = [
  {
    transcript:
      "I go to market yesterday and buy some rice. It was very cheap.",
    expectedCefr: "A1",
  },
  {
    transcript:
      "Last weekend I was playing football with my friends. We had a good match.",
    expectedCefr: "A2",
  },
  {
    transcript:
      "If I had more free time, I would learn to play the guitar because music has always fascinated me.",
    expectedCefr: "B1",
  },
  {
    transcript:
      "Although the policy was implemented with good intentions, its unintended consequences have sparked considerable debate among scholars.",
    expectedCefr: "B2",
  },
  {
    transcript:
      "The proliferation of misinformation in digital media necessitates a multifaceted approach encompassing media literacy, platform accountability, and critical pedagogy.",
    expectedCefr: "C1",
  },
  {
    transcript:
      "Were one to interrogate the ostensibly self-evident dichotomy between rationality and affect, one would discover a far more intricate epistemological terrain.",
    expectedCefr: "C2",
  },
  // TODO: load 200 real EFCAMDAT items before production rollout
];

export function loadCefrTest(limit: number): Promise<CefrTestItem[]> {
  // For dev: pad/cycle the mock set to `limit`
  if (limit <= MOCK.length) {
    return MOCK.slice(0, limit);
  }
  const out: CefrTestItem[] = [];
  while (out.length < limit) {
    out.push(MOCK[out.length % MOCK.length] as CefrTestItem);
  }
  return out;
}
