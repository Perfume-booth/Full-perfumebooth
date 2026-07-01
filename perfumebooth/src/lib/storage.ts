/**
 * Hardened Storage Utility for Perfume Booth
 * Handles Next.js SSR, Safari Private Browsing (QuotaExceededError),
 * and general browser storage unavailability.
 */

type StorageType = "localStorage" | "sessionStorage";

const isQuotaExceededError = (err: any): boolean => {
  return (
    err instanceof DOMException &&
    (err.code === 22 ||
      err.code === 1014 ||
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
};

const createSafeStorage = (type: StorageType) => {
  return {
    getItem: (key: string): string | null => {
      if (typeof window === "undefined") return null;

      try {
        const storage = window[type];
        return storage.getItem(key);
      } catch (error) {
        console.warn(`[Storage] Failed to get item "${key}" from ${type}:`, error);
        return null;
      }
    },

    setItem: (key: string, value: string): void => {
      if (typeof window === "undefined") return;

      try {
        const storage = window[type];
        storage.setItem(key, value);
      } catch (error) {
        if (isQuotaExceededError(error)) {
          console.error(`[Storage] ${type} quota exceeded or blocked (Safari Private Mode). Cannot save "${key}".`);
        } else {
          console.warn(`[Storage] Failed to set item "${key}" in ${type}:`, error);
        }
      }
    },

    removeItem: (key: string): void => {
      if (typeof window === "undefined") return;

      try {
        const storage = window[type];
        storage.removeItem(key);
      } catch (error) {
        console.warn(`[Storage] Failed to remove item "${key}" from ${type}:`, error);
      }
    },

    clear: (): void => {
      if (typeof window === "undefined") return;

      try {
        const storage = window[type];
        storage.clear();
      } catch (error) {
        console.warn(`[Storage] Failed to clear ${type}:`, error);
      }
    },
  };
};

export const safeLocalStorage = createSafeStorage("localStorage");
export const safeSessionStorage = createSafeStorage("sessionStorage");

/**
 * Backward compatibility alias
 * Use safeLocalStorage for persistent data (Cart, Auth, Wishlist)
 * Use safeSessionStorage for transient UI states
 */
export const safeStorage = safeLocalStorage;
