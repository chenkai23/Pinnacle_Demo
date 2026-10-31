"use client";

import { useState } from "react";

export default function ReaderShell() {
  const [contentsOpen, setContentsOpen] = useState(true);

  return (
    <div className="reader-shell">
      <header className="toolbar">
        <button className="quiet-button" aria-expanded={contentsOpen} aria-controls="contents" onClick={() => setContentsOpen(!contentsOpen)}>目录</button>
        <div className="book-heading"><span className="app-name">本地阅读</span><h1>尚未打开书籍</h1></div>
        <div className="toolbar-actions">
          <button className="quiet-button" disabled>阅读设置</button>
          <button className="primary-button" disabled>导入 EPUB</button>
        </div>
      </header>
      <div className="reader-body">
        <aside id="contents" className="contents" hidden={!contentsOpen} aria-label="书籍目录">
          <h2>目录</h2><p>打开书籍后，章节将在这里显示。</p>
        </aside>
        <main className="reading-area">
          <section className="empty-state" aria-labelledby="welcome-title">
            <svg className="book-icon" viewBox="0 0 80 64" fill="none" aria-hidden="true"><path d="M40 54C28 46 16 46 6 48V8c12-2 24 0 34 8 10-8 22-10 34-8v40c-10-2-22-2-34 6Zm0 0V16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            <h2 id="welcome-title">留一段时间，读一本书。</h2>
            <p>这里将是你的 EPUB 阅读空间。</p>
            <p className="development-note">导入与正文阅读功能将在下一步接入。</p>
          </section>
        </main>
      </div>
    </div>
  );
}
