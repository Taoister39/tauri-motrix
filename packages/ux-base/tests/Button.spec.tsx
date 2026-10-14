import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";

import { Button, IconButton } from "../src/base/Button";

describe("BaseButton", () => {
  it("forwards native attributes and ref without submitting by default", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} name="save" data-purpose="save" className="custom">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("name", "save");
    expect(button).toHaveClass("custom");
    expect(button).not.toHaveAttribute("variant");
  });

  it.each([{ disabled: true }, { loading: true }])(
    "blocks actions while unavailable: %j",
    (state) => {
      const onClick = jest.fn();
      render(
        <Button {...state} onClick={onClick}>
          Save
        </Button>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
      if ("loading" in state)
        expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    },
  );
});

describe("IconButton", () => {
  it("uses the supplied accessible name", () => {
    render(<IconButton aria-label="Refresh">↺</IconButton>);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });
});
