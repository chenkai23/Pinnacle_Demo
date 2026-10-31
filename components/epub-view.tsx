"use client";

import { useEffect, useRef, useState } from "react";
import type Book from "epubjs/types/book";

export default function EpubView({ data, onTitle }: { data: ArrayBuffer; onTitle: (title: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("正在打开书籍…");
  const [error, setError] = useState(false);

  useEffect(() => {
    setStatus("正在打开书籍…");
    setError(false);
    let active = true;
    let book: Book | undefined;
    const timer = setTimeout(() => {
      if (active) { setError(true); setStatus("打开超时，请重新导入有效且未加密的 EPUB 文件。"); }
    }, 20000);
    async function open() {
      try {
        const { default: ePub } = await import("epubjs");
        if (!active || !host.current) return;
        book = ePub();
        // Await open directly: book.ready can stay pending when malformed files fail.
        await book.open(data, "binary");
        if (!active || !host.current) return;
        const metadata = await book.loaded.metadata;
        if (!active) return;
        onTitle(metadata.title || "未命名书籍");
        const rendition = book.renderTo(host.current, {
          width: "100%", height: "100%", flow: "scrolled-doc",
          manager: "continuous", allowScriptedContent: false,
        });
        await rendition.display();
        if (active) { setStatus(""); setError(false); }
      } catch {
        if (active) { setError(true); setStatus("无法打开这本书，请选择有效且未加密的 EPUB 文件。"); }
      } finally { clearTimeout(timer); }
    }
    void open();
    return () => { active = false; clearTimeout(timer); book?.destroy(); };
  }, [data, onTitle]);

  return <section className="epub-reader" aria-label="书籍正文">
    {status && <p className="reader-message" role={error ? "alert" : "status"}>{status}</p>}
    <div className="epub-host" ref={host} hidden={error} />
  </section>;
}
