/**
 * Points de mesure calibrés sur les images Gemini 1024×652.
 * Origine : coin haut-gauche (viewBox SVG = dimensions image).
 * Calibré manuellement sur tt-bike.png / road-bike.png (juillet 2026).
 */
export const BIKE_IMG_VB = { w: 1024, h: 652 } as const;

/** Vélo route — road-bike.png */
export const ROAD_POINTS = {
  rearAxle: { x: 105, y: 470 },
  frontAxle: { x: 789, y: 447 },
  BB: { x: 419, y: 496 },
  saddleTop: { x: 342, y: 118 },
  saddleNose: { x: 396, y: 168 },
  barCenter: { x: 704, y: 128 },
} as const;

/** Vélo CLM — tt-bike.png */
export const TT_POINTS = {
  rearAxle: { x: 105, y: 470 },
  frontAxle: { x: 789, y: 447 },
  BB: { x: 424, y: 510 },
  saddleNose: { x: 383, y: 166 },
  armrest: { x: 666, y: 241 },
  extTip: { x: 883, y: 172 },
  extHigh: { x: 871, y: 161 },
} as const;
