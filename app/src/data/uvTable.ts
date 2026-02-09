/**
 * Clear-sky UV index by latitude band and month.
 *
 * 10 latitude bands (25-70N in 5-degree increments) x 12 months.
 * Values represent approximate noon clear-sky UV index.
 * Source: Derived from EPA UV Index data and satellite observations.
 *
 * Used for counseling narrative and UV-based adjustments, NOT as a direct model input.
 */

/** Latitude band boundaries (degrees North) */
export const LATITUDE_BANDS = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70] as const;

/**
 * UV index table: rows = latitude bands, columns = months (Jan=0 .. Dec=11)
 * Values: approximate clear-sky noon UV index
 */
export const UV_TABLE: readonly (readonly number[])[] = [
  // 25°N (Miami, South Texas)
  [5.0, 6.5, 8.5, 10.0, 11.0, 11.5, 11.5, 11.0, 9.5, 7.5, 5.5, 4.5],
  // 30°N (Houston, Cairo)
  [4.0, 5.5, 7.5, 9.5, 10.5, 11.0, 11.0, 10.5, 8.5, 6.5, 4.5, 3.5],
  // 35°N (Los Angeles, Memphis)
  [3.0, 4.5, 6.5, 8.5, 10.0, 10.5, 10.5, 9.5, 7.5, 5.5, 3.5, 2.5],
  // 40°N (Denver, New York)
  [2.0, 3.5, 5.5, 7.5, 9.0, 10.0, 10.0, 9.0, 6.5, 4.5, 2.5, 1.5],
  // 45°N (Minneapolis, Portland OR)
  [1.5, 2.5, 4.5, 6.5, 8.0, 9.0, 9.0, 8.0, 5.5, 3.5, 2.0, 1.0],
  // 50°N (Winnipeg, Prague)
  [1.0, 2.0, 3.5, 5.5, 7.0, 8.0, 8.0, 7.0, 4.5, 2.5, 1.5, 0.5],
  // 55°N (Edmonton, Moscow)
  [0.5, 1.5, 3.0, 5.0, 6.5, 7.5, 7.0, 5.5, 3.5, 2.0, 1.0, 0.5],
  // 60°N (Anchorage, Helsinki)
  [0.0, 0.5, 2.0, 4.0, 5.5, 6.5, 6.0, 4.5, 2.5, 1.0, 0.5, 0.0],
  // 65°N (Fairbanks)
  [0.0, 0.5, 1.5, 3.0, 4.5, 5.5, 5.0, 3.5, 1.5, 0.5, 0.0, 0.0],
  // 70°N (Northern Alaska)
  [0.0, 0.0, 1.0, 2.5, 3.5, 4.5, 4.0, 2.5, 1.0, 0.0, 0.0, 0.0],
];

/**
 * Get the UV index for a given latitude and month.
 * Uses linear interpolation between latitude bands.
 *
 * @param latitude Latitude in degrees North (clamped to 25-70)
 * @param month Month (1-12)
 * @returns Estimated clear-sky noon UV index
 */
export function getBaseUvIndex(latitude: number, month: number): number {
  const lat = Math.max(25, Math.min(70, latitude));
  const monthIdx = Math.max(0, Math.min(11, month - 1));

  // Find surrounding latitude bands
  const bandIdx = LATITUDE_BANDS.findIndex(b => b >= lat);

  if (bandIdx === 0) {
    return UV_TABLE[0][monthIdx];
  }
  if (bandIdx === -1) {
    return UV_TABLE[UV_TABLE.length - 1][monthIdx];
  }

  // Linear interpolation
  const lowerBand = LATITUDE_BANDS[bandIdx - 1];
  const upperBand = LATITUDE_BANDS[bandIdx];
  const fraction = (lat - lowerBand) / (upperBand - lowerBand);

  const lowerUV = UV_TABLE[bandIdx - 1][monthIdx];
  const upperUV = UV_TABLE[bandIdx][monthIdx];

  return lowerUV + fraction * (upperUV - lowerUV);
}
