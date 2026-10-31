"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { validateEpub } from "../lib/epub-file";
import { loadBook, saveBook } from "../lib/book-storage";

const EpubView = dynamic(() => import("./epub-view"), { ssr: false, loading: () => <p role="status">正在加载阅读器…</p> });

export default function ReaderShell() {
  const [contentsOpen, setContentsOpen] = useState(true);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [title, setTitle] = useState("尚未打开书籍");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(true);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const saved = await loadBook();
        if (saved) {
          await validateEpub(saved.data);
          if (active) { setTitle(saved.name.replace(/\.epub$/i, "")); setData(saved.data); }
        }
      } catch {
        if (active) setError("无法恢复本地书籍，请重新导入。浏览器需允许本站使用本地存储。");
      } finally { if (active) setRestoring(false); }
    }
    void restore();
    return () => { active = false; };
  }, []);

  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".epub")) { setError("请选择 .epub 格式的电子书。"); return; }
    setLoading(true);
    try {
      const bytes = await file.arrayBuffer();
      await validateEpub(bytes);
      try { await saveBook({ name: file.name, data: bytes }); }
      catch {
        setError("无法保存书籍，本次导入未完成，原书仍保留。请检查浏览器存储权限或可用空间后重试。");
        return;
      }
      setTitle(file.name.replace(/\.epub$/i, ""));
      setData(bytes);
    } catch { setError("文件损坏或不是有效的 EPUB，请重新选择文件。"); }
    finally { setLoading(false); }
  }

  return (
    <div className="reader-shell">
      <header className="toolbar">
        <button className="quiet-button" aria-expanded={contentsOpen} aria-controls="contents" onClick={() => setContentsOpen(!contentsOpen)}>目录</button>
        <div className="book-heading"><span className="app-name">本地阅读</span><h1>{title}</h1></div>
        <div className="toolbar-actions">
          <button className="quiet-button" disabled>阅读设置</button>
          <input ref={input} type="file" accept=".epub,application/epub+zip" aria-label="选择 EPUB 文件" hidden disabled={loading || restoring} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
          <button className="primary-button" disabled={loading || restoring} onClick={() => input.current?.click()}>{restoring ? "正在恢复…" : loading ? "正在导入…" : "导入 EPUB"}</button>
        </div>
      </header>
      <div className="reader-body">
        <aside id="contents" className="contents" hidden={!contentsOpen} aria-label="书籍目录">
          <h2>目录</h2><p>{data ? "章节导航将在后续接入，可在正文区域滚动阅读。" : "打开书籍后，章节将在这里显示。"}</p>
        </aside>
        <main className="reading-area">
          {error && <p className="import-error" role="alert">{error}</p>}
          {restoring && <p role="status">正在恢复本地书籍…</p>}
          {loading && <p role="status">正在检查并保存 EPUB 文件…</p>}
          {data ? <EpubView data={data} onTitle={setTitle} /> :
          <section className="empty-state" aria-labelledby="welcome-title">
            <svg className="book-icon" viewBox="0 0 80 64" fill="none" aria-hidden="true"><path d="M40 54C28 46 16 46 6 48V8c12-2 24 0 34 8 10-8 22-10 34-8v40c-10-2-22-2-34 6Zm0 0V16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            <h2 id="welcome-title">留一段时间，读一本书。</h2>
            <p>从顶部导入一本 EPUB，开始阅读。</p>
            <p className="development-note">书籍保存在当前浏览器，刷新后自动打开。清除站点数据会删除书籍。</p>
          </section>}
        </main>
      </div>
    </div>
  );
}
