import { useState, useCallback } from 'react';
import type { UserInputs, InferenceResult, ZipLocation } from '../types';
import {
  encodeFeatures,
  featuresToArray,
  predict,
  buildCdf,
  calculateThresholds,
  generateCounseling,
  estimateUvExposure,
} from '../inference';

export function useInference() {
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runInference = useCallback(async (inputs: UserInputs, location?: ZipLocation) => {
    setRunning(true);
    setError(null);

    try {
      // Encode features
      const features = encodeFeatures(inputs);
      const featureArray = featuresToArray(features);

      // Run model
      const quantiles = await predict(featureArray);

      // Build CDF and thresholds
      const cdf = buildCdf(quantiles);
      const thresholds = calculateThresholds(quantiles);

      // Generate counseling
      const counseling = generateCounseling(quantiles, thresholds, features);

      // UV estimate (for narrative)
      let uvIndex: number | undefined;
      if (location) {
        const uvEstimate = estimateUvExposure(
          location.lat,
          inputs.month,
          inputs.sunExposureMinutes,
          inputs.clothingCoverage,
          inputs.sunscreenUse
        );
        uvIndex = uvEstimate.baseUvIndex;
      }

      const inferenceResult: InferenceResult = {
        quantiles,
        thresholds,
        cdf,
        counseling,
        features,
        uvIndex,
      };

      setResult(inferenceResult);
      return inferenceResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Inference failed';
      setError(msg);
      return null;
    } finally {
      setRunning(false);
    }
  }, []);

  return { result, running, error, runInference };
}
