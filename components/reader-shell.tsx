"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  listBooks,
  saveBook,
  deleteBooks,
  type StoredBook,
} from "../lib/book-storage";
import { importBook } from "../lib/import-book";
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  loadFontSize,
  saveFontSize,
  loadTheme,
  saveTheme,
  DEFAULT_TYPOGRAPHY,
  loadTypography,
  type Typography,
  type Theme,
  ACCENTS,
  BACKGROUNDS,
  loadAccent,
  loadBackground,
  type Background,
} from "../lib/reader-settings";
const EpubView = dynamic(() => import("./epub-view"), { ssr: false });
export default function ReaderShell() {
  const [books, setBooks] = useState<StoredBook[]>([]);
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>("contents");
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [background, setBackground] = useState<Background>("night");
  const [theme, setTheme] = useState<Theme>("dark");
  const [typography, setTypography] = useState(DEFAULT_TYPOGRAPHY);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    async function restore() {
      try {
        try {
          setAccent(loadAccent());
          setBackground(loadBackground());
          setFontSize(loadFontSize());
          setTypography(loadTypography());
          if (localStorage.getItem("epub-theme")) setTheme(loadTheme());
        } catch {
          setMessage("无法读取排版设置，已使用默认值。");
        }
        const items = await listBooks();
        // Legacy migration preserved only file bytes/name, not extracted covers.
        for (let i = 0; i < items.length; i++) {
          if (!live) return;
          if (!items[i].coverChecked) {
            try {
              const repaired = await importBook(
                new File([items[i].data], items[i].name),
              );
              await saveBook(repaired);
              items[i] = repaired;
            } catch {
              /* Keep the original record if cover repair fails. */
            }
          }
        }
        if (!live) return;
        setBooks(items);
        try {
          const session = JSON.parse(
            localStorage.getItem("epub-session") || "{}",
          );
          const ids = Array.isArray(session.tabs)
            ? session.tabs.filter((id: string) =>
                items.some((b) => b.id === id),
              )
            : [];
          if (
            items.some((b) => b.id === session.active) &&
            !ids.includes(session.active)
          )
            ids.push(session.active);
          setTabs(ids);
          setActive(
            items.some((b) => b.id === session.active) ? session.active : null,
          );
        } catch {
          setMessage("标签页状态已重置，书籍仍保留在书架。");
        }
        const values: Record<string, number> = {};
        items.forEach((b) => {
          const n = Number(localStorage.getItem("epub-progress:" + b.id));
          values[b.id!] = Number.isFinite(n)
            ? Math.max(0, Math.min(100, n))
            : 0;
        });
        setProgress(values);
      } catch {
        if (live) setMessage("无法恢复部分本地数据，请检查浏览器存储权限。");
      } finally {
        if (live) setReady(true);
      }
    }
    void restore();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
  }, [accent]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("epub-session", JSON.stringify({ tabs, active }));
    } catch {
      setMessage("无法保存标签页状态。");
    }
  }, [tabs, active, ready]);
  const reportProgress = useCallback(
    (id: string, value: number) =>
      setProgress((old) => (old[id] === value ? old : { ...old, [id]: value })),
    [],
  );
  const onTitle = useCallback(() => {}, []);
  const book = books.find((b) => b.id === active);
  const open = (id: string) => {
    setTabs((old) => (old.includes(id) ? old : [...old, id]));
    setActive(id);
    setSelecting(false);
  };
  const close = (id: string) => {
    const next = tabs.filter((t) => t !== id);
    setTabs(next);
    if (active === id) setActive(next.at(-1) || null);
  };
  const setting = (fn: () => void) => {
    try {
      fn();
      setMessage("");
    } catch {
      setMessage("设置已应用，但无法保存。请检查浏览器存储权限或空间。");
    }
  };
  const layout = (value: Typography) => {
    setTypography(value);
    setting(() =>
      localStorage.setItem("epub-typography", JSON.stringify(value)),
    );
  };
  async function importing(files: File[]) {
    setLoading(true);
    setMessage("");
    for (const file of files) {
      try {
        const value = await importBook(file);
        await saveBook(value);
        setBooks((old) => [...old.filter((b) => b.id !== value.id), value]);
        open(value.id!);
      } catch {
        setMessage(
          `无法导入 ${file.name}：请确认文件有效、未加密且浏览器存储可用。`,
        );
      }
    }
    setLoading(false);
  }
  async function remove() {
    try {
      await deleteBooks(selected);
      selected.forEach((id) => {
        try {
          localStorage.removeItem("epub-position:" + id);
          localStorage.removeItem("epub-progress:" + id);
        } catch {}
      });
      setBooks((old) => old.filter((b) => !selected.includes(b.id!)));
      setTabs((old) => old.filter((id) => !selected.includes(id)));
      if (active && selected.includes(active)) setActive(null);
      setSelected([]);
      setSelecting(false);
    } catch {
      setMessage("删除失败，书籍仍保留，请重试。");
    }
  }
  return (
    <div className="reader-shell">
      <input
        hidden
        ref={input}
        type="file"
        multiple
        accept=".epub"
        aria-label="选择 EPUB 文件"
        disabled={!ready || loading}
        onChange={(e) => {
          void importing(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <aside className="function-rail" aria-label="功能栏">
        <button title="书架" aria-label="书架" onClick={() => setActive(null)}>
          ▦
        </button>
        <button
          title="目录"
          aria-label="目录"
          aria-pressed={!!book && panel === "contents"}
          onClick={() => setPanel(panel === "contents" ? null : "contents")}
        >
          ☷
        </button>
        <button
          title="排版"
          aria-label="排版"
          aria-pressed={panel === "type"}
          onClick={() => setPanel(panel === "type" ? null : "type")}
        >
          Aa
        </button>
        <button
          title="背景"
          aria-label="背景"
          aria-pressed={panel === "background"}
          onClick={() => setPanel(panel === "background" ? null : "background")}
        >
          ◐
        </button>
        <button
          className="rail-import"
          title="导入 EPUB"
          aria-label="导入 EPUB"
          disabled={!ready || loading}
          onClick={() => input.current?.click()}
        >
          ＋
        </button>
      </aside>
      <aside
        className="side-panel"
        hidden={
          !(
            (book && panel === "contents") ||
            panel === "type" ||
            panel === "background"
          )
        }
      >
        <header>
          {panel === "contents" ? "目录" : panel === "type" ? "排版" : "背景"}
          <button aria-label="收起面板" onClick={() => setPanel(null)}>
            ×
          </button>
        </header>
        <div ref={setTarget} hidden={panel !== "contents"} />
        {panel === "type" && (
          <div className="setting-fields">
            <label htmlFor="view">视图</label>
            <select
              id="view"
              value={typography.spread}
              onChange={(e) =>
                layout({
                  ...typography,
                  spread: e.target.value as Typography["spread"],
                })
              }
            >
              <option value="single">单页</option>
              <option value="double">双页</option>
            </select>
            <label htmlFor="font-family">字体</label>
            <select
              id="font-family"
              value={typography.font}
              onChange={(e) =>
                layout({
                  ...typography,
                  font: e.target.value as Typography["font"],
                })
              }
            >
              <option value="serif">衬线 / 宋体</option>
              <option value="sans">无衬线 / 黑体</option>
            </select>
            <label htmlFor="font-size">正文字号</label>
            <select
              id="font-size"
              value={fontSize}
              onChange={(e) => {
                const n = Number(e.target.value);
                setFontSize(n);
                setting(() => saveFontSize(n));
              }}
            >
              {FONT_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} px
                </option>
              ))}
            </select>
            <label htmlFor="line-height">行高</label>
            <select
              id="line-height"
              value={typography.lineHeight}
              onChange={(e) =>
                layout({ ...typography, lineHeight: Number(e.target.value) })
              }
            >
              {[1.4, 1.6, 1.8, 2, 2.2].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
        {panel === "background" && (
          <div className="setting-fields">
            <fieldset>
              <legend>主题</legend>
              <label htmlFor="theme">界面模式</label>
              <select
                id="theme"
                value={theme}
                onChange={(e) => {
                  const t = e.target.value as Theme;
                  setTheme(t);
                  setting(() => saveTheme(t));
                }}
              >
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </select>
              <p className="color-label">主题色</p>
              <div className="color-swatches">
                {ACCENTS.map((color, i) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`主题色 ${["湖蓝", "靛蓝", "紫藤", "松绿", "琥珀"][i]}`}
                    aria-pressed={accent === color}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setAccent(color);
                      setting(() => localStorage.setItem("epub-accent", color));
                    }}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>阅读背景</legend>
              <div className="color-swatches">
                {Object.entries(BACKGROUNDS).map(([key, color]) => (
                  <button
                    key={key}
                    type="button"
                    title={color.label}
                    aria-label={`背景 ${color.label}`}
                    aria-pressed={background === key}
                    style={{
                      backgroundColor: color.background,
                    }}
                    onClick={() => {
                      setBackground(key as Background);
                      setting(() =>
                        localStorage.setItem("epub-background", key),
                      );
                    }}
                  ></button>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </aside>
      <main className="workspace">
        {message && (
          <div className="app-message" role="alert">
            {message}
            <button aria-label="关闭提示" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}
        {loading && (
          <div role="status" className="app-message">
            正在导入书籍…
          </div>
        )}
        {book ? (
          <>
            <header className="tab-bar">
              <div role="tablist" aria-label="打开的书籍">
                {tabs.map((id) => {
                  const item = books.find((b) => b.id === id);
                  return (
                    item && (
                      <div className="tab-item" key={id}>
                        <button
                          role="tab"
                          aria-selected={id === active}
                          onClick={() => setActive(id)}
                        >
                          {item.title || item.name}
                        </button>
                        <button
                          aria-label={`关闭标签 ${item.title || item.name}`}
                          onClick={() => close(id)}
                        >
                          ×
                        </button>
                      </div>
                    )
                  );
                })}
              </div>
              <button
                className="close-reader"
                aria-label="关闭阅读，返回书架"
                onClick={() => setActive(null)}
              >
                ×
              </button>
            </header>
            <EpubView
              key={book.id}
              data={book.data}
              onTitle={onTitle}
              contentsTarget={target}
              fontSize={fontSize}
              theme={theme}
              typography={typography}
              onProgress={reportProgress}
              background={background}
            />
          </>
        ) : (
          <section className="bookshelf" aria-label="书架">
            <header className="shelf-toolbar">
              <div>
                <h1>书架</h1>
                <span>{books.length} 本书</span>
              </div>
              <div className="shelf-actions">
                <button
                  disabled={!books.length}
                  onClick={() => {
                    setSelecting(!selecting);
                    setSelected([]);
                  }}
                >
                  {selecting ? "取消选择" : "选择"}
                </button>
                {selecting && (
                  <>
                    <button
                      onClick={() =>
                        setSelected(
                          selected.length === books.length
                            ? []
                            : books.map((b) => b.id!),
                        )
                      }
                    >
                      全选
                    </button>
                    <button
                      disabled={!selected.length}
                      onClick={() => {
                        void remove();
                      }}
                    >
                      删除所选（{selected.length}）
                    </button>
                  </>
                )}
                <button
                  className="primary-button"
                  disabled={!ready || loading}
                  onClick={() => input.current?.click()}
                >
                  导入
                </button>
              </div>
            </header>
            {!ready ? (
              <p role="status">正在恢复书架…</p>
            ) : !books.length ? (
              <div className="shelf-empty">
                <h2>从一本书开始。</h2>
                <p>导入 EPUB，书籍和阅读进度会保存在当前浏览器。</p>
                <button onClick={() => input.current?.click()}>
                  导入第一本书
                </button>
              </div>
            ) : (
              <div className="book-grid">
                {books.map((item) => (
                  <article className="book-card" key={item.id}>
                    <button
                      className="book-cover"
                      aria-label={`${selecting ? "选择" : "阅读"} ${item.title || item.name}`}
                      onClick={() =>
                        selecting
                          ? setSelected((old) =>
                              old.includes(item.id!)
                                ? old.filter((id) => id !== item.id)
                                : [...old, item.id!],
                            )
                          : open(item.id!)
                      }
                    >
                      {item.cover ? (
                        <img src={item.cover} alt="" />
                      ) : (
                        <div className="cover-placeholder">
                          <span>EPUB</span>
                          <strong>{item.title || item.name}</strong>
                        </div>
                      )}
                      <span className="book-progress">
                        {progress[item.id!] || 0}%
                      </span>
                    </button>
                    <progress
                      max="100"
                      value={progress[item.id!] || 0}
                      aria-label={`${item.title || item.name} 阅读进度`}
                    />
                    <div className="book-caption">
                      {selecting && (
                        <input
                          type="checkbox"
                          aria-label={`选择 ${item.title || item.name}`}
                          checked={selected.includes(item.id!)}
                          onChange={() =>
                            setSelected((old) =>
                              old.includes(item.id!)
                                ? old.filter((id) => id !== item.id)
                                : [...old, item.id!],
                            )
                          }
                        />
                      )}
                      <span title={item.title || item.name}>
                        {item.title || item.name}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
