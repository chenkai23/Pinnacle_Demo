import type { NavItem } from "epubjs";

export default function ChapterNavigation({
  items,
  current,
  busy,
  onSelect,
}: {
  items: NavItem[];
  current: string;
  busy: boolean;
  onSelect: (href: string) => void;
}) {
  if (!items.length)
    return (
      <p>
        {busy
          ? "正在读取目录…"
          : "这本书没有提供章节目录，可使用底部按钮翻页。"}
      </p>
    );
  const list = (entries: NavItem[]) => (
    <ul>
      {entries.map((item, index) => (
        <li key={`${item.href}-${index}`}>
          <button
            type="button"
            disabled={busy}
            aria-current={current === item.href ? "location" : undefined}
            onClick={() => onSelect(item.href)}
          >
            {item.label.trim() || "未命名章节"}
          </button>
          {!!item.subitems?.length && list(item.subitems)}
        </li>
      ))}
    </ul>
  );
  return (
    <nav aria-label="章节导航" className="chapter-navigation">
      {list(items)}
    </nav>
  );
}
