"use client";

import { useEffect, useRef, useState } from "react";
import type Book from "epubjs/types/book";
import type { Location } from "epubjs";
import type Rendition from "epubjs/types/rendition";
import { bookId, loadPosition, savePosition } from "../lib/reading-position";
import { createPortal } from "react-dom";
import type { NavItem } from "epubjs";
import ChapterNavigation from "./chapter-navigation";
import {
  BACKGROUNDS,
  type Background,
  type Theme,
  type Typography,
} from "../lib/reader-settings";

export default function EpubView({
  data,
  onTitle,
  contentsTarget,
  fontSize,
  theme,
  typography,
  onProgress,
  background,
}: {
  background: Background;
  data: ArrayBuffer;
  onTitle: (title: string) => void;
  contentsTarget: HTMLElement | null;
  fontSize: number;
  theme: Theme;
  typography: Typography;
  onProgress: (id: string, percentage: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const memoryPosition = useRef<{ data: ArrayBuffer; cfi: string } | null>(
    null,
  );
  const [status, setStatus] = useState("正在打开书籍…");
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState("");
  const [toc, setToc] = useState<NavItem[]>([]);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(true);
  const navigate = useRef<(href: string) => Promise<void>>(async () => {});
  const turnPage = useRef<(direction: "prev" | "next") => Promise<void>>(
    async () => {},
  );
  const [pageInfo, setPageInfo] = useState("正在计算进度…");
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
    let preservedAnchor: string | null = null;
    let id = "";
    let canSave = false;
    let locationsReady = false;
    let generating: Promise<unknown> = Promise.resolve();
    let lastWidth = 0;
    let lastHeight = 0;
    const observer = new ResizeObserver(() => {
      if (!element) return;
      const width = element.clientWidth,
        height = element.clientHeight;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      if (active && canSave && !actionRunning && rendition)
        rendition.resize(width, height);
    });
    if (host.current) observer.observe(host.current);
    let actionRunning = false;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let rendition: (Rendition & { reportLocation(): void }) | undefined;
    const element = host.current;
    // Continuous manager can suppress the first scroll following display().
    // Capture real scroller events too so even a single scroll updates the CFI.
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (active && canSave) rendition?.reportLocation();
      }, 120);
    };
    element?.addEventListener("scroll", onScroll, true);
    const wheelTargets = new Set<EventTarget>();
    let wheelAmount = 0,
      wheelTime = 0,
      lastWheelTurn = 0;
    const wheel = (event: Event) => {
      const e = event as WheelEvent;
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = Date.now();
      if (!active || !canSave || actionRunning || now - lastWheelTurn < 350)
        return;
      const delta =
        e.deltaY *
        (e.deltaMode === 1
          ? 16
          : e.deltaMode === 2
            ? element?.clientHeight || 600
            : 1);
      if (now - wheelTime > 200 || Math.sign(delta) !== Math.sign(wheelAmount))
        wheelAmount = 0;
      wheelTime = now;
      wheelAmount += delta;
      if (Math.abs(wheelAmount) < 60) return;
      lastWheelTurn = now;
      void turnPage.current(wheelAmount > 0 ? "next" : "prev");
      wheelAmount = 0;
    };
    const attachWheel = (target: EventTarget) => {
      target.addEventListener("wheel", wheel, { passive: false });
      wheelTargets.add(target);
    };
    if (element) attachWheel(element);
    const persist = () => {
      if (!active || !canSave || !id || !latestCfi) return;
      try {
        savePosition(id, latestCfi);
      } catch {
        setNotice(
          "阅读位置无法保存，请检查浏览器存储权限或空间。你仍可继续阅读。",
        );
      }
    };
    window.addEventListener("pagehide", persist);
    const timer = setTimeout(() => {
      if (active) {
        setError(true);
        setStatus("打开超时，请重新导入有效且未加密的 EPUB 文件。");
      }
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
        const flatten = (items: NavItem[]): NavItem[] =>
          items.flatMap((item) => [item, ...flatten(item.subitems || [])]);
        const chapters = flatten(navigation.toc);
        let saved: string | null = null;
        try {
          id = await bookId(data);
          saved =
            memoryPosition.current?.data === data
              ? memoryPosition.current.cfi
              : loadPosition(id);
          if (saved && !book.spine.get(saved))
            throw new Error("Unknown saved chapter");
        } catch {
          saved = null;
          if (active)
            setNotice("无法恢复阅读位置，已从开头打开。你仍可继续阅读。");
        }
        if (!active || !host.current) return;
        preservedAnchor = saved;
        rendition = book.renderTo(host.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: typography.spread === "double" ? "always" : "none",
          minSpreadWidth: 700,
          manager: "default",
          allowScriptedContent: false,
        }) as Rendition & { reportLocation(): void };
        rendition.hooks.content.register((contents: { document: Document }) =>
          attachWheel(contents.document),
        );
        // Apply before display so restoring CFI uses the new text layout.
        const colors = BACKGROUNDS[background];
        rendition.themes.default({
          "html, body": {
            "background-color": `${colors.background} !important`,
            color: `${colors.text} !important`,
            "color-scheme": theme,
          },
          "*": {
            color: `${colors.text} !important`,
            "background-color": "transparent !important",
            "border-color": `${colors.text} !important`,
          },
          "a, a *": { color: `${colors.link} !important` },
          body: {
            "font-size": `${fontSize}px !important`,
            "font-family": `${typography.font === "serif" ? "Georgia, SimSun, serif" : "Arial, Microsoft YaHei, sans-serif"} !important`,
            "line-height": `${typography.lineHeight} !important`,
          },
          "p, li, blockquote, dd, dt": {
            "font-size": "1em !important",
            "font-family": "inherit !important",
            "line-height": `${typography.lineHeight} !important`,
          },
        });
        rendition.on("relocated", (location: Location) => {
          if (!active || !canSave) return;
          latestCfi = preservedAnchor || location.start.cfi;
          memoryPosition.current = { data, cfi: latestCfi };
          setEdges({ atStart: !!location.atStart, atEnd: !!location.atEnd });
          const percentage =
            locationsReady && book
              ? Math.round(
                  Math.max(
                    0,
                    Math.min(1, book.locations.percentageFromCfi(latestCfi)),
                  ) * 100,
                )
              : null;
          const percent = location.atEnd ? 100 : percentage;
          setPageInfo(
            `本章 ${location.start.displayed.page} / ${location.end.displayed.total} 页 · ${percent === null ? "计算进度中…" : percent + "%"}`,
          );
          if (percent !== null && id) {
            onProgress(id, percent);
            try {
              localStorage.setItem("epub-progress:" + id, String(percent));
            } catch {}
          }
          const section = book?.spine.get(latestCfi);
          let selected = "";
          for (const item of chapters) {
            if (!section || book?.spine.get(item.href)?.index !== section.index)
              continue;
            if (!selected) selected = item.href;
            const fragment = item.href.split("#")[1];
            if (!fragment) {
              selected = item.href;
              continue;
            }
            try {
              const anchor = section.document?.getElementById(
                decodeURIComponent(fragment),
              );
              if (
                anchor &&
                new EpubCFI().compare(
                  section.cfiFromElement(anchor),
                  latestCfi,
                ) <= 0
              )
                selected = item.href;
            } catch {
              /* A malformed fragment should not interrupt reading. */
            }
          }
          setCurrent(selected);
          persist();
        });
        navigate.current = async (href) => {
          if (!active || !rendition || actionRunning || !canSave) return;
          preservedAnchor = null;
          actionRunning = true;
          setBusy(true);
          try {
            // Never hand external or non-spine URLs to the renderer.
            if (!book?.spine.get(href)) throw new Error("Unknown chapter");
            await rendition.display(href);
            if (active) rendition.reportLocation();
          } catch {
            if (active)
              setNotice("无法跳转到该章节，请选择其他章节或继续滚动阅读。");
          } finally {
            actionRunning = false;
            if (active) setBusy(false);
          }
        };
        turnPage.current = async (direction) => {
          if (!active || !rendition || !canSave || actionRunning) return;
          if (
            direction === "prev"
              ? rendition.location?.atStart
              : rendition.location?.atEnd
          )
            return;
          preservedAnchor = null;
          actionRunning = true;
          setBusy(true);
          try {
            await rendition[direction]();
            if (active) rendition.reportLocation();
          } catch {
            if (active) setNotice("翻页失败，请重试或通过目录跳转。");
          } finally {
            actionRunning = false;
            if (active) setBusy(false);
          }
        };
        try {
          await rendition.display(saved || undefined);
        } catch (failure) {
          if (!saved || !active) throw failure;
          preservedAnchor = null;
          setNotice("无法恢复阅读位置，已从开头打开。你仍可继续阅读。");
          await rendition.display();
        }
        generating = book.locations
          .generate(500)
          .then(() => {
            if (active) {
              locationsReady = true;
              rendition?.reportLocation();
            }
          })
          .catch(() => {
            if (active) setNotice("无法计算全书进度，仍可翻页阅读。");
          });
        canSave = true;
        rendition.reportLocation();
        if (active) setBusy(false);
        persist();
        if (active) {
          setStatus("");
          setError(false);
        }
      } catch {
        if (active) {
          setError(true);
          setStatus("无法打开这本书，请选择有效且未加密的 EPUB 文件。");
        }
      } finally {
        clearTimeout(timer);
      }
    }
    const opening = open();
    return () => {
      persist();
      active = false;
      observer.disconnect();
      wheelTargets.forEach((target) =>
        target.removeEventListener("wheel", wheel),
      );
      element?.removeEventListener("scroll", onScroll, true);
      clearTimeout(scrollTimer);
      window.removeEventListener("pagehide", persist);
      clearTimeout(timer);
      element?.replaceChildren();
      // epub.js continues loading navigation and location data asynchronously.
      // Destroy only after these jobs finish; early destruction breaks its promises.
      void opening
        .then(async () => {
          if (book?.isOpen) await book.ready;
          await generating;
          book?.destroy();
        })
        .catch(() => {});
    };
  }, [data, onTitle, fontSize, theme, typography, onProgress, background]);

  return (
    <section
      className="epub-reader"
      aria-label="书籍正文"
      style={{
        backgroundColor: BACKGROUNDS[background].background,
      }}
    >
      {contentsTarget &&
        createPortal(
          <ChapterNavigation
            items={toc}
            current={current}
            busy={busy}
            onSelect={(href) => {
              void navigate.current(href);
            }}
          />,
          contentsTarget,
        )}
      {status && (
        <p className="reader-message" role={error ? "alert" : "status"}>
          {status}
        </p>
      )}
      {notice && (
        <p className="reader-message" role="status">
          {notice}
        </p>
      )}
      <div className="epub-host" ref={host} hidden={error} />
      <div className="page-controls" role="group" aria-label="翻页">
        <button
          className="quiet-button"
          disabled={busy || !!status || error || edges.atStart}
          onClick={() => {
            void turnPage.current("prev");
          }}
        >
          上一页
        </button>
        <span aria-live="polite">{pageInfo}</span>
        <button
          className="quiet-button"
          disabled={busy || !!status || error || edges.atEnd}
          onClick={() => {
            void turnPage.current("next");
          }}
        >
          下一页
        </button>
      </div>
    </section>
  );
}
