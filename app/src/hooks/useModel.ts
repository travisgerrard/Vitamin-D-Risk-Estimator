import { useState, useEffect } from 'react';
import { loadModels, areModelsLoaded } from '../inference';

export function useModel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const basePath = import.meta.env.BASE_URL;
        await loadModels(basePath);
        if (!cancelled) {
          setReady(areModelsLoaded());
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load models');
          setLoading(false);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return { loading, error, ready };
}
