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
  for (let x = leftAnchorX; x <= rightAnchorX + 1e-9; x += STEP) {
    const raw = interpolateKnots(knots, x);
    const previous = cdfPoints.length > 0 ? cdfPoints[cdfPoints.length - 1].y : 0;
    cdfPoints.push({
      x: round(x, 1),
      y: round(Math.max(previous, raw), 3),
    });
  }

  const densityPoints = cdfPoints.map((point, index, arr) => {
    if (arr.length === 1) {
      return { x: point.x, y: 0 };
    }

    const prev = index === 0 ? arr[index].y : arr[index - 1].y;
    const next = index === arr.length - 1 ? arr[index].y : arr[index + 1].y;
    const denom = index === 0 || index === arr.length - 1 ? STEP : 2 * STEP;
    const derivative = Math.max(0, (next - prev) / denom);
    return { x: point.x, y: derivative };
  });

  // Renormalize density after smoothing/rounding so area remains 1.
  let area = 0;
  for (let i = 1; i < densityPoints.length; i++) {
    area += (densityPoints[i].y + densityPoints[i - 1].y) / 2 * STEP;
  }
  const densityScale = area > 0 ? 1 / area : 1;
  const normalizedDensity = densityPoints.map(p => ({
    x: p.x,
    y: round(p.y * densityScale, 4),
  }));

  return {
    pBelow12: round(interpolateKnots(knots, 12), 3),
    pBelow20: round(interpolateKnots(knots, 20), 3),
    pBelow30: round(interpolateKnots(knots, 30), 3),
    cdfPoints,
    densityPoints: normalizedDensity,
  };
}
