import type { CdfResult, ModelMeta, QuantilePredictions } from '../types';

interface KnotPoint {
  x: number;
  p: number;
}

const STEP = 0.5;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function resolveCalibratedProbability(
  key: 'q05' | 'q25' | 'q50' | 'q75' | 'q95',
  nominal: number,
  calibration?: ModelMeta['calibration']
): number {
  const actual = calibration?.[key]?.actual;
  if (!Number.isFinite(actual)) return nominal;
  return clamp01(actual as number);
}

function slope(a: KnotPoint, b: KnotPoint): number {
  const dx = Math.max(0.05, b.x - a.x);
  return Math.max(0.005, (b.p - a.p) / dx);
}

function interpolateKnots(knots: KnotPoint[], target: number): number {
  if (target <= knots[0].x) return knots[0].p;
  if (target >= knots[knots.length - 1].x) return knots[knots.length - 1].p;

  for (let i = 1; i < knots.length; i++) {
    if (target <= knots[i].x) {
      const prev = knots[i - 1];
      const next = knots[i];
      const span = Math.max(0.05, next.x - prev.x);
      const frac = (target - prev.x) / span;
      return clamp01(prev.p + frac * (next.p - prev.p));
    }
  }

  return 1;
}

/**
 * Build a smooth display density from quantiles.
 *
 * This is intentionally decoupled from threshold calibration to keep the chart
 * visually stable and avoid stepped artifacts from piecewise CDF interpolation.
 */
function buildDisplayDensity(
  quantiles: QuantilePredictions,
  minX: number,
  maxX: number
): Array<{ x: number; y: number }> {
  const q05 = quantiles.q05;
  const q50 = quantiles.q50;
  const q95 = quantiles.q95;

  const sigmaLeft = Math.max(1.5, (q50 - q05) / 1.645);
  const sigmaRight = Math.max(1.5, (q95 - q50) / 1.645);
  const normFactor = 2 / (Math.sqrt(2 * Math.PI) * (sigmaLeft + sigmaRight));

  const points: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX + 1e-9; x += STEP) {
    const sigma = x <= q50 ? sigmaLeft : sigmaRight;
    const z = (x - q50) / sigma;
    const density = normFactor * Math.exp(-0.5 * z * z);
    points.push({
      x: round(x, 1),
      y: round(Math.max(0, density), 4),
    });
  }

  return points;
}

/**
 * Build CDF and density from quantile knots using monotone interpolation.
 *
 * This avoids assuming a split-normal shape and produces threshold probabilities
 * directly from the model's quantile structure. Optional calibration metadata
 * adjusts knot probabilities from nominal to observed coverage.
 */
export function buildCdf(
  quantiles: QuantilePredictions,
  calibration?: ModelMeta['calibration']
): CdfResult {
  const iqr = quantiles.q75 - quantiles.q25;
  const spread = Math.max(2, iqr / 1.349);
  const minX = Math.max(0, quantiles.q05 - 2 * spread);
  const maxX = quantiles.q95 + 2 * spread;

  const coreKnots: KnotPoint[] = [
    { x: quantiles.q05, p: resolveCalibratedProbability('q05', 0.05, calibration) },
    { x: quantiles.q25, p: resolveCalibratedProbability('q25', 0.25, calibration) },
    { x: quantiles.q50, p: resolveCalibratedProbability('q50', 0.5, calibration) },
    { x: quantiles.q75, p: resolveCalibratedProbability('q75', 0.75, calibration) },
    { x: quantiles.q95, p: resolveCalibratedProbability('q95', 0.95, calibration) },
  ];

  // Guard against flat/crossed knots by nudging forward.
  for (let i = 1; i < coreKnots.length; i++) {
    if (coreKnots[i].x <= coreKnots[i - 1].x) {
      coreKnots[i].x = coreKnots[i - 1].x + 0.05;
    }
    if (coreKnots[i].p <= coreKnots[i - 1].p) {
      coreKnots[i].p = Math.min(0.999, coreKnots[i - 1].p + 0.001);
    }
  }

  const leftSlope = slope(coreKnots[0], coreKnots[1]);
  const rightSlope = slope(coreKnots[3], coreKnots[4]);

  const leftAnchorX = Math.max(0, coreKnots[0].x - coreKnots[0].p / leftSlope);
  const rightAnchorX = Math.max(
    coreKnots[4].x + 0.5,
    coreKnots[4].x + (1 - coreKnots[4].p) / rightSlope
  );

  const knots: KnotPoint[] = [
    { x: leftAnchorX, p: 0 },
    ...coreKnots,
    { x: rightAnchorX, p: 1 },
  ];

  const cdfPoints: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX + 1e-9; x += STEP) {
    const raw = interpolateKnots(knots, x);
    const previous = cdfPoints.length > 0 ? cdfPoints[cdfPoints.length - 1].y : 0;
    cdfPoints.push({
      x: round(x, 1),
      y: round(Math.max(previous, raw), 3),
    });
  }
  const densityPoints = buildDisplayDensity(quantiles, minX, maxX);

  return {
    pBelow12: round(interpolateKnots(knots, 12), 3),
    pBelow20: round(interpolateKnots(knots, 20), 3),
    pBelow30: round(interpolateKnots(knots, 30), 3),
    cdfPoints,
    densityPoints,
  };
}
