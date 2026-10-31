export const FONT_SIZES = [14, 16, 18, 20, 24, 28] as const;
export const DEFAULT_FONT_SIZE = 18;
const KEY = "epub-font-size";

export function loadFontSize(): number {
  const value = Number(localStorage.getItem(KEY));
  return FONT_SIZES.some(size => size === value) ? value : DEFAULT_FONT_SIZE;
}

export function saveFontSize(value: number): void {
  if (!FONT_SIZES.some(size => size === value)) throw new Error("Unsupported font size");
  localStorage.setItem(KEY, String(value));
}
