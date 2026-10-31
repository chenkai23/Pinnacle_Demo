import JSZip from "jszip";

export async function validateEpub(data: ArrayBuffer): Promise<void> {
  const zip = await JSZip.loadAsync(data);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("缺少 EPUB 容器信息");
  const xml = new DOMParser().parseFromString(container, "application/xml");
  const path = xml.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
  if (xml.querySelector("parsererror") || !path || !zip.file(path)) {
    throw new Error("缺少有效的 EPUB 书籍信息");
  }
}
