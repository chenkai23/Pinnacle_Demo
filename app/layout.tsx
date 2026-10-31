import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "本地 EPUB 阅读器",
  description: "在浏览器里，安静地读一本书。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
