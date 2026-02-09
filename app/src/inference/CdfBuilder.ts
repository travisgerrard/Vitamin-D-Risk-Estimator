import type { QuantilePredictions, CdfResult } from '../types';
import { QUANTILE_LEVELS } from '../data/constants';

/**
 * Build a piecewise CDF from 5 quantile predictions.
 *
 * Interior: linear interpolation between quantile points.
 * Left tail (below q05): exponential decay toward 0.
 * Right tail (above q95): exponential decay toward 1.
 */
export function buildCdf(quantiles: QuantilePredictions): CdfResult {
  const qValues = [quantiles.q05, quantiles.q25, quantiles.q50, quantiles.q75, quantiles.q95];
  const qLevels = [...QUANTILE_LEVELS];

  // Generate CDF points
  const cdfPoints: Array<{ x: number; y: number }> = [];
  const densityPoints: Array<{ x: number; y: number }> = [];

  // Left tail: from 0 to q05
  const leftExtent = Math.max(0, qValues[0] - 15);
  const leftRate = computeLeftTailRate(qValues[0], qLevels[0]);

  // Right tail: from q95 onward
  const rightExtent = qValues[4] + 15;
  const rightRate = computeRightTailRate(qValues[4], qLevels[4]);

  // Step size for generating points
  const step = 0.5;

  for (let x = leftExtent; x <= rightExtent; x += step) {
    const y = evaluateCdf(x, qValues, qLevels, leftRate, rightRate);
    cdfPoints.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 1000) / 1000 });
  }

  // Generate density (numerical derivative of CDF)
  for (let i = 1; i < cdfPoints.length; i++) {
    const dx = cdfPoints[i].x - cdfPoints[i - 1].x;
    const dy = cdfPoints[i].y - cdfPoints[i - 1].y;
    const density = dx > 0 ? dy / dx : 0;
    const midX = (cdfPoints[i].x + cdfPoints[i - 1].x) / 2;
    densityPoints.push({
      x: Math.round(midX * 10) / 10,
      y: Math.round(density * 10000) / 10000,
    });
  }

  // Evaluate at clinical thresholds
  const pBelow12 = evaluateCdf(12, qValues, qLevels, leftRate, rightRate);
  const pBelow20 = evaluateCdf(20, qValues, qLevels, leftRate, rightRate);
  const pBelow30 = evaluateCdf(30, qValues, qLevels, leftRate, rightRate);

  return {
    pBelow12: Math.round(pBelow12 * 1000) / 1000,
    pBelow20: Math.round(pBelow20 * 1000) / 1000,
    pBelow30: Math.round(pBelow30 * 1000) / 1000,
    cdfPoints,
    densityPoints,
  };
}

/**
 * Evaluate the piecewise CDF at a given x value.
 */
function evaluateCdf(
  x: number,
  qValues: number[],
  qLevels: number[],
  leftRate: number,
  rightRate: number
): number {
  // Left tail: exponential approach to 0
  if (x <= qValues[0]) {
    return qLevels[0] * Math.exp(leftRate * (x - qValues[0]));
  }

  // Right tail: exponential approach to 1
  if (x >= qValues[qValues.length - 1]) {
    return 1 - (1 - qLevels[qLevels.length - 1]) * Math.exp(-rightRate * (x - qValues[qValues.length - 1]));
  }

  // Interior: linear interpolation between quantile points
  for (let i = 1; i < qValues.length; i++) {
    if (x <= qValues[i]) {
      const fraction = (x - qValues[i - 1]) / (qValues[i] - qValues[i - 1]);
      return qLevels[i - 1] + fraction * (qLevels[i] - qLevels[i - 1]);
    }
  }

  return 1; // shouldn't reach here
}

/**
 * Compute exponential decay rate for left tail.
 * Ensures CDF(q05) = 0.05 and CDF approaches 0 smoothly.
 */
function computeLeftTailRate(q05Value: number, q05Level: number): number {
  // Rate chosen so that CDF decays to ~0.001 about 10 ng/mL below q05
  // rate = -ln(0.001/q05Level) / 10
  return Math.log(q05Level / 0.001) / Math.max(10, q05Value);
}

/**
 * Compute exponential decay rate for right tail.
 * Ensures CDF(q95) = 0.95 and CDF approaches 1 smoothly.
 */
function computeRightTailRate(_q95Value: number, q95Level: number): number {
  // Rate chosen so that CDF reaches ~0.999 about 10 ng/mL above q95
  return Math.log((1 - q95Level) / 0.001) / 10;
}
