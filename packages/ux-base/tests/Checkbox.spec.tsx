import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { Checkbox, Switch } from "../src/base/Checkbox";

describe("BaseCheckbox", () => {
  it("supports native changes when uncontrolled", () => {
    render(<Checkbox label="Notify" defaultChecked />);
    const checkbox = screen.getByRole("checkbox", { name: "Notify" });
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("does not toggle while disabled", () => {
    render(<Checkbox label="Unavailable" disabled />);
    const checkbox = screen.getByRole("checkbox", { name: "Unavailable" });
    checkbox.click();
    expect(checkbox).not.toBeChecked();
  });
});

describe("BaseSwitch", () => {
  it("supports controlled state through native change events", () => {
    function ControlledSwitch() {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          label="Auto resume"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
      );
    }
    render(<ControlledSwitch />);
    const toggle = screen.getByRole("switch", { name: "Auto resume" });
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
});
