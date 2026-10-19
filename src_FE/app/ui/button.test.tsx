import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button pending feedback", () => {
  it("lays out the pending content before the request starts", () => {
    render(<Button pendingLabel="Đang lưu…">Lưu hồ sơ</Button>);

    const button = screen.getByRole("button", { name: "Lưu hồ sơ" });
    expect(screen.getByText("Đang lưu…").parentElement).toHaveClass("invisible");
    expect(button.querySelector("svg")).toHaveClass("size-4");
  });

  it("blocks a repeated action and replaces the visible label immediately", () => {
    render(
      <Button pending pendingLabel="Đang đăng nhập…">
        Đăng nhập
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Đang đăng nhập…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Đăng nhập").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("uses a smaller loader in compact buttons", () => {
    render(
      <Button size="sm" pending pendingLabel="Đang lưu…">
        Lưu
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Đang lưu…" }).querySelector("svg")).toHaveClass(
      "size-3.5",
    );
  });

  it("restores the action after the request settles", () => {
    const { rerender } = render(
      <Button pending pendingLabel="Đang lưu…">
        Lưu hồ sơ
      </Button>,
    );

    rerender(<Button pending={false}>Lưu hồ sơ</Button>);
    expect(screen.getByRole("button", { name: "Lưu hồ sơ" })).toBeEnabled();
  });
});
