export interface StoredBook {
  coverChecked?: boolean;
  id?: string;
  title?: string;
  cover?: string;
  name: string;
  data: ArrayBuffer;
}

// The legacy current key is migrated to content-addressed shelf records.
const DATABASE = "local-epub-reader";
const STORE = "books";
const KEY = "current";

function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Local book storage is blocked"));
    };
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
        if (value === undefined) {
          resolve(null);
          return;
        }
        if (
          typeof value?.name !== "string" ||
          !(value?.data instanceof ArrayBuffer)
        ) {
          reject(new Error("Invalid stored book"));
          return;
        }
        resolve(value);
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function saveBook(book: StoredBook): Promise<void> {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore(STORE).put(book, book.id || KEY);
    });
  } finally {
    db.close();
  }
}

export async function listBooks(): Promise<StoredBook[]> {
  const db = await connect();
  try {
    const values = await new Promise<StoredBook[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
    for (const value of values) {
      if (!value.id && value.data instanceof ArrayBuffer) {
        const { bookId } = await import("./reading-position");
        value.id = await bookId(value.data);
        value.title = value.name.replace(/\.epub$/i, "");
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(value, value.id!);
          tx.objectStore(STORE).delete(KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    }
    return [
      ...new Map(
        values
          .filter((v) => v.id && v.data instanceof ArrayBuffer)
          .map((v) => [v.id, v]),
      ).values(),
    ];
  } finally {
    db.close();
  }
}
export async function deleteBooks(ids: string[]): Promise<void> {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      ids.forEach((id) => tx.objectStore(STORE).delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
