import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { existsSync } from "node:fs";
import path from "node:path";

async function sample(title: string, long = false) {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file(
    "book.opf",
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">sample</dc:identifier><dc:title>${title}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="chapter"/></spine></package>`,
  );
  zip.file(
    "nav.xhtml",
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Chapter</a></li></ol></nav></body></html>',
  );
  zip.file(
    "chapter.xhtml",
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1><p>A quiet afternoon in the garden.</p><script>parent.document.body.dataset.bookScript="executed"</script></body></html>`,
  );
  if (long)
    zip.file(
      "chapter.xhtml",
      `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1>${Array.from({ length: 120 }, (_, i) => `<p>Paragraph ${i}. Alice walked through the garden, wondering where the rabbit had gone. The afternoon was quiet and the path stretched ahead.</p>`).join("")}</body></html>`,
    );
  return zip.generateAsync({ type: "nodebuffer" });
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    console.log(
      await page
        .locator(".epub-reader")
        .innerText({ timeout: 1000 })
        .catch(() => ""),
    );
    await page.screenshot({ path: "test-results/failure.png" });
  }
});
async function upload(page: import("@playwright/test").Page, title: string) {
  await expect(
    page.getByRole("button", { name: "导入 EPUB", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles({
    name: title + ".epub",
    mimeType: "application/epub+zip",
    buffer: await sample(title, true),
  });
  await expect(
    page.getByRole("tab", { name: title, exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "下一页" })).toBeEnabled();
}
test("bookshelf, independent tabs, pagination, settings, refresh and bulk deletion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await upload(page, "Garden story");
  await expect(page.locator("iframe").first()).not.toHaveAttribute(
    "sandbox",
    /allow-scripts/,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Object.keys(localStorage).filter((k) =>
            k.startsWith("epub-position:"),
          ).length,
      ),
    )
    .toBe(1);
  const positionKey = await page.evaluate(() =>
    Object.keys(localStorage).find((k) => k.startsWith("epub-position:"))!,
  );
  const cfi = () =>
    page.evaluate((key) => localStorage.getItem(key), positionKey);
  await expect.poll(cfi).toMatch(/^epubcfi/);
  const first = await cfi();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect.poll(cfi).not.toBe(first);
  const saved = await cfi();
  await expect(page.locator(".page-controls")).toContainText(
    /本章 \d+ \/ \d+ 页/,
  );
  await expect(page.locator(".page-controls")).toContainText(/\d+%/);
  await page.mouse.wheel(0, 800);
  expect(
    await page.locator(".epub-container").evaluate((el) => el.scrollTop),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await upload(page, "Second story");
  await page.getByRole("tab", { name: "Garden story", exact: true }).click();
  await expect(page.getByRole("button", { name: "上一页" })).toBeEnabled();
  await expect.poll(cfi).toBe(saved);
  await page.getByRole("button", { name: "排版", exact: true }).click();
  await page.getByLabel("视图", { exact: true }).selectOption("single");
  await page.getByLabel("字体", { exact: true }).selectOption("sans");
  await page.getByLabel("正文字号").selectOption("24");
  await page.getByLabel("行高", { exact: true }).selectOption("2");
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .first()
        .locator("p")
        .first()
        .evaluate((el) => ({
          font: getComputedStyle(el).fontSize,
          line: getComputedStyle(el).lineHeight,
          family: getComputedStyle(el).fontFamily,
        })),
    )
    .toEqual({
      font: "24px",
      line: "48px",
      family: 'Arial, "Microsoft YaHei", sans-serif',
    });
  await expect
    .poll(async () => (await cfi())?.split(":")[0])
    .toBe(saved!.split(":")[0]);
  await page.getByRole("button", { name: "背景", exact: true }).click();
  await page.getByLabel("界面模式", { exact: true }).selectOption("light");
  await page.getByRole("button", { name: "背景 纯白", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .first()
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(255, 255, 255)");
  await page.getByLabel("界面模式", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "排版", exact: true }).click();
  await page.getByLabel("视图", { exact: true }).selectOption("double");
  await expect(page.getByRole("button", { name: "下一页" })).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Garden story", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "排版", exact: true }).click();
  await expect(page.getByLabel("行高", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("字体", { exact: true })).toHaveValue("sans");
  await expect(page.getByLabel("视图", { exact: true })).toHaveValue("double");
  await page.getByRole("button", { name: "目录", exact: true }).click();
  await expect(page.getByRole("button", { name: "下一页" })).toBeEnabled();
  await expect(
    page.frameLocator("iframe").first().locator("p").first(),
  ).toBeAttached();
  await page.screenshot({ path: "test-results/reader.png" });
  await page
    .getByRole("button", { name: "关闭标签 Second story", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Second story", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "关闭阅读，返回书架", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "书架", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".book-card")).toHaveCount(2);
  const coverBox = (await page.locator(".book-cover").first().boundingBox())!;
  const barBox = (await page
    .locator(".book-card > progress")
    .first()
    .boundingBox())!;
  const captionBox = (await page
    .locator(".book-caption")
    .first()
    .boundingBox())!;
  expect(barBox.y).toBeGreaterThanOrEqual(coverBox.y + coverBox.height);
  expect(barBox.y + barBox.height).toBeLessThan(captionBox.y);
  await page.screenshot({ path: "test-results/shelf.png" });
  await page.reload();
  await expect(page.locator(".book-card")).toHaveCount(2);
  await page.getByRole("button", { name: "选择", exact: true }).click();
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page
    .getByRole("button", { name: "删除所选（2）", exact: true })
    .click();
  await expect(page.locator(".book-card")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("从一本书开始。")).toBeVisible();
});

test("duplicate and corrupt imports preserve library", async ({ page }) => {
  await page.goto("/");
  await upload(page, "Original");
  // Reuse identical archive bytes to verify content deduplication.
  const buffer = await sample("Duplicate");
  const input = page.getByLabel("选择 EPUB 文件");
  await input.setInputFiles({
    name: "one.epub",
    mimeType: "application/epub+zip",
    buffer,
  });
  await expect(
    page.getByRole("tab", { name: "Duplicate", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导入 EPUB", exact: true }),
  ).toBeEnabled();
  await input.setInputFiles({
    name: "renamed.epub",
    mimeType: "application/epub+zip",
    buffer,
  });
  await expect(
    page.getByRole("button", { name: "导入 EPUB", exact: true }),
  ).toBeEnabled();
  await input.setInputFiles({
    name: "broken.epub",
    mimeType: "application/epub+zip",
    buffer: Buffer.from("broken"),
  });
  await expect(page.locator(".workspace").getByRole("alert")).toContainText(
    "无法导入",
  );
  await page.getByRole("button", { name: "书架", exact: true }).click();
  await expect(page.locator(".book-card")).toHaveCount(2);
});

test("real Alice navigation and pagination", async ({ page }) => {
  const file = path.resolve(
    "Alice's Adventures in Wonderland by Lewis Carroll.epub",
  );
  test.skip(!existsSync(file), "Optional local book");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导入 EPUB", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles(file);
  const chapter = page.getByRole("button", {
    name: "CHAPTER II. The Pool of Tears",
    exact: true,
  });
  await expect(chapter).toBeEnabled();
  await chapter.click();
  await expect(chapter).toHaveAttribute("aria-current", "location");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "上一页", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".page-controls")).toContainText(/\d+%/);
  await page.reload();
  await expect(chapter).toHaveAttribute("aria-current", "location");
  await page.getByRole("button", { name: "关闭阅读，返回书架" }).click();
  await expect(page.locator(".book-card img")).toBeVisible();
});

test("migrates the previous single-book record and handles failed deletion", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导入 EPUB", exact: true }),
  ).toBeEnabled();
  const bytes = Array.from(await sample("Legacy book", true));
  await page.evaluate(
    (bytes) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("local-epub-reader", 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("books", "readwrite");
          tx.objectStore("books").put(
            { name: "legacy.epub", data: new Uint8Array(bytes).buffer },
            "current",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      }),
    bytes,
  );
  await page.reload();
  await expect(page.locator(".book-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "阅读 Legacy book", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "下一页" })).toBeEnabled();
  await page.getByRole("button", { name: "书架", exact: true }).click();
  await page.reload();
  await expect(page.locator(".book-card")).toHaveCount(1);
  await page.evaluate(() => {
    IDBObjectStore.prototype.delete = () => {
      throw new DOMException("Denied", "SecurityError");
    };
  });
  await page.getByRole("button", { name: "选择", exact: true }).click();
  await page.getByRole("button", { name: "全选", exact: true }).click();
  await page
    .getByRole("button", { name: "删除所选（1）", exact: true })
    .click();
  await expect(page.locator(".workspace").getByRole("alert")).toContainText(
    "删除失败",
  );
  await expect(page.locator(".book-card")).toHaveCount(1);
});

test("narrow viewport remains paginated without document overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await upload(page, "Mobile book");
  await page.getByRole("button", { name: "排版", exact: true }).click();
  await page.getByLabel("视图", { exact: true }).selectOption("single");
  await page.getByRole("button", { name: "收起面板" }).click();
  await expect(page.getByRole("button", { name: "下一页" })).toBeEnabled();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.getByRole("button", { name: "上一页" })).toBeEnabled();
  expect(
    await page.evaluate(() => ({
      x: document.documentElement.scrollWidth <= innerWidth,
      y: document.documentElement.scrollHeight <= innerHeight,
    })),
  ).toEqual({ x: true, y: true });
});

test("wheel flips inside EPUB iframe and background remains independent", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, "Wheel book");
  const key = await page.evaluate(() =>
    Object.keys(localStorage).find((k) => k.startsWith("epub-position:"))!,
  );
  const position = () => page.evaluate((key) => localStorage.getItem(key), key);
  await expect.poll(position).toMatch(/^epubcfi/);
  const first = await position();
  const bounds = (await page.locator(".epub-host").boundingBox())!;
  await page.mouse.move(bounds.x + 100, bounds.y + 100);
  await page.mouse.wheel(0, 120);
  await expect.poll(position).not.toBe(first);
  await page.waitForTimeout(400); // Deliberately exceed wheel gesture cooldown.
  await page.mouse.wheel(0, -120);
  await expect.poll(position).toBe(first);
  await page.getByRole("button", { name: "背景", exact: true }).click();
  await page.getByRole("button", { name: "背景 米黄", exact: true }).click();
  await page.getByRole("button", { name: "主题色 紫藤", exact: true }).click();
  await page.getByLabel("界面模式", { exact: true }).selectOption("dark");
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .first()
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(243, 232, 207)");
  await page.reload();
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .first()
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(243, 232, 207)");
  expect(await page.evaluate(() => localStorage.getItem("epub-accent"))).toBe(
    "#8867c1",
  );
  await page.getByRole("button", { name: "背景", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "背景 米黄", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("repairs covers in previously migrated records without reimport", async ({
  page,
}) => {
  const file = path.resolve(
    "Alice's Adventures in Wonderland by Lewis Carroll.epub",
  );
  test.skip(!existsSync(file), "Optional local Alice");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "导入 EPUB", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles(file);
  await expect(page.getByRole("button", { name: "下一页" })).toBeEnabled();
  await page.getByRole("button", { name: "书架", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("local-epub-reader", 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("books", "readwrite");
          const store = tx.objectStore("books");
          const get = store.openCursor();
          get.onsuccess = () => {
            const c = get.result;
            if (c) {
              const book = c.value;
              delete book.cover;
              delete book.coverChecked;
              c.update(book);
              c.continue();
            }
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      }),
  );
  await page.reload();
  await expect(page.locator(".book-card img")).toBeVisible();
  await expect(page.locator(".book-caption")).toHaveCSS("height", "44px");
  await page.screenshot({ path: "test-results/repaired-cover.png" });
});
