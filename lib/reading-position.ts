const PREFIX = "epub-position:";

// Hash file bytes rather than metadata: unrelated books can share an identifier.
export async function bookId(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function loadPosition(id: string): string | null {
  const cfi = localStorage.getItem(PREFIX + id);
  if (cfi && !/^epubcfi\(.+!.+\)$/.test(cfi)) throw new Error("Invalid saved CFI");
  return cfi;
}

export function savePosition(id: string, cfi: string): void {
  localStorage.setItem(PREFIX + id, cfi);
}
