// Ask the browser to make ZamPOS local storage persistent so offline sales,
// the product catalog and cached business details are never evicted when the
// device runs low on disk space.
//
// Supported in Chrome, Edge, Android PWAs and (best-effort) Safari. Failures
// are silent — the app keeps working, it just isn't eviction-proof.

const FLAG = 'zampos:persisted';

export const requestPersistentStorage = async (): Promise<boolean> => {
  try {
    if (!('storage' in navigator) || !navigator.storage?.persist) return false;

    if (navigator.storage.persisted) {
      const already = await navigator.storage.persisted();
      if (already) {
        localStorage.setItem(FLAG, '1');
        return true;
      }
    }

    const granted = await navigator.storage.persist();
    localStorage.setItem(FLAG, granted ? '1' : '0');
    return granted;
  } catch {
    return false;
  }
};

export const isStoragePersisted = (): boolean => {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
};
