// File System Access helpers for picking a directory and reading JSON config files
import { saveDirectoryHandle, getSavedDirectoryHandle, saveFileHandle, getSavedFileHandle, verifyPermission, requestPermission } from './dirHandleStore';

export function isFsAccessSupported() {
  return !!(window && 'showDirectoryPicker' in window);
}

function hasSavePicker() {
  return !!(window && 'showSaveFilePicker' in window);
}

export async function chooseConfigDirectory() {
  if (!isFsAccessSupported()) return null;

  let startIn = undefined;
  try {
    const saved = await getSavedDirectoryHandle();
    if (saved) {
      const perm = await verifyPermission(saved, 'read');
      if (perm === 'granted' || perm === 'prompt') {
        startIn = saved;
      }
    }
  } catch (_) {}

  try {
    const dirHandle = await window.showDirectoryPicker(
      startIn ? { startIn } : undefined
    );
    // Persist for future sessions
    await saveDirectoryHandle(dirHandle);
    return dirHandle;
  } catch (e) {
    if (e && e.name === 'AbortError') return null;
    console.error('[fsAccess] showDirectoryPicker error:', e);
    return null;
  }
}

export async function getOrRestoreLastDirectory() {
  if (!isFsAccessSupported()) return null;
  const saved = await getSavedDirectoryHandle();
  if (!saved) return null;
  const perm = await verifyPermission(saved, 'read');
  if (perm !== 'granted') {
    const req = await requestPermission(saved, 'read');
    if (req !== 'granted') return null;
  }
  return saved;
}

export async function listJsonFiles(dirHandle) {
  if (!dirHandle) return [];
  const files = [];
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && /\.json$/i.test(entry.name)) {
        files.push(entry);
      }
    }
  } catch (e) {
    console.error('[fsAccess] listJsonFiles error:', e);
  }
  return files;
}

export async function readJsonFromFileHandle(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    return { name: file.name, data };
  } catch (e) {
    console.error('[fsAccess] readJsonFromFileHandle error:', e);
    return { error: e?.message || 'Errore nella lettura del file' };
  }
}

// ---------- Write helpers (save) ----------

export function sanitizeFilename(name) {
  // Replace illegal characters for most filesystems and trim
  return (name || 'config')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function ensureWritableDirectory() {
  if (!isFsAccessSupported()) return null;
  // Try saved handle first with readwrite perm
  let saved = await getSavedDirectoryHandle();
  if (saved) {
    const perm = await verifyPermission(saved, 'readwrite');
    if (perm !== 'granted') {
      const req = await requestPermission(saved, 'readwrite');
      if (req === 'granted') return saved;
    } else {
      return saved;
    }
  }
  // Ask the user to pick a directory (starting from previous if any, with readwrite intention)
  let startIn = undefined;
  if (saved) startIn = saved;
  try {
    const dirHandle = await window.showDirectoryPicker(startIn ? { startIn } : undefined);
    await saveDirectoryHandle(dirHandle);
    // Request write permission immediately
    const req = await requestPermission(dirHandle, 'readwrite');
    if (req !== 'granted') return null;
    return dirHandle;
  } catch (e) {
    if (e && e.name === 'AbortError') return null;
    console.error('[fsAccess] ensureWritableDirectory error:', e);
    return null;
  }
}

export async function writeJsonToDirectory(dirHandle, filename, data) {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return { success: true, fileHandle };
  } catch (e) {
    console.error('[fsAccess] writeJsonToDirectory error:', e);
    return { success: false, error: e?.message || 'Errore durante il salvataggio del file' };
  }
}

// ---------- Save As (Windows Explorer-like) ----------

export async function saveJsonWithSavePicker(suggestedName, data) {
  const safe = sanitizeFilename(suggestedName || 'config');
  const fileName = safe.toLowerCase().endsWith('.json') ? safe : `${safe}.json`;

  // Fallback per browser non supportati (iOS Safari ecc.): scarica come download
  if (!hasSavePicker()) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true, fallback: true };
    } catch (e) {
      return { success: false, error: e?.message || 'Download non riuscito' };
    }
  }

  let startIn = await getSavedFileHandle();
  if (!startIn) {
    const lastDir = await getSavedDirectoryHandle();
    if (lastDir) startIn = lastDir;
  }

  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: fileName,
      startIn: startIn || 'documents',
      types: [
        {
          description: 'Configurazione JSON',
          accept: { 'application/json': ['.json'] }
        }
      ]
    });

    // Ricorda il file per la prossima volta (riapre nella stessa finestra e percorso)
    await saveFileHandle(fileHandle);

    // Richiedi/garantisci permesso di scrittura
    const perm = await verifyPermission(fileHandle, 'readwrite');
    if (perm !== 'granted') {
      const req = await requestPermission(fileHandle, 'readwrite');
      if (req !== 'granted') return { success: false, error: 'Permesso negato' };
    }

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return { success: true, fileHandle };
  } catch (e) {
    if (e && e.name === 'AbortError') return { success: false, canceled: true };
    console.error('[fsAccess] saveJsonWithSavePicker error:', e);
    return { success: false, error: e?.message || 'Errore durante il salvataggio' };
  }
}

// ---------- Open (Explorer-like) ----------

export async function openJsonWithPicker() {
  if (!('showOpenFilePicker' in window)) {
    return { error: 'File picker non supportato su questo browser' };
  }

  let startIn = await getSavedFileHandle();
  if (!startIn) {
    const lastDir = await getSavedDirectoryHandle();
    if (lastDir) startIn = lastDir;
  }
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      startIn: startIn || 'documents',
      multiple: false,
      types: [
        {
          description: 'Configurazione JSON',
          accept: { 'application/json': ['.json'] }
        }
      ]
    });
    await saveFileHandle(fileHandle);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    return { name: file.name, data, fileHandle };
  } catch (e) {
    if (e && e.name === 'AbortError') return { canceled: true };
    console.error('[fsAccess] openJsonWithPicker error:', e);
    return { error: e?.message || 'Errore apertura file' };
  }
}

