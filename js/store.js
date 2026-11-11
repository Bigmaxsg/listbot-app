// On-phone storage (IndexedDB). Phase 1: submitted items are saved here; Phase 2 uploads them to Drive.
const DB = "listbot";
const VERSION = 1;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("items")) db.createObjectStore("items", { keyPath: "item_number" });
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const out = fn(t);
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("DUPLICATE"));
  });
}

// Saves item + photos atomically. Refuses an existing item number — photos are never merged.
export async function saveItem(item, blobs) {
  const db = await open();
  return tx(db, ["items", "photos"], "readwrite", (t) => {
    const items = t.objectStore("items");
    const check = items.get(item.item_number);
    check.onsuccess = () => {
      if (check.result) { t.abort(); return; }
      items.add({ ...item, photos: blobs.length });
      blobs.forEach((blob, i) => t.objectStore("photos").add({ id: `${item.item_number}/${i}`, item_number: item.item_number, index: i, blob }));
    };
  });
}

export async function listItems() {
  const db = await open();
  // The request has already succeeded once the transaction completes, so read .result directly.
  const req = await tx(db, ["items"], "readonly", (t) => t.objectStore("items").getAll());
  return req.result || [];
}

export async function photosFor(itemNumber, count) {
  const db = await open();
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const req = await tx(db, ["photos"], "readonly", (t) => t.objectStore("photos").get(`${itemNumber}/${i}`));
    if (req.result) out.push(URL.createObjectURL(req.result.blob));
  }
  return out;
}

// Removes one item and its photos from this phone.
export async function deleteItem(itemNumber, count) {
  const db = await open();
  return tx(db, ["items", "photos"], "readwrite", (t) => {
    t.objectStore("items").delete(itemNumber);
    for (let i = 0; i < count; i += 1) t.objectStore("photos").delete(`${itemNumber}/${i}`);
  });
}

export async function clearAll() {
  const db = await open();
  return tx(db, ["items", "photos"], "readwrite", (t) => { t.objectStore("items").clear(); t.objectStore("photos").clear(); });
}
