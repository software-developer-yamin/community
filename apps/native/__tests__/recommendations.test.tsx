import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_ROOT = process.cwd();
const read = (relative: string) =>
  readFileSync(join(APP_ROOT, relative), "utf8");

describe("RecommendationsScreen - Source & Integration Contracts", () => {
  const source = read("app/(app)/(tabs)/recommendations.tsx");
  const learningSource = read("app/(app)/(tabs)/learning/index.tsx");

  it("uses the standard EmptyState component for network errors and empty states", () => {
    expect(source).toContain(
      'import { EmptyState } from "@/components/ui/empty-state"'
    );
    expect(source).toContain('title="Could not load recommendations"');
    expect(source).toContain('title="No recommendations yet"');
  });

  it("wires getRecommendations and trackInteraction procedures", () => {
    expect(source).toContain("orpc.recommendations.getRecommendations");
    expect(source).toContain("orpc.recommendations.trackInteraction");
  });

  it("handles RE-3.2 empty state with guidance and action", () => {
    expect(source).toContain('actionLabel="Generate Recommendations"');
    expect(source).toContain(
      "You've explored all the content at your level! Try refreshing to recompute recommendations or complete more speaking sessions."
    );
  });

  it("provides an accessible entry card in LearningScreen linking to recommendations", () => {
    expect(learningSource).toContain('href="/(app)/(tabs)/recommendations"');
    expect(learningSource).toContain("Recommended for You");
    expect(learningSource).toContain(
      "Personalized videos, articles & dialogue practice"
    );
  });

  it("supports like, bookmark, and dismiss interaction actions", () => {
    expect(source).toContain('handleInteraction(item.id, "like")');
    expect(source).toContain('handleInteraction(item.id, "bookmark")');
    expect(source).toContain('handleInteraction(item.id, "dismiss")');
  });

  it("supports pull-to-refresh recalculation", () => {
    expect(source).toContain("setRecalculate(true)");
    expect(source).toContain("RefreshControl onRefresh={handleRefresh}");
  });
});
