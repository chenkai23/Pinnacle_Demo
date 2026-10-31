export interface StoredBook {
  name: string;
  data: ArrayBuffer;
}

// A single fixed key ensures replacing a book never creates a bookshelf.
const DATABASE = "local-epub-reader";
const STORE = "books";
const KEY = "current";

function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error("Local book storage is blocked")); };
  });
}

export async function loadBook(): Promise<StoredBook | null> {
  const db = await connect();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(KEY);
      transaction.oncomplete = () => {
        const value = request.result;
        if (value === undefined) { resolve(null); return; }
        if (typeof value?.name !== "string" || !(value?.data instanceof ArrayBuffer)) {
          reject(new Error("Invalid stored book")); return;
        }
        resolve(value);
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function saveBook(book: StoredBook): Promise<void> {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore(STORE).put(book, KEY);
    });
  } finally { db.close(); }
}
