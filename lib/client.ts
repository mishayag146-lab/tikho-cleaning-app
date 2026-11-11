export async function api<T = any>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch("/api/" + path, options);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Не удалось выполнить запрос");
  return data;
}
export function jsonOptions(method: string, body: unknown) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
export async function photoStore(files?: File[]) {
  return new Promise<File[]>((resolve, reject) => {
    const req = indexedDB.open("tikho-photos", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("draft");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("draft", files ? "readwrite" : "readonly");
      const store = tx.objectStore("draft");
      const task = files ? store.put(files, "photos") : store.get("photos");
      let result: File[] = [];
      task.onsuccess = () => {
        result = files || task.result || [];
      };
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
