import { useState, useCallback, useRef } from 'react';
import type { ZipLocation } from '../types';

/** Cache the zip data once loaded */
let zipData: Record<string, [number, number]> | null = null;

export function useZipLookup() {
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const loadZipData = useCallback(async () => {
    if (zipData) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
      const resp = await fetch(`${basePath}/data/zip_latlon.json`);
      if (resp.ok) {
        zipData = await resp.json();
      }
    } catch {
      console.warn('ZIP lookup data not available');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const lookup = useCallback((zip: string): ZipLocation | null => {
    if (!zipData) return null;
    const entry = zipData[zip];
    if (!entry) return null;
    return { lat: entry[0], lon: entry[1] };
  }, []);

  return { loading, loadZipData, lookup };
}
