import type { QuantilePredictions, CdfResult } from '../types';
import { QUANTILE_LEVELS } from '../data/constants';

/**
 * Build a smooth CDF and density from 5 quantile predictions.
 *
 * Uses a Gaussian mixture approach: place a Gaussian kernel at each quantile
 * point, weighted to approximate the conditional distribution. This avoids
 * the artifacts from piecewise linear CDF + numerical differentiation.
 */
export function buildCdf(quantiles: QuantilePredictions): CdfResult {
  const qValues = [quantiles.q05, quantiles.q25, quantiles.q50, quantiles.q75, quantiles.q95];
  const qLevels = [...QUANTILE_LEVELS];

  // Estimate spread from IQR
  const iqr = qValues[3] - qValues[1]; // q75 - q25
  const bandwidth = Math.max(2, iqr / 2.5);

  // Build smooth density using Gaussian kernels at quantile midpoints
  // Place kernels between quantile points, weighted by the probability mass in each interval
  const kernels: Array<{ mu: number; sigma: number; weight: number }> = [];

  // Left tail kernel
  kernels.push({
    mu: qValues[0],
    sigma: bandwidth * 1.2,
    weight: qLevels[0], // 0.05
  });

  // Interior kernels between adjacent quantile points
  for (let i = 0; i < qValues.length - 1; i++) {
    const mu = (qValues[i] + qValues[i + 1]) / 2;
    const sigma = Math.max(1.5, (qValues[i + 1] - qValues[i]) / 2);
    const weight = qLevels[i + 1] - qLevels[i];
    kernels.push({ mu, sigma, weight });
  }

  // Right tail kernel
  kernels.push({
    mu: qValues[4],
    sigma: bandwidth * 1.2,
    weight: 1 - qLevels[4], // 0.05
  });

  // Generate density and CDF points
  const minX = Math.max(0, qValues[0] - 3 * bandwidth);
  const maxX = qValues[4] + 3 * bandwidth;
  const step = 0.5;

  const densityPoints: Array<{ x: number; y: number }> = [];
  const cdfPoints: Array<{ x: number; y: number }> = [];

  // Compute density at each point
  const rawDensity: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x += step) {
    let d = 0;
    for (const k of kernels) {
      d += k.weight * gaussian(x, k.mu, k.sigma);
    }
    rawDensity.push({ x: Math.round(x * 10) / 10, y: d });
  }

  // Normalize density so it integrates to ~1
  const totalArea = rawDensity.reduce((sum, p, i) => {
    if (i === 0) return sum;
    return sum + (p.y + rawDensity[i - 1].y) / 2 * step;
  }, 0);

  const scale = totalArea > 0 ? 1 / totalArea : 1;

  for (const p of rawDensity) {
    densityPoints.push({
      x: p.x,
      y: Math.round(p.y * scale * 10000) / 10000,
    });
  }

  // Build CDF by integrating the density (trapezoidal)
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

  // Evaluate CDF at clinical thresholds using interpolation
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

/** Standard Gaussian PDF */
function gaussian(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
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
