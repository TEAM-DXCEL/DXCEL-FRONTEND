import { createRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";
import { Select } from "./select";

describe("form fields", () => {
  it("associates labels, help and errors while preserving external descriptions", () => {
    const { rerender } = render(
      <>
        <p id="external">공통 안내</p>
        <Input
          label="실험 이름"
          description="이름을 입력하세요"
          error="이름이 필요합니다"
          aria-describedby="external"
        />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "실험 이름" });
    const description = input
      .getAttribute("aria-describedby")!
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ");
    expect(description).toContain("공통 안내");
    expect(description).toContain("이름을 입력하세요");
    expect(description).toContain("이름이 필요합니다");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    rerender(<Input label="실험 이름" />);
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).not.toBe("true");
    expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBeNull();
  });

  it("generates distinct IDs and allows label clicks and ref focus", async () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <Input ref={ref} label="실험 이름" />
        <Input label="담당자" />
      </>,
    );
    const name = screen.getByRole("textbox", { name: "실험 이름" });
    expect(name.id).not.toBe(screen.getByRole("textbox", { name: "담당자" }).id);
    await userEvent.click(screen.getByText("실험 이름"));
    expect(document.activeElement).toBe(ref.current);
  });

  it("keeps controlled input and select values in native form submission", async () => {
    const result = vi.fn();
    function Form() {
      const [name, setName] = useState("");
      const [status, setStatus] = useState("draft");
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            result(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          <Input
            label="실험 이름"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Select
            label="상태"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="draft">설계 중</option>
            <option value="complete">완료</option>
          </Select>
          <Input label="비활성 값" name="ignored" defaultValue="숨김" disabled />
          <button type="submit">제출</button>
        </form>
      );
    }
    render(<Form />);
    await userEvent.type(screen.getByRole("textbox", { name: "실험 이름" }), "EXP-001");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "상태" }), "complete");
    await userEvent.click(screen.getByRole("button", { name: "제출" }));
    expect(result).toHaveBeenCalledWith({ name: "EXP-001", status: "complete" });
  });

  it("exposes select validation and supports native required validation", async () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} label="프로젝트" required defaultValue="" error="프로젝트를 선택하세요">
        <option value="">선택</option>
        <option value="a">프로젝트 A</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "프로젝트" }) as HTMLSelectElement;
    expect(select).toBe(ref.current);
    expect(select.checkValidity()).toBe(false);
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(select.getAttribute("aria-describedby")!)?.textContent).toBe(
      "프로젝트를 선택하세요",
    );
    await userEvent.selectOptions(select, "a");
    expect(select.checkValidity()).toBe(true);
  });
});
