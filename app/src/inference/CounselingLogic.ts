import type { QuantilePredictions, ThresholdProbabilities, CounselingResult, ModelFeatures } from '../types';
import { ZONE_BOUNDARIES } from '../data/constants';

/**
 * Determine counseling zone and generate plain-language recommendation.
 *
 * Goal: help people decide whether supplementation makes sense for them,
 * reducing unnecessary lab testing. Three zones:
 *   - Low risk: your vitamin D is probably fine, no action needed
 *   - High risk: supplementation is worth considering
 *   - Moderate: supplementation is reasonable; a lab test could help but isn't required
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

  // Determine zone based on P(vitD < 20)
  let zone: CounselingResult['zone'];
  if (thresholds.pBelow20 < ZONE_BOUNDARIES.LOW_RISK_CEILING) {
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
        headline: 'Your Vitamin D Is Probably Fine',
        description: `Based on your profile, there is only about a ${pct}% chance your vitamin D is below 20 ng/mL. Your estimated level is around ${median} ng/mL, which is in the adequate range.`,
        recommendation: 'Supplementation is unlikely to be necessary. Maintaining your current diet, sun exposure, and lifestyle should be sufficient. A lab test would probably confirm adequate levels and is not needed for most people in your situation.',
      };

    case 'high':
      return {
        zone: 'high',
        headline: 'Consider Vitamin D Supplementation',
        description: `Based on your profile, there is about a ${pct}% chance your vitamin D is below 20 ng/mL. Your estimated level is around ${median} ng/mL.`,
        recommendation: 'A daily vitamin D supplement (1000-2000 IU) is a safe, inexpensive option worth discussing with your healthcare provider. For most people in your risk profile, starting moderate supplementation is reasonable without needing a lab test first.',
      };

    case 'uncertain':
      return {
        zone: 'uncertain',
        headline: wideInterval
          ? 'Uncertain Estimate — Low-Dose Supplementation Is Reasonable'
          : 'Moderate Risk — Supplementation May Help',
        description: wideInterval
          ? `Your profile falls in a range where our estimate is less precise. Your estimated level is around ${median} ng/mL, but the uncertainty is wider than usual.`
          : `Based on your profile, there is about a ${pct}% chance your vitamin D is below 20 ng/mL. Your estimated level is around ${median} ng/mL.`,
        recommendation: wideInterval
          ? 'Given the uncertainty, a low-dose vitamin D supplement (1000 IU daily) is a safe option. If you want more precision, a blood test can help tailor supplementation — but it is not strictly necessary for most people.'
          : 'A low-dose vitamin D supplement (1000-2000 IU daily) is reasonable for your profile. This is a safe dose that can help without needing a lab test first. If you prefer to know your exact level, a 25(OH)D blood test is an option but not required.',
      };
  }
}
