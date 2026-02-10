import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'vitd_';

export function usePersistedState<T>(key: string, defaultValue: T) {
  const storageKey = STORAGE_PREFIX + key;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // ignore parse errors
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }, [storageKey, value]);

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setValue(defaultValue);
  }, [storageKey, defaultValue]);

  return [value, setValue, reset] as const;
}

/** Clear all persisted form state */
export function clearAllPersistedState() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
