import { openDB } from "idb";

const DB_NAME = "mediflow-offline";
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("patientQueue")) {
        const store = db.createObjectStore("patientQueue", {
          keyPath: "id",
          autoIncrement: true
        });
        store.createIndex("synced", "synced");
        store.createIndex("createdAt", "createdAt");
      }
    }
  });
}

export async function addToQueue(storeName, record) {
  const db = await getDB();
  await db.put(storeName, record);
}

export async function getQueue(storeName) {
  const db = await getDB();
  return await db.getAll(storeName);
}

export async function markSynced(storeName, id) {
  const db = await getDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const record = await store.get(id);
  if (record) {
    record.status = "SUCCESS";
    record.synced = true;
    record.errorMsg = "";
    await store.put(record);
  }
  await tx.done;
}

export async function removeFromQueue(storeName, id) {
  const db = await getDB();
  await db.delete(storeName, id);
}

export async function clearQueue(storeName) {
  const db = await getDB();
  await db.clear(storeName);
}
