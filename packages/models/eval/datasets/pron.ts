/**
 * Pronunciation test set: 50 audio clips with human-rated scores (3-rater avg).
 *
 * For dev: placeholder set. For production: source from
 *   - LibriSpeech test-clean (with WER proxy)
 *   - Custom BD-accented English collection (F8.4)
 *
 * Each item: { audioUrl, expectedText, humanAvgScore (0-100) }
 */

export interface PronTestItem {
  audioUrl: string;
  expectedText: string;
  humanAvgScore: number;
}

const MOCK: PronTestItem[] = [
  {
    audioUrl: "https://example.com/audio/test-001.m4a",
    expectedText: "Hello, how are you today",
    humanAvgScore: 85,
  },
  {
    audioUrl: "https://example.com/audio/test-002.m4a",
    expectedText: "I would like a cup of coffee please",
    humanAvgScore: 72,
  },
  {
    audioUrl: "https://example.com/audio/test-003.m4a",
    expectedText: "The weather is nice this morning",
    humanAvgScore: 90,
  },
  // TODO: replace with 50 real BD-accented clips before production
];

export function loadPronTest(limit: number): Promise<PronTestItem[]> {
  if (limit <= MOCK.length) {
    return MOCK.slice(0, limit);
  }
  const out: PronTestItem[] = [];
  while (out.length < limit) {
    out.push(MOCK[out.length % MOCK.length] as PronTestItem);
  }
  return out;
}
