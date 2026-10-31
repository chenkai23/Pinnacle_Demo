import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ReaderShell from "../components/reader-shell";
vi.mock("../lib/book-storage", () => ({
  listBooks: vi.fn().mockResolvedValue([]),
  saveBook: vi.fn(),
  deleteBooks: vi.fn(),
}));
beforeEach(() => localStorage.clear());
it("opens on an empty bookshelf and exposes the function rail", async () => {
  render(<ReaderShell />);
  await screen.findByText("从一本书开始。");
  expect(screen.getByRole("button", { name: "导入" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "选择" })).toBeDisabled();
  expect(screen.getByRole("complementary", { name: "功能栏" })).toBeVisible();
});
it("saves typography and background preferences", async () => {
  render(<ReaderShell />);
  await screen.findByText("从一本书开始。");
  fireEvent.click(screen.getByRole("button", { name: "排版" }));
  fireEvent.change(screen.getByLabelText("行高"), { target: { value: "2" } });
  expect(JSON.parse(localStorage.getItem("epub-typography")!).lineHeight).toBe(
    2,
  );
  fireEvent.change(screen.getByLabelText("正文字号"), {
    target: { value: "24" },
  });
  expect(localStorage.getItem("epub-font-size")).toBe("24");
  fireEvent.click(screen.getByRole("button", { name: "背景" }));
  fireEvent.change(screen.getByLabelText("界面模式"), {
    target: { value: "light" },
  });
  expect(localStorage.getItem("epub-theme")).toBe("light");
});

it("offers five accents and five independent backgrounds", async () => {
  localStorage.setItem("epub-background", "auto");
  localStorage.setItem("epub-theme", "light");
  render(<ReaderShell />);
  await screen.findByText("从一本书开始。");
  fireEvent.click(screen.getByRole("button", { name: "背景" }));
  expect(screen.getAllByRole("button", { name: /^主题色 / })).toHaveLength(5);
  expect(screen.getAllByRole("button", { name: /^背景 / })).toHaveLength(5);
  expect(
    screen.queryByRole("button", { name: /跟随主题/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "背景 纯白" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.change(screen.getByLabelText("界面模式"), {
    target: { value: "dark" },
  });
  expect(screen.getByRole("button", { name: "背景 纯白" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
