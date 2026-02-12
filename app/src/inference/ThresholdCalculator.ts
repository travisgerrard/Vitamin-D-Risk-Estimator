import type { CdfResult, ModelMeta, QuantilePredictions, ThresholdProbabilities } from '../types';
import { buildCdf } from './CdfBuilder';

/**
 * Calculate threshold probabilities from quantile predictions.
 * P(vitD < threshold) for each clinical threshold.
 */
export function calculateThresholds(
  quantiles: QuantilePredictions,
  calibration?: ModelMeta['calibration']
): ThresholdProbabilities {
  const cdf = buildCdf(quantiles, calibration);
  return thresholdsFromCdf(cdf);
}

export function thresholdsFromCdf(cdf: CdfResult): ThresholdProbabilities {
  return {
    pBelow12: cdf.pBelow12,
    pBelow20: cdf.pBelow20,
    pBelow30: cdf.pBelow30,
  };
}
