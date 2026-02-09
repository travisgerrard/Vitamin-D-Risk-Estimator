import type { UserInputs, ModelFeatures } from '../types';
import { skinToneToRaceEth } from '../data/skinToneMap';
import { WINTER_MONTHS, SUPPLEMENT_BINS, FEATURE_RANGES } from '../data/constants';

/**
 * Encode user inputs into the model feature vector.
 */
export function encodeFeatures(inputs: UserInputs): ModelFeatures {
  // Age: clamp to training range
  const age = Math.max(
    FEATURE_RANGES.age.min,
    Math.min(FEATURE_RANGES.age.max, inputs.age)
  );

  // Sex: 0=male, 1=female
  const sex = inputs.sex === 'female' ? 1 : 0;

  // BMI: clamp to training range
  const bmi = Math.max(
    FEATURE_RANGES.bmi.min,
    Math.min(FEATURE_RANGES.bmi.max, inputs.bmi)
  );

  // Race/ethnicity from skin tone
  const race_eth = skinToneToRaceEth(inputs.skinTone);

  // Season from month
  const exam_season = WINTER_MONTHS.includes(inputs.month) ? 1 : 2;

  // Supplement category from dose
  const doseIU = inputs.supplementDoseIU ?? 0;
  let supplement_cat = 0;
  for (const bin of SUPPLEMENT_BINS) {
    if (doseIU <= bin.max) {
      supplement_cat = bin.category;
      break;
    }
  }

  return { age, sex, bmi, race_eth, exam_season, supplement_cat };
}

/**
 * Convert model features to a Float32Array in the correct order for ONNX input.
 */
export function featuresToArray(features: ModelFeatures): Float32Array {
  return new Float32Array([
    features.age,
    features.sex,
    features.bmi,
    features.race_eth,
    features.exam_season,
    features.supplement_cat,
  ]);
}
