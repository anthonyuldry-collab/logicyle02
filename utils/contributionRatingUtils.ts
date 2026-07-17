/** Barème officiel : apport au résultat d'équipe (1–10 + absent). */

import {
  getPerformanceRatingBadgeClass,
  getPerformanceRatingLabel,
  PERFORMANCE_RATING_SCALES,
} from './performanceRatingScales';

export const CONTRIBUTION_RATING_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(PERFORMANCE_RATING_SCALES.contribution.levels).map(([k, v]) => [Number(k), v.label])
) as Record<number, string>;

export function getContributionRatingLabel(score: number | undefined | null): string {
  return getPerformanceRatingLabel('contribution', score);
}

export function getContributionRatingBadgeClass(score: number): string {
  return getPerformanceRatingBadgeClass(score);
}

export function normalizeLegacyScoreToTen(score: number | undefined): number | undefined {
  if (score == null || score <= 0) return undefined;
  if (score <= 5) return Math.min(10, score * 2);
  return Math.min(10, Math.round(score));
}

export {
  getPerformanceRatingLabel,
  getPerformanceRatingCriteria,
  getPerformanceRatingBadgeClass,
  getPerformanceRatingAccentRing,
} from './performanceRatingScales';
export type { PerformanceRatingScaleId } from './performanceRatingScales';
