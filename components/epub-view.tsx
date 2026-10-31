"use client";

import { useEffect, useRef, useState } from "react";
import type Book from "epubjs/types/book";
import type { Location } from "epubjs";
import type Rendition from "epubjs/types/rendition";
import { bookId, loadPosition, savePosition } from "../lib/reading-position";
import { createPortal } from "react-dom";
import type { NavItem } from "epubjs";
import ChapterNavigation from "./chapter-navigation";

export default function EpubView({ data, onTitle, contentsTarget, fontSize }: { data: ArrayBuffer; onTitle: (title: string) => void; contentsTarget: HTMLElement | null; fontSize: number }) {
  const host = useRef<HTMLDivElement>(null);
  const memoryPosition = useRef<{ data: ArrayBuffer; cfi: string } | null>(null);
  const [status, setStatus] = useState("正在打开书籍…");
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState("");
  const [toc, setToc] = useState<NavItem[]>([]);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(true);
  const navigate = useRef<(href: string) => Promise<void>>(async () => {});
  const turnPage = useRef<(direction: "prev" | "next") => Promise<void>>(async () => {});
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  useEffect(() => {
    setStatus("正在打开书籍…");
    setError(false);
    setNotice("");
    setToc([]);
    setCurrent("");
    setBusy(true);
    setEdges({ atStart: true, atEnd: true });
    let active = true;
    let book: Book | undefined;
    let latestCfi = "";
    let id = "";
    let canSave = false;
    let actionRunning = false;
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
        const { default: ePub, EpubCFI } = await import("epubjs");
        if (!active || !host.current) return;
        book = ePub();
        // Await open directly: book.ready can stay pending when malformed files fail.
        await book.open(data, "binary");
        if (!active || !host.current) return;
        const metadata = await book.loaded.metadata;
        if (!active) return;
        onTitle(metadata.title || "未命名书籍");
        const navigation = await book.loaded.navigation;
        if (!active) return;
        setToc(navigation.toc);
        const flatten = (items: NavItem[]): NavItem[] => items.flatMap(item => [item, ...flatten(item.subitems || [])]);
        const chapters = flatten(navigation.toc);
        let saved: string | null = null;
        try {
          id = await bookId(data);
          saved = memoryPosition.current?.data === data ? memoryPosition.current.cfi : loadPosition(id);
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
        // Apply before display so restoring CFI uses the new text layout.
        rendition.themes.default({
          body: { "font-size": `${fontSize}px !important` },
          "p, li, blockquote, dd, dt": { "font-size": "1em !important" },
        });
        rendition.on("relocated", (location: Location) => {
          if (!active) return;
          latestCfi = location.start.cfi;
          memoryPosition.current = { data, cfi: latestCfi };
          // epub.js rounds page counts in scrolled mode, which can report atEnd
          // before the scroller reaches the bottom. Use actual scroll bounds.
          const viewport = element?.querySelector(".epub-container");
          setEdges({
            atStart: location.start.index === book?.spine.first().index && !!viewport && viewport.scrollTop <= 1,
            atEnd: location.end.index === book?.spine.last().index && !!viewport && viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1,
          });
          const section = book?.spine.get(latestCfi);
          let selected = "";
          for (const item of chapters) {
            if (!section || book?.spine.get(item.href)?.index !== section.index) continue;
            if (!selected) selected = item.href;
            const fragment = item.href.split("#")[1];
            if (!fragment) { selected = item.href; continue; }
            try {
              const anchor = section.document?.getElementById(decodeURIComponent(fragment));
              if (anchor && new EpubCFI().compare(section.cfiFromElement(anchor), latestCfi) <= 0) selected = item.href;
            } catch { /* A malformed fragment should not interrupt reading. */ }
          }
          setCurrent(selected);
          persist();
        });
        navigate.current = async href => {
          if (!active || !rendition || actionRunning || !canSave) return;
          actionRunning = true;
          setBusy(true);
          try {
            // Never hand external or non-spine URLs to the renderer.
            if (!book?.spine.get(href)) throw new Error("Unknown chapter");
            await rendition.display(href);
            if (active) rendition.reportLocation();
          } catch {
            if (active) setNotice("无法跳转到该章节，请选择其他章节或继续滚动阅读。");
          } finally { actionRunning = false; if (active) setBusy(false); }
        };
        turnPage.current = async direction => {
          if (!active || !rendition || !canSave || actionRunning) return;
          actionRunning = true;
          setBusy(true);
          try {
            await rendition[direction]();
            if (active) rendition.reportLocation();
          } catch {
            if (active) setNotice("翻页失败，请重试或通过目录跳转。");
          } finally { actionRunning = false; if (active) setBusy(false); }
        };
        try { await rendition.display(saved || undefined); }
        catch (failure) {
          if (!saved || !active) throw failure;
          setNotice("无法恢复阅读位置，已从开头打开。你仍可继续阅读。");
          await rendition.display();
        }
        canSave = true;
        if (active) setBusy(false);
        persist();
        if (active) { setStatus(""); setError(false); }
      } catch {
        if (active) { setError(true); setStatus("无法打开这本书，请选择有效且未加密的 EPUB 文件。"); }
      } finally { clearTimeout(timer); }
    }
    void open();
    return () => { persist(); active = false; element?.removeEventListener("scroll", onScroll, true); clearTimeout(scrollTimer); window.removeEventListener("pagehide", persist); clearTimeout(timer); book?.destroy(); };
  }, [data, onTitle, fontSize]);

  return <section className="epub-reader" aria-label="书籍正文">
    {contentsTarget && createPortal(<ChapterNavigation items={toc} current={current} busy={busy} onSelect={href => { void navigate.current(href); }} />, contentsTarget)}
    {status && <p className="reader-message" role={error ? "alert" : "status"}>{status}</p>}
    {notice && <p className="reader-message" role="status">{notice}</p>}
    <div className="epub-host" ref={host} hidden={error} />
    <div className="page-controls" role="group" aria-label="翻页">
      <button className="quiet-button" disabled={busy || !!status || error || edges.atStart} onClick={() => { void turnPage.current("prev"); }}>上一页</button>
      <span aria-live="polite">{!status && !error ? edges.atStart && edges.atEnd ? "全文已显示" : edges.atStart ? "已到开头" : edges.atEnd ? "已到结尾" : "按一屏翻页" : ""}</span>
      <button className="quiet-button" disabled={busy || !!status || error || edges.atEnd} onClick={() => { void turnPage.current("next"); }}>下一页</button>
    </div>
  </section>;
}
