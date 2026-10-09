import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthRedirectGuard } from "../components/auth-redirect-guard";

jest.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: jest.fn(),
  },
}));

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: jest.fn(),
  },
}));

const { authClient } = jest.requireMock("@/lib/auth-client") as {
  authClient: { useSession: jest.Mock };
};

function Child() {
  return <Text testID="child">protected content</Text>;
}

describe("AuthRedirectGuard", () => {
  beforeEach(() => {
    authClient.useSession.mockReset();
  });

  it("renders nothing while the session query is pending", async () => {
    authClient.useSession.mockReturnValue({
      data: undefined,
      isPending: true,
    });

    await render(
      <AuthRedirectGuard>
        <Child />
      </AuthRedirectGuard>
    );

    expect(screen.queryByTestId("child")).toBeNull();
  });

  it("renders children once the session resolves", async () => {
    authClient.useSession.mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    });

    await render(
      <AuthRedirectGuard>
        <Child />
      </AuthRedirectGuard>
    );

    expect(screen.getByTestId("child")).toBeTruthy();
  });
});
