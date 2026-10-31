export const FONT_SIZES = [14, 16, 18, 20, 24, 28] as const;
export const DEFAULT_FONT_SIZE = 18;
const KEY = "epub-font-size";
export type Theme = "light" | "dark";
export const BOOK_COLORS = {
  light: { background: "#ffffff", text: "#253347", link: "#254d78" },
  dark: { background: "#202833", text: "#e2e8f0", link: "#a8cff8" },
};

export function loadTheme(): Theme {
  return localStorage.getItem("epub-theme") === "dark" ? "dark" : "light";
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem("epub-theme", theme);
}

export function loadFontSize(): number {
  const value = Number(localStorage.getItem(KEY));
  return FONT_SIZES.some(size => size === value) ? value : DEFAULT_FONT_SIZE;
}

export function saveFontSize(value: number): void {
  if (!FONT_SIZES.some(size => size === value)) throw new Error("Unsupported font size");
  localStorage.setItem(KEY, String(value));
}
