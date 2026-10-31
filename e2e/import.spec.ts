import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { existsSync } from "node:fs";
import path from "node:path";

async function sample(title: string) {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file("META-INF/container.xml", '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file("book.opf", `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">sample</dc:identifier><dc:title>${title}</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="chapter"/></spine></package>`);
  zip.file("nav.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Chapter</a></li></ol></nav></body></html>');
  zip.file("chapter.xhtml", `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1><p>A quiet afternoon in the garden.</p><script>parent.document.body.dataset.bookScript="executed"</script></body></html>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

test("imports, renders safely, keeps book on invalid input, and replaces book", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("选择 EPUB 文件");
  await input.setInputFiles({ name: "sample.epub", mimeType: "application/epub+zip", buffer: await sample("Garden story") });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Garden story");
  const frame = page.frameLocator("iframe").first();
  await expect(frame.getByText("A quiet afternoon in the garden.")).toBeVisible();
  await expect(page.locator("iframe").first()).not.toHaveAttribute("sandbox", /allow-scripts/);
  expect(await page.locator("body").getAttribute("data-book-script")).toBeNull();
  await input.setInputFiles({ name: "broken.epub", mimeType: "application/epub+zip", buffer: Buffer.from("broken") });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("文件损坏");
  await expect(frame.getByText("A quiet afternoon in the garden.")).toBeVisible();
  await input.setInputFiles({ name: "replacement.epub", mimeType: "application/epub+zip", buffer: await sample("Another story") });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Another story");
  await expect(page.frameLocator("iframe").first().getByRole("heading")).toHaveText("Another story");
});

test("renders the locally supplied Alice EPUB", async ({ page }) => {
  const file = path.resolve("Alice's Adventures in Wonderland by Lewis Carroll.epub");
  test.skip(!existsSync(file), "Optional local book is not tracked in Git");
  await page.goto("/");
  await page.getByLabel("选择 EPUB 文件").setInputFiles(file);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Alice/i);
  await expect(page.locator("iframe").first()).toBeVisible();
  await expect.poll(async () => (await Promise.all(page.frames().slice(1).map(f => f.locator("body").textContent().catch(() => "")))).join(" ")).toMatch(/Alice|Wonderland/i);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});
