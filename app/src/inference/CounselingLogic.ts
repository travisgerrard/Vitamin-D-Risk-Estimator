import type { QuantilePredictions, ThresholdProbabilities, CounselingResult, ModelFeatures } from '../types';
import { ZONE_BOUNDARIES } from '../data/constants';

/**
 * Determine counseling zone and generate plain-language recommendation.
 */
export function generateCounseling(
  quantiles: QuantilePredictions,
  thresholds: ThresholdProbabilities,
  features: ModelFeatures,
  sparseSubgroups?: Array<{ race_eth: number; sex: number; age_decade: number }>
): CounselingResult {
  const pi90Width = quantiles.q95 - quantiles.q05;
  const wideInterval = pi90Width > ZONE_BOUNDARIES.WIDE_INTERVAL_THRESHOLD;

  // Check for sparse subgroup
  const ageDec = Math.floor(features.age / 10) * 10;
  const sparseDataWarning = sparseSubgroups?.some(
    sg => sg.race_eth === features.race_eth &&
          sg.sex === features.sex &&
          sg.age_decade === ageDec
  ) ?? false;

  // Determine zone
  let zone: CounselingResult['zone'];
  if (wideInterval) {
    zone = 'uncertain';
  } else if (thresholds.pBelow20 < ZONE_BOUNDARIES.LOW_RISK_CEILING) {
    zone = 'low';
  } else if (thresholds.pBelow20 > ZONE_BOUNDARIES.HIGH_RISK_FLOOR) {
    zone = 'high';
  } else {
    zone = 'uncertain';
  }

  const result = getZoneContent(zone, thresholds, quantiles, wideInterval);

  return {
    ...result,
    wideIntervalWarning: wideInterval,
    sparseDataWarning,
  };
}

function getZoneContent(
  zone: CounselingResult['zone'],
  thresholds: ThresholdProbabilities,
  quantiles: QuantilePredictions,
  wideInterval: boolean
): Pick<CounselingResult, 'zone' | 'headline' | 'description' | 'recommendation'> {
  const pct = Math.round(thresholds.pBelow20 * 100);
  const median = Math.round(quantiles.q50);

  switch (zone) {
    case 'low':
      return {
        zone: 'low',
        headline: 'Low Risk of Deficiency',
        description: `Based on your profile, there is about a ${pct}% chance your vitamin D is below 20 ng/mL. Your estimated level is around ${median} ng/mL.`,
        recommendation: 'A lab test is unlikely to find deficiency. Consider maintaining your current lifestyle. If you have specific health concerns, discuss with your doctor.',
      };

    case 'high':
      return {
        zone: 'high',
        headline: 'Higher Risk of Deficiency',
        description: `Based on your profile, there is about a ${pct}% chance your vitamin D is below 20 ng/mL. Your estimated level is around ${median} ng/mL.`,
        recommendation: 'Consider discussing vitamin D supplementation and/or testing with your healthcare provider. Factors like your skin tone, sun exposure, and time of year contribute to this estimate.',
      };

    case 'uncertain':
      return {
        zone: 'uncertain',
        headline: wideInterval
          ? 'Uncertain Estimate - Consider Testing'
          : 'Moderate Risk - Testing May Help',
        description: wideInterval
          ? `Your profile falls in a range where our estimate is less precise. Your estimated level is around ${median} ng/mL, but the uncertainty is wider than usual.`
          : `Based on your profile, there is about a ${pct}% chance your vitamin D is below 20 ng/mL. Your estimated level is around ${median} ng/mL.`,
        recommendation: 'A blood test would provide the most useful information for your situation. The cost of a 25(OH)D test is typically modest, and the result would help guide supplementation decisions.',
      };
  }
}
