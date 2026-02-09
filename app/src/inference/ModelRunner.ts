import * as ort from 'onnxruntime-web';
import type { QuantilePredictions } from '../types';
import { MODEL_PATHS } from '../data/constants';

/** Cached ONNX sessions, lazily loaded */
const sessions: Record<string, ort.InferenceSession | null> = {
  q05: null,
  q25: null,
  q50: null,
  q75: null,
  q95: null,
};

let modelsAvailable = false;

/**
 * Load all 5 quantile ONNX models. Call once at startup.
 */
export async function loadModels(basePath: string = ''): Promise<void> {
  const prefix = basePath.replace(/\/$/, '');

  try {
    const loadPromises = Object.entries(MODEL_PATHS).map(async ([key, path]) => {
      if (key === 'meta') return;
      const url = `${prefix}/${path}`;
      sessions[key] = await ort.InferenceSession.create(url, {
        executionProviders: ['wasm'],
      });
    });

    await Promise.all(loadPromises);
    modelsAvailable = true;
  } catch {
    console.warn('ONNX models not available, using mock predictions');
    modelsAvailable = false;
  }
}

/**
 * Check if real models are loaded.
 */
export function areModelsLoaded(): boolean {
  return modelsAvailable;
}

/**
 * Run inference on a single feature vector.
 * Returns predictions from all 5 quantile models with monotonicity enforcement.
 */
export async function predict(features: Float32Array): Promise<QuantilePredictions> {
  if (!modelsAvailable) {
    return mockPredict(features);
  }

  const tensor = new ort.Tensor('float32', features, [1, 6]);

  const results: number[] = [];
  for (const key of ['q05', 'q25', 'q50', 'q75', 'q95'] as const) {
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
