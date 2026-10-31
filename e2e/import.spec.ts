import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { existsSync } from "node:fs";
import path from "node:path";

async function sample(title: string, long = false) {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file("META-INF/container.xml", '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file("book.opf", `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">sample</dc:identifier><dc:title>${title}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="chapter"/></spine></package>`);
  zip.file("nav.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Chapter</a></li></ol></nav></body></html>');
  zip.file("chapter.xhtml", `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1><p>A quiet afternoon in the garden.</p><script>parent.document.body.dataset.bookScript="executed"</script></body></html>`);
  if (long) zip.file("chapter.xhtml", `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1>${Array.from({ length: 120 }, (_, i) => `<p>Paragraph ${i}. Alice walked through the garden, wondering where the rabbit had gone. The afternoon was quiet and the path stretched ahead.</p>`).join("")}</body></html>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

test("imports, renders safely, keeps book on invalid input, and replaces book", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  const input = page.getByLabel("选择 EPUB 文件");
  await input.setInputFiles({ name: "sample.epub", mimeType: "application/epub+zip", buffer: await sample("Garden story") });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Garden story");
  const frame = page.frameLocator("iframe").first();
  await expect(frame.getByText("A quiet afternoon in the garden.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Garden story");
  await expect(page.frameLocator("iframe").first().getByText("A quiet afternoon in the garden.")).toBeVisible();
  await expect(page.locator("iframe").first()).not.toHaveAttribute("sandbox", /allow-scripts/);
  expect(await page.locator("body").getAttribute("data-book-script")).toBeNull();
  await input.setInputFiles({ name: "broken.epub", mimeType: "application/epub+zip", buffer: Buffer.from("broken") });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("文件损坏");
  await expect(frame.getByText("A quiet afternoon in the garden.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Garden story");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  await input.setInputFiles({ name: "replacement.epub", mimeType: "application/epub+zip", buffer: await sample("Another story") });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Another story");
  await expect(page.frameLocator("iframe").first().getByRole("heading")).toHaveText("Another story");
  await page.reload();
  await expect(page.frameLocator("iframe").first().getByRole("heading")).toHaveText("Another story");

  // A failed write must not replace the durable book or current reader.
  await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException("Full", "QuotaExceededError"); }; });
  await input.setInputFiles({ name: "unsaved.epub", mimeType: "application/epub+zip", buffer: await sample("Unsaved story") });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("无法保存书籍");
  await expect(page.frameLocator("iframe").first().getByRole("heading")).toHaveText("Another story");
  await page.reload();
  await expect(page.frameLocator("iframe").first().getByRole("heading")).toHaveText("Another story");
});

test("recovers from corrupt stored data and reports unavailable storage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("local-epub-reader", 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("books", "readwrite");
      tx.objectStore("books").put({ name: "corrupt.epub", data: new ArrayBuffer(4) }, "current");
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  }));
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("无法恢复本地书籍");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "recovered.epub", mimeType: "application/epub+zip", buffer: await sample("Recovered story") });
  await page.reload();
  await expect(page.frameLocator("iframe").first().getByRole("heading")).toHaveText("Recovered story");

  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("无法恢复本地书籍");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
});

test("renders the locally supplied Alice EPUB", async ({ page }) => {
  const file = path.resolve("Alice's Adventures in Wonderland by Lewis Carroll.epub");
  test.skip(!existsSync(file), "Optional local book is not tracked in Git");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles(file);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Alice/i);
  await expect(page.locator("iframe").first()).toBeVisible();
  await expect.poll(async () => (await Promise.all(page.frames().slice(1).map(f => f.locator("body").textContent().catch(() => "")))).join(" ")).toMatch(/Alice|Wonderland/i);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  const aliceChapter = page.getByRole("navigation", { name: "章节导航" }).getByRole("button", { name: "CHAPTER II. The Pool of Tears", exact: true });
  await expect(aliceChapter).toBeEnabled();
  await aliceChapter.click();
  await expect(aliceChapter).toHaveAttribute("aria-current", "location");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Alice/i);
  await expect(page.locator("iframe").first()).toBeVisible();
  await expect(aliceChapter).toHaveAttribute("aria-current", "location");
});

test("restores CFI after scrolling and isolates positions by file content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  const buffer = await sample("Long story", true);
  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "long.epub", mimeType: "application/epub+zip", buffer });
  await expect(page.frameLocator("iframe").first().getByText(/^Paragraph 0\./)).toBeVisible();
  const position = () => page.evaluate(() => Object.entries(localStorage).find(([key]) => key.startsWith("epub-position:")) || []);
  await expect.poll(async () => (await position())[1]).toMatch(/^epubcfi/);
  const initial = (await position())[1];
  await page.locator(".epub-container").evaluate(element => { element.scrollTop = 2500; });
  await expect.poll(async () => (await position())[1]).not.toBe(initial);
  const [key, cfi] = await position();
  await page.reload();
  await expect(page.locator("iframe").first()).toBeVisible();
  await expect.poll(() => page.locator(".epub-container").evaluate(el => el.scrollTop)).toBeGreaterThan(2000);
  // epub.js rounds restored text ranges to a line; assert the same paragraph.
  await expect.poll(async () => (await page.evaluate(key => localStorage.getItem(key), key))?.split(":")[0]).toBe(cfi.split(":")[0]);
  const restoredCfi = await page.evaluate(key => localStorage.getItem(key), key);

  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "long.epub", mimeType: "application/epub+zip", buffer: await sample("Different book", true) });
  await expect(page.frameLocator("iframe").first().getByRole("heading")).toHaveText("Different book");
  await expect.poll(() => page.locator(".epub-container").evaluate(el => el.scrollTop)).toBe(0);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(restoredCfi);
  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "renamed.epub", mimeType: "application/epub+zip", buffer });
  await expect.poll(() => page.locator(".epub-container").evaluate(el => el.scrollTop)).toBeGreaterThan(2000);

  await page.addInitScript(key => {
    if (sessionStorage.getItem("inject-bad-position")) return;
    localStorage.setItem(key, "invalid-cfi");
    sessionStorage.setItem("inject-bad-position", "done");
  }, key);
  await page.reload();
  await expect(page.getByText("无法恢复阅读位置，已从开头打开。你仍可继续阅读。")).toBeVisible();
  await expect(page.locator(".epub-container")).toBeVisible();
  await expect.poll(() => page.locator(".epub-container").evaluate(el => el.scrollTop)).toBe(0);
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); }; });
  await page.reload();
  await expect(page.getByText("阅读位置无法保存，请检查浏览器存储权限或空间。你仍可继续阅读。")).toBeVisible();
  await expect(page.frameLocator("iframe").first().getByText(/^Paragraph 0\./)).toBeVisible();
});

test("navigates nested chapters, restores selection and clears old book contents", async ({ page }) => {
  const zip = await JSZip.loadAsync(await sample("Chapter book"));
  const opf = await zip.file("book.opf")!.async("string");
  zip.file("book.opf", opf.replace("</manifest>", '<item id="second" href="second.xhtml" media-type="application/xhtml+xml"/></manifest>').replace("</spine>", '<itemref idref="second"/></spine>'));
  zip.file("nav.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">First chapter</a></li><li><a href="second.xhtml">Second chapter</a><ol><li><a href="second.xhtml#nested">Nested section</a></li></ol></li><li><a href="missing.xhtml">Broken chapter</a></li></ol></nav></body></html>');
  zip.file("second.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Second</title></head><body><h1>Second chapter body</h1>' + '<p>A long walk through the garden.</p>'.repeat(30) + '<h2 id="nested">Nested section body</h2>' + '<p>The rabbit was waiting.</p>'.repeat(50) + '</body></html>');
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "chapters.epub", mimeType: "application/epub+zip", buffer: await zip.generateAsync({ type: "nodebuffer" }) });
  const nav = page.getByRole("navigation", { name: "章节导航" });
  await expect(nav.getByRole("button", { name: "First chapter" })).toHaveAttribute("aria-current", "location");
  await expect(page.getByRole("button", { name: "上一页" })).toBeDisabled();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(nav.getByRole("button", { name: "Second chapter", exact: true })).toHaveAttribute("aria-current", "location");
  await page.getByRole("button", { name: "上一页" }).click();
  await expect(nav.getByRole("button", { name: "First chapter" })).toHaveAttribute("aria-current", "location");
  await nav.getByRole("button", { name: "Nested section", exact: true }).click();
  await expect(page.frameLocator("iframe").last().getByRole("heading", { name: "Nested section body" })).toBeInViewport();
  await expect(nav.getByRole("button", { name: "Nested section", exact: true })).toHaveAttribute("aria-current", "location");
  await page.reload();
  await expect(nav.getByRole("button", { name: "Nested section", exact: true })).toHaveAttribute("aria-current", "location");
  await page.getByRole("button", { name: "目录", exact: true }).click();
  await expect(nav).not.toBeVisible();
  await page.getByRole("button", { name: "目录", exact: true }).click();
  await nav.getByRole("button", { name: "Broken chapter" }).click();
  await expect(page.getByText("无法跳转到该章节，请选择其他章节或继续滚动阅读。")).toBeVisible();
  await nav.getByRole("button", { name: "First chapter" }).click();
  await expect(nav.getByRole("button", { name: "First chapter" })).toHaveAttribute("aria-current", "location");
  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "new.epub", mimeType: "application/epub+zip", buffer: await sample("New book") });
  await expect(nav.getByRole("button", { name: "Chapter", exact: true })).toBeEnabled();
  await expect(nav.getByRole("button", { name: "Second chapter" })).toHaveCount(0);
});

test("turns one screen, restores progress, and stops at book boundaries", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导入 EPUB" })).toBeEnabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "pages.epub", mimeType: "application/epub+zip", buffer: await sample("Page test", true) });
  const previous = page.getByRole("button", { name: "上一页" });
  const next = page.getByRole("button", { name: "下一页" });
  await expect(next).toBeEnabled();
  await expect(previous).toBeDisabled();
  const scroller = page.locator(".epub-container");
  const height = await scroller.evaluate(el => el.clientHeight);
  await next.click();
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(height - 5);
  await expect(previous).toBeEnabled();
  await expect.poll(() => page.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith("epub-position:"))?.[1])).not.toContain("/4/2/1:0)");
  await page.reload();
  await expect(previous).toBeEnabled();
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(height - 80);
  await previous.click();
  // CFI restoration rounds to lines; return to exact top with another press if needed.
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeLessThan(80);
  if (await scroller.evaluate(el => el.scrollTop > 1)) {
    await expect(previous).toBeEnabled();
    await previous.click();
  }
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBe(0);
  await expect(previous).toBeDisabled();
  await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.getByText("已到结尾", { exact: true })).toBeVisible();
  await expect(next).toBeDisabled();
  await expect(previous).toBeEnabled();
  await previous.click();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByText("已到结尾", { exact: true })).toBeVisible();
  await expect(next).toBeDisabled();
  await page.getByLabel("选择 EPUB 文件").setInputFiles({ name: "short.epub", mimeType: "application/epub+zip", buffer: await sample("Short book") });
  await expect(page.getByText("全文已显示")).toBeVisible();
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
});
