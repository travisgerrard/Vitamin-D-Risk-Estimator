import type { ModelMeta, QuantilePredictions } from '../types';

const COVERAGE_TOLERANCE = 0.005;
const MAX_TAIL_SCALE = 1.35;
const MIDDLE_SCALE_FRACTION = 0.5;

/** Keep quantiles ordered after any calibration adjustments. */
function enforceMonotonicQuantiles(quantiles: QuantilePredictions): QuantilePredictions {
  const values = [
    quantiles.q05,
    quantiles.q25,
    quantiles.q50,
    quantiles.q75,
    quantiles.q95,
  ];

  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      values[i] = values[i - 1];
    }
  }

  return {
    q05: values[0],
    q25: values[1],
    q50: values[2],
    q75: values[3],
    q95: values[4],
  };
}

function scaleIntervalAroundMedian(
  quantiles: QuantilePredictions,
  tailScale: number
): QuantilePredictions {
  const median = quantiles.q50;
  const middleScale = 1 + (tailScale - 1) * MIDDLE_SCALE_FRACTION;

  return enforceMonotonicQuantiles({
    q05: median - (median - quantiles.q05) * tailScale,
    q25: median - (median - quantiles.q25) * middleScale,
    q50: median,
    q75: median + (quantiles.q75 - median) * middleScale,
    q95: median + (quantiles.q95 - median) * tailScale,
  });
}

/**
 * Apply conservative post-hoc interval calibration using model metadata.
 *
 * Priority:
 * 1) Explicit conformal adjustments from metadata (if available)
 * 2) Coverage-ratio widening fallback when PI90 undercovers
 */
export function calibrateQuantiles(
  quantiles: QuantilePredictions,
  modelMeta: ModelMeta | null
): QuantilePredictions {
  const monotonic = enforceMonotonicQuantiles(quantiles);
  if (!modelMeta) return monotonic;

  const conformal = modelMeta.conformal_adjustments?.pi90;
  if (
    conformal &&
    Number.isFinite(conformal.lower) &&
    Number.isFinite(conformal.upper) &&
    conformal.lower >= 0 &&
    conformal.upper >= 0
  ) {
    return enforceMonotonicQuantiles({
      q05: monotonic.q05 - conformal.lower,
      q25: monotonic.q25 - conformal.lower * 0.35,
      q50: monotonic.q50,
      q75: monotonic.q75 + conformal.upper * 0.35,
      q95: monotonic.q95 + conformal.upper,
    });
  }

  const pi90 = modelMeta.interval_coverage?.pi90;
  if (!pi90 || pi90.coverage <= 0 || pi90.target <= 0) {
    return monotonic;
  }

  const gap = pi90.target - pi90.coverage;
  if (gap <= COVERAGE_TOLERANCE) {
    return monotonic;
  }

  const tailScale = Math.min(
    MAX_TAIL_SCALE,
    Math.max(1, 1 + gap / Math.max(pi90.coverage, 0.01))
  );

  return scaleIntervalAroundMedian(monotonic, tailScale);
}
