import type { QuantilePredictions, ThresholdProbabilities } from '../types';
import { buildCdf } from './CdfBuilder';

/**
 * Calculate threshold probabilities from quantile predictions.
 * P(vitD < threshold) for each clinical threshold.
 */
export function calculateThresholds(quantiles: QuantilePredictions): ThresholdProbabilities {
  const cdf = buildCdf(quantiles);
  return {
    pBelow12: cdf.pBelow12,
    pBelow20: cdf.pBelow20,
    pBelow30: cdf.pBelow30,
  };
}
