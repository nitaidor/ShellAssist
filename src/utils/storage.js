export const STORAGE_KEY = "ShellAssist";

export const loadPersistedState = () => {
  try {
    if (typeof window !== 'undefined') {
      if (window.electronAPI && typeof window.electronAPI.loadAppData === 'function') {
        const fileData = window.electronAPI.loadAppData();
        if (fileData && typeof fileData === 'object') {
          return fileData;
        }
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to load state:", e);
  }
  return null;
};

export const savePersistedState = (data) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (window.electronAPI && typeof window.electronAPI.saveAppData === 'function') {
        window.electronAPI.saveAppData(data);
      }
    }
  } catch (e) {
    console.warn("Failed to save state:", e);
  }
};