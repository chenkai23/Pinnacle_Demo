import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ChapterNavigation from "../components/chapter-navigation";

it("renders nested chapters, marks current location and selects a target", () => {
  const select = vi.fn();
  render(<ChapterNavigation items={[{ id: "one", href: "one.xhtml", label: "One", subitems: [{ id: "child", href: "one.xhtml#child", label: "Child" }] }]} current="one.xhtml#child" busy={false} onSelect={select} />);
  expect(screen.getByRole("button", { name: "Child" })).toHaveAttribute("aria-current", "location");
  expect(screen.getAllByRole("list")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "One" }));
  expect(select).toHaveBeenCalledWith("one.xhtml");
});

it("explains a missing table of contents", () => {
  render(<ChapterNavigation items={[]} current="" busy={false} onSelect={() => {}} />);
  expect(screen.getByText(/没有提供章节目录/)).toBeVisible();
});
