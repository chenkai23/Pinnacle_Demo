import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReaderShell from "../components/reader-shell";

describe("reader shell", () => {
  it("explains the empty state and disables unavailable actions", () => {
    render(<ReaderShell />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("尚未打开书籍");
    expect(screen.getByRole("main")).toHaveTextContent("从顶部导入一本 EPUB");
    expect(screen.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "阅读设置" })).toBeDisabled();
  });

  it("rejects unsupported and corrupt files without replacing the empty state", async () => {
    render(<ReaderShell />);
    const input = screen.getByLabelText("选择 EPUB 文件");
    fireEvent.change(input, { target: { files: [new File(["pdf"], "book.pdf")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("请选择 .epub");
    fireEvent.change(input, { target: { files: [new File(["broken"], "broken.epub")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("文件损坏");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("尚未打开书籍");
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
