import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReaderShell from "../components/reader-shell";

vi.mock("../lib/book-storage", () => ({ loadBook: vi.fn().mockResolvedValue(null), saveBook: vi.fn().mockResolvedValue(undefined) }));

describe("reader shell", () => {
  beforeEach(() => localStorage.clear());
  it("explains the empty state and disables unavailable actions", async () => {
    render(<ReaderShell />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("尚未打开书籍");
    expect(screen.getByRole("main")).toHaveTextContent("从顶部导入一本 EPUB");
    expect(await screen.findByRole("button", { name: "导入 EPUB" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "阅读设置" })).toBeEnabled();
  });

  it("changes and saves the font size through the settings panel", async () => {
    localStorage.setItem("epub-font-size", "24");
    render(<ReaderShell />);
    await screen.findByRole("button", { name: "导入 EPUB" });
    fireEvent.click(screen.getByRole("button", { name: "阅读设置" }));
    expect(screen.getByLabelText("正文字号")).toHaveValue("24");
    fireEvent.change(screen.getByLabelText("正文字号"), { target: { value: "20" } });
    expect(localStorage.getItem("epub-font-size")).toBe("20");
    fireEvent.click(screen.getByRole("button", { name: "阅读设置" }));
    expect(screen.queryByLabelText("正文字号")).not.toBeInTheDocument();
  });

  it("restores, switches and saves the reading theme", async () => {
    localStorage.setItem("epub-theme", "dark");
    render(<ReaderShell />);
    await screen.findByRole("button", { name: "导入 EPUB" });
    fireEvent.click(screen.getByRole("button", { name: "阅读设置" }));
    expect(screen.getByLabelText("主题")).toHaveValue("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    fireEvent.change(screen.getByLabelText("主题"), { target: { value: "light" } });
    expect(localStorage.getItem("epub-theme")).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("rejects unsupported and corrupt files without replacing the empty state", async () => {
    render(<ReaderShell />);
    await screen.findByRole("button", { name: "导入 EPUB" });
    const input = screen.getByLabelText("选择 EPUB 文件");
    fireEvent.change(input, { target: { files: [new File(["pdf"], "book.pdf")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("请选择 .epub");
    fireEvent.change(input, { target: { files: [new File(["broken"], "broken.epub")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("文件损坏");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("尚未打开书籍");
  });

  it("collapses and reopens the contents with matching accessibility state", async () => {
    render(<ReaderShell />);
    await screen.findByRole("button", { name: "导入 EPUB" });
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
