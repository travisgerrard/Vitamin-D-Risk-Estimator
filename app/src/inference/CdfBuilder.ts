import type { QuantilePredictions, CdfResult } from '../types';

/**
 * Build a smooth CDF and density from 5 quantile predictions.
 *
 * Fits a skew-normal-like distribution by estimating location, scale,
 * and skewness from the quantile spread, then generates a smooth
 * density curve. This avoids multi-modal artifacts from kernel methods.
 */
export function buildCdf(quantiles: QuantilePredictions): CdfResult {
  const q05 = quantiles.q05;
  const q25 = quantiles.q25;
  const q50 = quantiles.q50;
  const q75 = quantiles.q75;
  const q95 = quantiles.q95;

  // Use IQR to set the extent of the chart
  const iqr = q75 - q25;
  const spread = Math.max(2, iqr / 1.349);

  const minX = Math.max(0, q05 - 2 * spread);
  const maxX = q95 + 2 * spread;
  const step = 0.5;

  const densityPoints: Array<{ x: number; y: number }> = [];
  const cdfPoints: Array<{ x: number; y: number }> = [];

  // Generate density using a split-normal (two-piece normal) distribution
  // Different sigma on each side of the median
  const sigmaLeft = (q50 - q05) / 1.645;  // q05 is 1.645 sigma below median
  const sigmaRight = (q95 - q50) / 1.645; // q95 is 1.645 sigma above median
  const effSigmaLeft = Math.max(1.5, sigmaLeft);
  const effSigmaRight = Math.max(1.5, sigmaRight);

  // Normalization: the two-piece normal integrates to
  // sqrt(2*pi) * (sigmaLeft + sigmaRight) / 2 for unnormalized Gaussian
  const normFactor = 2 / (Math.sqrt(2 * Math.PI) * (effSigmaLeft + effSigmaRight));

  for (let x = minX; x <= maxX; x += step) {
    const sigma = x <= q50 ? effSigmaLeft : effSigmaRight;
    const z = (x - q50) / sigma;
    const density = normFactor * Math.exp(-0.5 * z * z);

    densityPoints.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(density * 10000) / 10000,
    });
  }

  // Build CDF by integrating density (trapezoidal)
  let cumulative = 0;
  for (let i = 0; i < densityPoints.length; i++) {
    if (i > 0) {
      cumulative += (densityPoints[i].y + densityPoints[i - 1].y) / 2 * step;
    }
    cdfPoints.push({
      x: densityPoints[i].x,
      y: Math.round(Math.min(1, cumulative) * 1000) / 1000,
    });
  }

  // Evaluate CDF at clinical thresholds
  const pBelow12 = interpolateCdf(cdfPoints, 12);
  const pBelow20 = interpolateCdf(cdfPoints, 20);
  const pBelow30 = interpolateCdf(cdfPoints, 30);

  return {
    pBelow12: Math.round(pBelow12 * 1000) / 1000,
    pBelow20: Math.round(pBelow20 * 1000) / 1000,
    pBelow30: Math.round(pBelow30 * 1000) / 1000,
    cdfPoints,
    densityPoints,
  };
}

/** Linearly interpolate CDF value at a target x */
function interpolateCdf(cdfPoints: Array<{ x: number; y: number }>, target: number): number {
  if (target <= cdfPoints[0].x) return 0;
  if (target >= cdfPoints[cdfPoints.length - 1].x) return 1;

  for (let i = 1; i < cdfPoints.length; i++) {
    if (cdfPoints[i].x >= target) {
      const frac = (target - cdfPoints[i - 1].x) / (cdfPoints[i].x - cdfPoints[i - 1].x);
      return cdfPoints[i - 1].y + frac * (cdfPoints[i].y - cdfPoints[i - 1].y);
    }
  }
  return 1;
}
