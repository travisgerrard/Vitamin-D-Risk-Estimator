/**
 * Mapping from Fitzpatrick skin tone scale to NHANES race/ethnicity encoding.
 *
 * IMPORTANT CAVEATS:
 * - Skin tone is NOT equivalent to race/ethnicity. This mapping is an approximation
 *   needed because the NHANES model was trained on self-reported race/ethnicity categories.
 * - Vitamin D synthesis is primarily affected by melanin content (correlates with skin tone),
 *   but NHANES race/ethnicity also captures dietary patterns, supplementation habits,
 *   and other cultural/behavioral factors.
 * - This is a pragmatic encoding, not a biological claim.
 * - Users should understand this limitation: the model uses population-level patterns
 *   that may not apply to their individual situation.
 *
 * Fitzpatrick Scale:
 *   1 - Very fair (always burns, never tans)
 *   2 - Fair (usually burns, tans minimally)
 *   3 - Medium (sometimes burns, tans uniformly)
 *   4 - Olive (rarely burns, tans easily)
 *   5 - Brown (very rarely burns, tans profusely)
 *   6 - Dark brown/Black (never burns, deeply pigmented)
 *
 * NHANES race_eth encoding:
 *   0 - Mexican American
 *   1 - Other Hispanic
 *   2 - Non-Hispanic White
 *   3 - Non-Hispanic Black
 *   4 - Other/Multi-racial
 */

export interface SkinToneEntry {
  fitzpatrick: number;
  label: string;
  description: string;
  raceEthEncoding: number;
  rationale: string;
}

export const SKIN_TONE_MAP: SkinToneEntry[] = [
  {
    fitzpatrick: 1,
    label: 'Very Fair',
    description: 'Always burns, never tans',
    raceEthEncoding: 2, // Non-Hispanic White
    rationale: 'Most common among Northern European populations in NHANES NHW category',
  },
  {
    fitzpatrick: 2,
    label: 'Fair',
    description: 'Usually burns, tans minimally',
    raceEthEncoding: 2, // Non-Hispanic White
    rationale: 'Common among European populations in NHANES NHW category',
  },
  {
    fitzpatrick: 3,
    label: 'Medium',
    description: 'Sometimes burns, tans uniformly',
    raceEthEncoding: 4, // Other/Multi-racial
    rationale: 'Broad category spanning multiple NHANES groups; Other/Multi is closest',
  },
  {
    fitzpatrick: 4,
    label: 'Olive',
    description: 'Rarely burns, tans easily',
    raceEthEncoding: 1, // Other Hispanic
    rationale: 'Common in Mediterranean, Middle Eastern, Latino populations',
  },
  {
    fitzpatrick: 5,
    label: 'Brown',
    description: 'Very rarely burns, tans profusely',
    raceEthEncoding: 4, // Other/Multi-racial
    rationale: 'Common in South Asian, Southeast Asian populations; Other/Multi in NHANES',
  },
  {
    fitzpatrick: 6,
    label: 'Dark Brown/Black',
    description: 'Never burns, deeply pigmented',
    raceEthEncoding: 3, // Non-Hispanic Black
    rationale: 'Most common among African-descent populations in NHANES NHB category',
  },
];

/** Get race_eth encoding from Fitzpatrick scale */
export function skinToneToRaceEth(fitzpatrick: number): number {
  const entry = SKIN_TONE_MAP.find(e => e.fitzpatrick === fitzpatrick);
  return entry?.raceEthEncoding ?? 4; // default to Other/Multi-racial
}
