export const FONT_SIZES = [14, 16, 18, 20, 24, 28] as const;
export const DEFAULT_FONT_SIZE = 18;
const KEY = "epub-font-size";
export type Theme = "light" | "dark";
export const ACCENTS = ["#168cb4", "#587bd1", "#8867c1", "#34836d", "#a46a36"];
export const BACKGROUNDS = {
  white: {
    label: "纯白",
    background: "#ffffff",
    text: "#253347",
    link: "#254d78",
  },
  paper: {
    label: "米黄",
    background: "#f3e8cf",
    text: "#443c30",
    link: "#654a26",
  },
  green: {
    label: "护眼绿",
    background: "#dce9df",
    text: "#293e32",
    link: "#24634b",
  },
  blue: {
    label: "雾蓝",
    background: "#dfe9f2",
    text: "#293c50",
    link: "#254d78",
  },
  night: {
    label: "深夜",
    background: "#15191e",
    text: "#d6dce4",
    link: "#a8cff8",
  },
};
export type Background = keyof typeof BACKGROUNDS;
export function loadBackground(): Background {
  const value = localStorage.getItem("epub-background");
  return value && Object.hasOwn(BACKGROUNDS, value)
    ? (value as Background)
    : localStorage.getItem("epub-theme") === "light"
      ? "white"
      : "night";
}
export function loadAccent(): string {
  const value = localStorage.getItem("epub-accent") || "";
  return ACCENTS.includes(value) ? value : ACCENTS[0];
}
export type Typography = {
  spread: "single" | "double";
  font: "serif" | "sans";
  lineHeight: number;
};
export const DEFAULT_TYPOGRAPHY: Typography = {
  spread: "double",
  font: "serif",
  lineHeight: 1.8,
};
export function loadTypography(): Typography {
  try {
    const v = JSON.parse(localStorage.getItem("epub-typography") || "null");
    return {
      spread: v?.spread === "single" ? "single" : "double",
      font: v?.font === "sans" ? "sans" : "serif",
      lineHeight: [1.4, 1.6, 1.8, 2, 2.2].includes(v?.lineHeight)
        ? v.lineHeight
        : 1.8,
    };
  } catch {
    return DEFAULT_TYPOGRAPHY;
  }
}
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
  return FONT_SIZES.some((size) => size === value) ? value : DEFAULT_FONT_SIZE;
}

export function saveFontSize(value: number): void {
  if (!FONT_SIZES.some((size) => size === value))
    throw new Error("Unsupported font size");
  localStorage.setItem(KEY, String(value));
}
