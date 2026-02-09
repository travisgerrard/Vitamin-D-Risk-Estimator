/** Clinical thresholds in ng/mL */
export const THRESHOLDS = {
  SEVERE_DEFICIENCY: 12,
  DEFICIENCY: 20,
  INSUFFICIENCY: 30,
} as const;

/** Counseling zone boundaries */
export const ZONE_BOUNDARIES = {
  LOW_RISK_CEILING: 0.10,  // P(<20) < 10% → low risk
  HIGH_RISK_FLOOR: 0.50,   // P(<20) > 50% → high risk
  WIDE_INTERVAL_THRESHOLD: 35, // 90% PI width > 35 → push to uncertain
} as const;

/** Feature clamping ranges (match training data range) */
export const FEATURE_RANGES = {
  age: { min: 18, max: 90 },
  bmi: { min: 10, max: 80 },
} as const;

/** Supplement dose bins (IU) → ordinal category */
export const SUPPLEMENT_BINS = [
  { max: 0, label: 'None', category: 0 },
  { max: 400, label: 'Trace (<400 IU)', category: 1 },
  { max: 1000, label: 'Low (400-999 IU)', category: 2 },
  { max: 2000, label: 'Moderate (1000-1999 IU)', category: 3 },
  { max: Infinity, label: 'High (2000+ IU)', category: 4 },
] as const;

/** Winter months (November through April) */
export const WINTER_MONTHS = [11, 12, 1, 2, 3, 4];

/** Model file paths (relative to public/) */
export const MODEL_PATHS = {
  q05: 'models/quantile_q05.onnx',
  q25: 'models/quantile_q25.onnx',
  q50: 'models/quantile_q50.onnx',
  q75: 'models/quantile_q75.onnx',
  q95: 'models/quantile_q95.onnx',
  meta: 'models/model_meta.json',
} as const;

/** Quantile levels */
export const QUANTILE_LEVELS = [0.05, 0.25, 0.50, 0.75, 0.95] as const;
