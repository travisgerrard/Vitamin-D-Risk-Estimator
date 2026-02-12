import { useCallback, useState } from 'react';
import { loadModels, areModelsLoaded } from '../inference';

export function useModel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(areModelsLoaded());

  const ensureReady = useCallback(async () => {
    if (areModelsLoaded()) {
      setReady(true);
      setError(null);
      return true;
    }

    setLoading(true);
    setError(null);
    try {
      const basePath = import.meta.env.BASE_URL;
      await loadModels(basePath);
      const loaded = areModelsLoaded();
      setReady(loaded);
      if (!loaded) {
        setError('Model is not available.');
      }
      return loaded;
    } catch (e) {
      setReady(false);
      setError(e instanceof Error ? e.message : 'Failed to load models');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, ready, ensureReady };
}
