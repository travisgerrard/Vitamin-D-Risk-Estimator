/** User inputs from the form */
export interface UserInputs {
  age: number;
  sex: 'male' | 'female';
  bmi: number;
  skinTone: number; // Fitzpatrick 1-6
  zipCode: string;
  month: number; // 1-12
  // Advanced inputs
  sunExposureMinutes?: number;
  clothingCoverage?: 'minimal' | 'moderate' | 'full';
  sunscreenUse?: 'never' | 'sometimes' | 'always';
  supplementDoseIU?: number;
}

/** Feature vector for the model (matches NHANES training features) */
export interface ModelFeatures {
  age: number;
  sex: number; // 0=male, 1=female
  bmi: number;
  race_eth: number; // 0-4
  exam_season: number; // 1=winter, 2=summer
  supplement_cat: number; // 0-4
}

/** Raw quantile predictions from the model */
export interface QuantilePredictions {
  q05: number;
  q25: number;
  q50: number;
  q75: number;
  q95: number;
}

/** CDF evaluated at key points */
export interface CdfResult {
  /** Probability that vitD < threshold, for each clinical threshold */
  pBelow12: number;
  pBelow20: number;
  pBelow30: number;
  /** The full CDF function for charting */
  cdfPoints: Array<{ x: number; y: number }>;
  /** Density curve points for charting */
  densityPoints: Array<{ x: number; y: number }>;
}

/** Risk zone classification */
export type RiskZone = 'low' | 'uncertain' | 'high';

/** Counseling result */
export interface CounselingResult {
  zone: RiskZone;
  headline: string;
  description: string;
  recommendation: string;
  wideIntervalWarning: boolean;
  sparseDataWarning: boolean;
}

/** Threshold probability bars */
export interface ThresholdProbabilities {
  pBelow12: number; // P(vitD < 12 ng/mL) - severe deficiency
  pBelow20: number; // P(vitD < 20 ng/mL) - deficiency
  pBelow30: number; // P(vitD < 30 ng/mL) - insufficiency
}

/** Complete inference result */
export interface InferenceResult {
  quantiles: QuantilePredictions;
  thresholds: ThresholdProbabilities;
  cdf: CdfResult;
  counseling: CounselingResult;
  features: ModelFeatures;
  uvIndex?: number;
}

/** ZIP code to lat/lon lookup */
export interface ZipLocation {
  lat: number;
  lon: number;
}

/** Model metadata loaded from model_meta.json */
export interface ModelMeta {
  model_version: string;
  quantiles: number[];
  features: Array<{
    name: string;
    type: string;
    range?: [number, number];
    values?: Record<string, string | number>;
    description: string;
  }>;
  thresholds_ngml: Record<string, number>;
  calibration: Record<string, {
    nominal: number;
    actual: number;
    diff: number;
  }>;
  interval_coverage: Record<string, {
    coverage: number;
    target: number;
    mean_width: number;
  }>;
  training_stats: { mean: number; std: number; min: number; max: number };
  sparse_subgroups: Array<{
    race_eth: number;
    sex: number;
    age_decade: number;
    n: number;
  }>;
  conformal_adjustments?: {
    pi90?: {
      lower: number;
      upper: number;
    };
  };
  temporal_validation?: {
    train_cycles: string[];
    test_cycles: string[];
    per_quantile_pinball_loss: Record<string, number>;
    interval_coverage: {
      pi90: number;
      pi50: number;
    };
  };
  n_train: number;
  n_test: number;
}
