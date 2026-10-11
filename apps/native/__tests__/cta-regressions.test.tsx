import { readFileSync } from "node:fs";
import { join } from "node:path";

// Jest runs from apps/native, so this is the package root.
const APP_ROOT = process.cwd();

const read = (relative: string) =>
  readFileSync(join(APP_ROOT, relative), "utf8");

const BLOCK_TEMPLATE = ":\\s*\\{[^}]*\\}";
const DISABLED_PRIMARY_APPLIED =
  /variant === "primary" && isDisabled && styles\.disabledPrimary/;
const FABRICATED_PREVIEWS = /TRAINER_PREVIEW|COURSE_PREVIEW|STREAK_DAYS/;
const FABRICATED_COPY =
  /IELTS Speaking|Grammar Made Easy|Interview Preparation/;
const INERT_AFFORDANCE = /onAction=\{\(\) => undefined\}/;
const GO_TO_CALL = /Go to Call/;
const ROUTER_BACK = /router\.back\(\)/;
const ROOM_REDIRECT = /router\.replace\("\/call\/lobby"\)/;
const WHITE_HEX = /#FFFFFF/;
const HAS_BACKGROUND = /backgroundColor:/;
const HAS_ONE_PIXEL_BORDER = /borderWidth:\s*1/;
const USES_MUTED_FOREGROUND = /mutedForeground/;
const USES_DESTRUCTIVE_TOKEN = /theme\.colors\.destructive\b/;
const USES_DESTRUCTIVE_FOREGROUND = /destructiveForeground/;

// Reads a style block's own declarations while dropping comment lines, so prose
// that merely names a token can neither satisfy nor break an assertion.
function decls(source: string, key: string): string {
  const withoutComments = source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  const pattern = new RegExp(key + BLOCK_TEMPLATE, "s");
  return withoutComments.match(pattern)?.[0] ?? "";
}

// A disabled primary button used to fall through to a branch with no primary
// background, leaving #FFFFFF text at 50% opacity on the page background. That
// type-checked cleanly and rendered an invisible Sign in button, so it is
// pinned here rather than left to manual review.
describe("Button disabled state stays visible", () => {
  const source = read("components/ui/button.tsx");

  it("keeps a real surface and a border when disabled", () => {
    const style = decls(source, "disabledPrimary");
    expect(style).toMatch(HAS_BACKGROUND);
    expect(style).toMatch(HAS_ONE_PIXEL_BORDER);
  });

  it("applies that surface in the branch a disabled primary renders through", () => {
    const fallback = source.slice(source.indexOf("styles.base,"));
    expect(fallback).toMatch(DISABLED_PRIMARY_APPLIED);
  });

  it("labels the disabled button muted rather than white", () => {
    const style = decls(source, "labelDisabledPrimary");
    expect(style).toMatch(USES_MUTED_FOREGROUND);
    expect(style).not.toMatch(WHITE_HEX);
  });
});

// `destructiveForeground` is #FFFFFF, meant for a solid fill. On the 10%
// `destructiveSurface` tint it rendered at roughly 1.2:1 — unreadable.
it("Sign out uses destructive text on the destructive tint", () => {
  const style = decls(read("app/(app)/settings.tsx"), "signOutText");
  expect(style).toMatch(USES_DESTRUCTIVE_TOKEN);
  expect(style).not.toMatch(USES_DESTRUCTIVE_FOREGROUND);
});

// The match screen routed "Go to Call" and both filter buttons through
// router.back(), so the core practice loop never reached a call room.
describe("Matching routes to the call lobby", () => {
  const source = read("app/call/matching.tsx");

  it("routes the found state to the lobby", () => {
    expect(source).toMatch(ROOM_REDIRECT);
  });

  it("drops the promise of a call it cannot place", () => {
    expect(source).not.toMatch(GO_TO_CALL);
  });

  it("does not send the found state backwards", () => {
    const start = source.indexOf('status === "found"');
    const end = source.indexOf(
      'accessibilityLabel={\n              status === "found"'
    );
    expect(source.slice(start, end)).not.toMatch(ROUTER_BACK);
  });
});

// PRODUCT.md:97 forbids fabricating absent work. Home shipped trainer
// ratings, a course catalog, a streak pinned at 0 and a talk-time bar that
// could never advance, all with no endpoint behind them.
describe("Home carries no fabricated content", () => {
  const source = read("app/(app)/(tabs)/home.tsx");

  it("has no preview catalogues", () => {
    expect(source).not.toMatch(FABRICATED_PREVIEWS);
    expect(source).not.toMatch(FABRICATED_COPY);
  });

  it("has no inert section affordances", () => {
    expect(source).not.toMatch(INERT_AFFORDANCE);
  });
});
