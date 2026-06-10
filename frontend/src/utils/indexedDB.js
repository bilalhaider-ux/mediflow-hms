const DB_NAME = "MediFlowDB";
const STORE_NAME = "offline_queue";
const DB_VERSION = 1;

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const getQueueDB = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveQueueDB = async (queue) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    // Clear all existing to overwrite with new state
    const clearReq = store.clear();
    
    clearReq.onsuccess = () => {
      let putCount = 0;
      if (queue.length === 0) {
        resolve();
        return;
      }
      
      for (const item of queue) {
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          putCount++;
          if (putCount === queue.length) {
            resolve();
          }
        };
        putReq.onerror = (e) => reject(e.target.error);
      }
    };
    
    clearReq.onerror = (e) => reject(e.target.error);
  });
};

export const addToQueueDB = async (item) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);
    
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
};

export const deleteFromQueueDB = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
};
