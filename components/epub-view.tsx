"use client";

import { useEffect, useRef, useState } from "react";
import type Book from "epubjs/types/book";
import type { Location } from "epubjs";
import type Rendition from "epubjs/types/rendition";
import { bookId, loadPosition, savePosition } from "../lib/reading-position";

export default function EpubView({ data, onTitle }: { data: ArrayBuffer; onTitle: (title: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("正在打开书籍…");
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setStatus("正在打开书籍…");
    setError(false);
    setNotice("");
    let active = true;
    let book: Book | undefined;
    let latestCfi = "";
    let id = "";
    let canSave = false;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let rendition: (Rendition & { reportLocation(): void }) | undefined;
    const element = host.current;
    // Continuous manager can suppress the first scroll following display().
    // Capture real scroller events too so even a single scroll updates the CFI.
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { if (active && canSave) rendition?.reportLocation(); }, 120);
    };
    element?.addEventListener("scroll", onScroll, true);
    const persist = () => {
      if (!active || !canSave || !id || !latestCfi) return;
      try { savePosition(id, latestCfi); }
      catch { setNotice("阅读位置无法保存，请检查浏览器存储权限或空间。你仍可继续阅读。"); }
    };
    window.addEventListener("pagehide", persist);
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
        let saved: string | null = null;
        try {
          id = await bookId(data);
          saved = loadPosition(id);
          if (saved && !book.spine.get(saved)) throw new Error("Unknown saved chapter");
        } catch {
          saved = null;
          if (active) setNotice("无法恢复阅读位置，已从开头打开。你仍可继续阅读。");
        }
        if (!active || !host.current) return;
        rendition = book.renderTo(host.current, {
          width: "100%", height: "100%", flow: "scrolled-doc",
          manager: "continuous", allowScriptedContent: false,
        }) as Rendition & { reportLocation(): void };
        rendition.on("relocated", (location: Location) => {
          if (!active) return;
          latestCfi = location.start.cfi;
          persist();
        });
        try { await rendition.display(saved || undefined); }
        catch (failure) {
          if (!saved || !active) throw failure;
          setNotice("无法恢复阅读位置，已从开头打开。你仍可继续阅读。");
          await rendition.display();
        }
        canSave = true;
        persist();
        if (active) { setStatus(""); setError(false); }
      } catch {
        if (active) { setError(true); setStatus("无法打开这本书，请选择有效且未加密的 EPUB 文件。"); }
      } finally { clearTimeout(timer); }
    }
    void open();
    return () => { persist(); active = false; element?.removeEventListener("scroll", onScroll, true); clearTimeout(scrollTimer); window.removeEventListener("pagehide", persist); clearTimeout(timer); book?.destroy(); };
  }, [data, onTitle]);

  return <section className="epub-reader" aria-label="书籍正文">
    {status && <p className="reader-message" role={error ? "alert" : "status"}>{status}</p>}
    {notice && <p className="reader-message" role="status">{notice}</p>}
    <div className="epub-host" ref={host} hidden={error} />
  </section>;
}
