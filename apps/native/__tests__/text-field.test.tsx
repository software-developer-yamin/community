import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { TextField } from "../components/ui/text-field";

function ControlledTextField({
  errorText,
  onChangeText,
}: {
  errorText?: string;
  onChangeText: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <TextField
      errorText={errorText}
      label="Email address"
      onChangeText={(next) => {
        setValue(next);
        onChangeText(next);
      }}
      value={value}
    />
  );
}

describe("TextField", () => {
  it("renders the label and the input bound to it", async () => {
    await render(<ControlledTextField onChangeText={jest.fn()} />);

    expect(screen.getByText("Email address")).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
  });

  it("exposes errorText as a visible alert", async () => {
    await render(
      <ControlledTextField
        errorText="Enter a valid email"
        onChangeText={jest.fn()}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(screen.getByText("Enter a valid email")).toBeTruthy();
  });

  it("reports typed text through onChangeText", async () => {
    const onChangeText = jest.fn();
    await render(<ControlledTextField onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByLabelText("Email address"), "yamin@x.io");

    expect(onChangeText).toHaveBeenCalledWith("yamin@x.io");
  });

  it("shows no alert when errorText is absent", async () => {
    await render(<ControlledTextField onChangeText={jest.fn()} />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
