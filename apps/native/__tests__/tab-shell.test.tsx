import { render, screen } from "@testing-library/react-native";
import TabLayout from "../app/(app)/(tabs)/_layout";

const EXPECTED_TABS = [
  { name: "home", title: "Home" },
  { name: "classes", title: "Classes" },
  { name: "rooms", title: "Rooms" },
  { name: "learning", title: "Learning" },
  { name: "my-view", title: "My View" },
] as const;

const HIDDEN_SCREENS = ["ai", "progress", "recommendations"] as const;

const TAB_TEST_ID = /^tab:/;

describe("tab nav shell", () => {
  it("renders all five tabs with their configured titles", async () => {
    await render(<TabLayout />);

    for (const { name, title } of EXPECTED_TABS) {
      expect(screen.getByTestId(`tab:${name}`)).toBeTruthy();
      expect(screen.getByLabelText(title)).toBeTruthy();
    }
  });

  it("renders exactly five tab screens, with no duplicate routes", async () => {
    await render(<TabLayout />);

    const renderedTabs = screen
      .getAllByTestId(TAB_TEST_ID)
      .map((node) => node.props.testID.replace("tab:", ""));

    expect(renderedTabs).toHaveLength(EXPECTED_TABS.length);
    expect(new Set(renderedTabs).size).toBe(renderedTabs.length);
  });

  it("keeps auxiliary routes out of the tab bar", async () => {
    await render(<TabLayout />);

    for (const name of HIDDEN_SCREENS) {
      expect(screen.queryByTestId(`tab:${name}`)).toBeNull();
    }
  });
});
