import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("does not submit a form unless explicitly requested", async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { rerender } = render(
      <form onSubmit={submit}>
        <Button>저장</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(submit).not.toHaveBeenCalled();
    rerender(
      <form onSubmit={submit}>
        <Button type="submit">저장</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("blocks repeat actions while loading and announces busy state", async () => {
    const click = vi.fn();
    render(
      <Button loading loadingLabel="저장 중" onClick={click}>
        저장
      </Button>,
    );
    const button = screen.getByRole("button", { name: "저장 중" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.click(button);
    expect(click).not.toHaveBeenCalled();
  });

  it("forwards a ref and skips disabled controls in keyboard navigation", async () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <>
        <Button disabled>비활성</Button>
        <Button ref={ref}>활성</Button>
      </>,
    );
    await userEvent.tab();
    expect(document.activeElement).toBe(ref.current);
  });
});
