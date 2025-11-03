// Simple IndexedDB store for FileSystemDirectoryHandle
// Allows persisting the chosen config directory between sessions

const DB_NAME = 'subbito-fs';
const STORE_NAME = 'handles';
const KEY_LAST_DIR = 'lastDir';
const KEY_LAST_FILE = 'lastFile';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put(value, key);
  });
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(handle) {
  try {
    await idbPut(KEY_LAST_DIR, handle);
    return true;
  } catch (e) {
    console.error('[dirHandleStore] saveDirectoryHandle error:', e);
    return false;
  }
}

export async function getSavedDirectoryHandle() {
  try {
    const h = await idbGet(KEY_LAST_DIR);
    return h || null;
  } catch (e) {
    console.error('[dirHandleStore] getSavedDirectoryHandle error:', e);
    return null;
  }
}

export async function saveFileHandle(handle) {
  try {
    await idbPut(KEY_LAST_FILE, handle);
    return true;
  } catch (e) {
    console.error('[dirHandleStore] saveFileHandle error:', e);
    return false;
  }
}

export async function getSavedFileHandle() {
  try {
    const h = await idbGet(KEY_LAST_FILE);
    return h || null;
  } catch (e) {
    console.error('[dirHandleStore] getSavedFileHandle error:', e);
    return null;
  }
}

export async function verifyPermission(handle, mode = 'read') {
  if (!handle || !handle.queryPermission) return 'denied';
  try {
    const p = await handle.queryPermission({ mode });
    return p; // 'granted' | 'prompt' | 'denied'
  } catch (e) {
    console.warn('[dirHandleStore] queryPermission failed:', e);
    return 'denied';
  }
}

export async function requestPermission(handle, mode = 'read') {
  if (!handle || !handle.requestPermission) return 'denied';
  try {
    const p = await handle.requestPermission({ mode });
    return p;
  } catch (e) {
    console.warn('[dirHandleStore] requestPermission failed:', e);
    return 'denied';
  }
}

