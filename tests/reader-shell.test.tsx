import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReaderShell from "../components/reader-shell";

describe("reader shell", () => {
  it("explains the empty state and disables unavailable actions", () => {
    render(<ReaderShell />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("尚未打开书籍");
    expect(screen.getByRole("main")).toHaveTextContent("导入与正文阅读功能将在下一步接入");
    expect(screen.getByRole("button", { name: "导入 EPUB" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "阅读设置" })).toBeDisabled();
  });

  it("collapses and reopens the contents with matching accessibility state", () => {
    render(<ReaderShell />);
    const toggle = screen.getByRole("button", { name: "目录" });
    expect(screen.getByRole("complementary", { name: "书籍目录" })).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("complementary")).toBeVisible();
  });
});
