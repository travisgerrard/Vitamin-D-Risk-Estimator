import * as ort from 'onnxruntime-web';
import type { ModelMeta, QuantilePredictions } from '../types';
import { MODEL_PATHS } from '../data/constants';

const MODEL_KEYS = ['q05', 'q25', 'q50', 'q75', 'q95'] as const;
type ModelKey = (typeof MODEL_KEYS)[number];

/** Cached ONNX sessions */
const sessions: Record<ModelKey, ort.InferenceSession | null> = {
  q05: null,
  q25: null,
  q50: null,
  q75: null,
  q95: null,
};

let modelsAvailable = false;
let runtimeConfigured = false;
let modelLoadPromise: Promise<void> | null = null;
let modelMetaLoadPromise: Promise<ModelMeta | null> | null = null;
let modelMeta: ModelMeta | null = null;

function trimTrailingSlash(path: string): string {
  return path.replace(/\/$/, '');
}

function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

function configureRuntime() {
  if (runtimeConfigured) return;
  runtimeConfigured = true;

  // iOS Safari has tighter memory/thread constraints; single-threaded wasm is more stable.
  if (isIOSWebKit()) {
    ort.env.wasm.numThreads = 1;
  } else if (typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)) {
    ort.env.wasm.numThreads = Math.max(1, Math.min(2, Math.floor(navigator.hardwareConcurrency / 2)));
  }
}

async function loadModelMeta(basePath: string): Promise<ModelMeta | null> {
  if (modelMeta) return modelMeta;
  if (modelMetaLoadPromise) return modelMetaLoadPromise;

  const prefix = trimTrailingSlash(basePath);
  const metaUrl = `${prefix}/${MODEL_PATHS.meta}`;

  modelMetaLoadPromise = (async () => {
    try {
      const resp = await fetch(metaUrl, { cache: 'no-store' });
      if (!resp.ok) return null;
      modelMeta = await resp.json() as ModelMeta;
      return modelMeta;
    } catch {
      return null;
    } finally {
      modelMetaLoadPromise = null;
    }
  })();

  return modelMetaLoadPromise;
}

/**
 * Load all quantile ONNX models. Safe to call multiple times.
 */
export async function loadModels(basePath: string = ''): Promise<void> {
  if (modelsAvailable) return;
  if (modelLoadPromise) return modelLoadPromise;

  const prefix = trimTrailingSlash(basePath);

  modelLoadPromise = (async () => {
    configureRuntime();
    await loadModelMeta(basePath);

    try {
      // Sequential loading reduces peak memory pressure on mobile Safari.
      for (const key of MODEL_KEYS) {
        if (sessions[key]) continue;
        const url = `${prefix}/${MODEL_PATHS[key]}`;
        sessions[key] = await ort.InferenceSession.create(url, {
          executionProviders: ['wasm'],
        });
      }
      modelsAvailable = true;
    } catch (error) {
      modelsAvailable = false;
      for (const key of MODEL_KEYS) {
        sessions[key] = null;
      }

      if (import.meta.env.DEV) {
        console.warn('ONNX models unavailable in dev mode, using mock predictions');
        return;
      }

      const message = error instanceof Error ? error.message : 'Failed to load ONNX models';
      throw new Error(message);
    } finally {
      modelLoadPromise = null;
    }
  })();

  await modelLoadPromise;
}

export function getModelMeta(): ModelMeta | null {
  return modelMeta;
}

export function areModelsLoaded(): boolean {
  return modelsAvailable;
}

function ensureModelsLoadedForPredict() {
  if (!modelsAvailable) {
    if (import.meta.env.DEV) return false;
    throw new Error('Prediction model is not loaded yet.');
  }
  return true;
}

/**
 * Run inference on a single feature vector.
 * Returns predictions from all 5 quantile models with monotonicity enforcement.
 */
export async function predict(features: Float32Array): Promise<QuantilePredictions> {
  if (!ensureModelsLoadedForPredict()) {
    return mockPredict(features);
  }

  const tensor = new ort.Tensor('float32', features, [1, 6]);

  const results: number[] = [];
  for (const key of MODEL_KEYS) {
    const session = sessions[key];
    if (!session) throw new Error(`Model ${key} not loaded`);

    const inputName = session.inputNames[0];
    const output = await session.run({ [inputName]: tensor });
    const outputName = session.outputNames[0];
    const value = (output[outputName].data as Float32Array)[0];
    results.push(value);
  }

  // Enforce monotonicity
  for (let i = 1; i < results.length; i++) {
    if (results[i] < results[i - 1]) {
      results[i] = results[i - 1];
    }
  }

  return {
    q05: results[0],
    q25: results[1],
    q50: results[2],
    q75: results[3],
    q95: results[4],
  };
}

/**
 * Mock predictions for development when ONNX models aren't available.
 * Uses simple heuristic based on input features.
 */
function mockPredict(features: Float32Array): QuantilePredictions {
  const [age, sex, bmi, race_eth, exam_season, supplement_cat] = features;

  // Base median around 28 ng/mL (population average)
  let median = 28;

  // Age effect: -0.1 per year over 40
  median -= Math.max(0, age - 40) * 0.1;

  // Sex: females slightly lower
  median -= sex * 2;

  // BMI: higher BMI → lower vitD
  median -= Math.max(0, bmi - 25) * 0.3;

  // Race/ethnicity: darker skin → lower vitD
  if (race_eth === 3) median -= 10; // NHB
  else if (race_eth === 0 || race_eth === 1) median -= 4; // Hispanic
  else if (race_eth === 4) median -= 3; // Other

  // Season: winter → lower
  if (exam_season === 1) median -= 4;

  // Supplements: higher dose → higher vitD
  median += supplement_cat * 3;

  // Clamp
  median = Math.max(5, Math.min(80, median));

  // Generate quantiles with reasonable spread
  const spread = 8 + (bmi - 25) * 0.2;
  return {
    q05: Math.max(3, median - 2.0 * spread),
    q25: Math.max(4, median - 0.8 * spread),
    q50: median,
    q75: median + 0.8 * spread,
    q95: median + 2.0 * spread,
  };
}
