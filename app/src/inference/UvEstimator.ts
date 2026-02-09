import { getBaseUvIndex } from '../data/uvTable';

/** Clothing coverage multipliers for effective UV dose */
const CLOTHING_MULTIPLIER = {
  minimal: 0.9,   // Shorts + t-shirt
  moderate: 0.5,  // Long pants + short sleeves
  full: 0.15,     // Full coverage
} as const;

/** Sunscreen multipliers */
const SUNSCREEN_MULTIPLIER = {
  never: 1.0,
  sometimes: 0.6,
  always: 0.2,
} as const;

export interface UvEstimate {
  baseUvIndex: number;
  effectiveUvDose: number;
  uvCategory: 'very_low' | 'low' | 'moderate' | 'adequate';
  narrative: string;
}

/**
 * Estimate effective UV exposure for counseling narrative.
 *
 * NOT used as a direct model input - used for the counseling narrative
 * and optional post-model adjustment layer.
 */
export function estimateUvExposure(
  latitude: number,
  month: number,
  sunExposureMinutes?: number,
  clothingCoverage?: 'minimal' | 'moderate' | 'full',
  sunscreenUse?: 'never' | 'sometimes' | 'always'
): UvEstimate {
  const baseUvIndex = getBaseUvIndex(latitude, month);

  // Default values for basic mode
  const minutes = sunExposureMinutes ?? 15;
  const clothing = clothingCoverage ?? 'moderate';
  const sunscreen = sunscreenUse ?? 'sometimes';

  // Effective UV dose: base UV * time factor * clothing * sunscreen
  // Time factor: saturates around 30 min for vitD synthesis
  const timeFactor = Math.min(1, minutes / 30);
  const effectiveUvDose = baseUvIndex *
    timeFactor *
    CLOTHING_MULTIPLIER[clothing] *
    SUNSCREEN_MULTIPLIER[sunscreen];

  // Categorize
  let uvCategory: UvEstimate['uvCategory'];
  if (effectiveUvDose < 1) uvCategory = 'very_low';
  else if (effectiveUvDose < 2.5) uvCategory = 'low';
  else if (effectiveUvDose < 5) uvCategory = 'moderate';
  else uvCategory = 'adequate';

  // Generate narrative
  const narrative = generateNarrative(baseUvIndex, effectiveUvDose, uvCategory, month, latitude);

  return { baseUvIndex, effectiveUvDose, uvCategory, narrative };
}

function generateNarrative(
  baseUV: number,
  _effectiveUV: number,
  category: UvEstimate['uvCategory'],
  month: number,
  latitude: number
): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[month - 1] || 'this month';

  if (category === 'very_low') {
    if (baseUV < 2) {
      return `In ${monthName} at your latitude (~${Math.round(latitude)}°N), the sun angle is too low for significant vitamin D production, regardless of time spent outdoors.`;
    }
    return `Even though UV levels are moderate in ${monthName}, your effective sun exposure is very limited. Dietary or supplement sources are more important for you.`;
  }

  if (category === 'low') {
    return `Your effective UV exposure in ${monthName} is below what's typically needed for adequate vitamin D synthesis. This is common at higher latitudes or with limited outdoor time.`;
  }

  if (category === 'moderate') {
    return `Your UV exposure is moderate for ${monthName}. You're getting some vitamin D from sun, but it may not be sufficient depending on your other risk factors.`;
  }

  return `Your UV exposure suggests good potential for vitamin D synthesis through sunlight in ${monthName}. This is a positive factor for your vitamin D status.`;
}
