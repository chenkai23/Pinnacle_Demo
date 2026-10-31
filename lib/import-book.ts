import { validateEpub } from "./epub-file";
import { bookId } from "./reading-position";
import type { StoredBook } from "./book-storage";
export async function importBook(file: File): Promise<StoredBook> {
  if (!file.name.toLowerCase().endsWith(".epub"))
    throw new Error("Invalid file type");
  const data = await file.arrayBuffer();
  await validateEpub(data);
  const { default: ePub } = await import("epubjs");
  const book = ePub();
  try {
    await book.open(data, "binary");
    await book.ready;
    const metadata = await book.loaded.metadata;
    let cover: string | undefined;
    try {
      const url = await book.coverUrl();
      if (url) {
        const blob = await (await fetch(url)).blob();
        if (/^image\/(jpeg|png|webp|gif)$/.test(blob.type))
          cover = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
      }
    } catch {
      /* A missing cover does not prevent reading. */
    }
    return {
      id: await bookId(data),
      name: file.name,
      title: metadata.title || file.name.replace(/\.epub$/i, ""),
      data,
      cover,
      coverChecked: true,
    };
  } finally {
    book.destroy();
  }
}
