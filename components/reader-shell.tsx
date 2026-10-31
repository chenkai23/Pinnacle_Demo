"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { validateEpub } from "../lib/epub-file";

const EpubView = dynamic(() => import("./epub-view"), { ssr: false, loading: () => <p role="status">正在加载阅读器…</p> });

export default function ReaderShell() {
  const [contentsOpen, setContentsOpen] = useState(true);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [title, setTitle] = useState("尚未打开书籍");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".epub")) { setError("请选择 .epub 格式的电子书。"); return; }
    setLoading(true);
    try {
      const bytes = await file.arrayBuffer();
      await validateEpub(bytes);
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
          <input ref={input} type="file" accept=".epub,application/epub+zip" aria-label="选择 EPUB 文件" hidden disabled={loading} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
          <button className="primary-button" disabled={loading} onClick={() => input.current?.click()}>{loading ? "正在导入…" : "导入 EPUB"}</button>
        </div>
      </header>
      <div className="reader-body">
        <aside id="contents" className="contents" hidden={!contentsOpen} aria-label="书籍目录">
          <h2>目录</h2><p>{data ? "章节导航将在后续接入，可在正文区域滚动阅读。" : "打开书籍后，章节将在这里显示。"}</p>
        </aside>
        <main className="reading-area">
          {error && <p className="import-error" role="alert">{error}</p>}
          {loading && <p role="status">正在检查 EPUB 文件…</p>}
          {data ? <EpubView data={data} onTitle={setTitle} /> :
          <section className="empty-state" aria-labelledby="welcome-title">
            <svg className="book-icon" viewBox="0 0 80 64" fill="none" aria-hidden="true"><path d="M40 54C28 46 16 46 6 48V8c12-2 24 0 34 8 10-8 22-10 34-8v40c-10-2-22-2-34 6Zm0 0V16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            <h2 id="welcome-title">留一段时间，读一本书。</h2>
            <p>从顶部导入一本 EPUB，开始阅读。</p>
            <p className="development-note">本轮支持滚动阅读；刷新后需要重新导入。</p>
          </section>}
        </main>
      </div>
    </div>
  );
}
