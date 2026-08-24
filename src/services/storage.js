// Safe Storage helper for iOS Safari / WebKit Private Browsing and PWA mode
const inMemoryStore = new Map();

export const safeStorage = {
  get: (key, fallback = '') => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : fallback;
      }
    } catch (e) {
      console.warn(`Storage get fallback for ${key}:`, e);
    }
    return inMemoryStore.has(key) ? inMemoryStore.get(key) : fallback;
  },

  set: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
        return;
      }
    } catch (e) {
      console.warn(`Storage set fallback for ${key}:`, e);
    }
    inMemoryStore.set(key, String(value));
  },

  remove: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`Storage remove fallback for ${key}:`, e);
    }
    inMemoryStore.delete(key);
  }
};
