import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_ROOT = process.cwd();
const read = (relative: string) =>
  readFileSync(join(APP_ROOT, relative), "utf8");

describe("Subscription Screen - Source & Plan Contracts", () => {
  const source = read("app/(app)/subscription.tsx");

  it("includes header back button for navigation", () => {
    expect(source).toContain('accessibilityLabel="Go back"');
    expect(source).toContain("router.back()");
    expect(source).toContain("Subscription");
  });

  it("renders EmptyState component on query error", () => {
    expect(source).toContain(
      'import { EmptyState } from "@/components/ui/empty-state"'
    );
    expect(source).toContain('title="Could not load subscription"');
    expect(source).toContain('actionLabel="Try again"');
  });

  it("wires getSubscription query and toggleAutoRenew mutation", () => {
    expect(source).toContain("orpc.rebuild.getSubscription.queryOptions()");
    expect(source).toContain("orpc.rebuild.toggleAutoRenew.mutationOptions");
    expect(source).toContain("handleToggleAutoRenew");
  });

  it("provides refund request button for active/cancelled subscriptions", () => {
    expect(source).toContain('router.push("/(app)/refund/request")');
    expect(source).toContain("Request refund");
  });

  it("defines available plan catalog with pricing and features", () => {
    expect(source).toContain("Available Plans");
    expect(source).toContain('"Free"');
    expect(source).toContain('"Premium"');
    expect(source).toContain('"Premium Plus"');
    expect(source).toContain("৳299");
    expect(source).toContain("৳499");
    expect(source).toContain("Unlimited 1:1 speaking practice");
    expect(source).toContain("AI Speaking test with deep analysis");
  });

  it("displays upgrade CTA for non-current tiers and disables current plan button", () => {
    expect(source).toContain("Current Plan");
    expect(source).toContain("Upgrade to");
    expect(source).toContain("Most Popular");
  });
});
