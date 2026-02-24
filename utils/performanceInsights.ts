/**
 * Détection et alertes intelligentes pour le pôle performances.
 * Compare les valeurs aux moyennes d'équipe/catégorie et au profil qualitatif.
 * Évolutif : les seuils et règles peuvent être ajustés au fil des données.
 */

import type { Rider, ScoutingProfile, PowerProfile } from '../types';
import { RiderQualitativeProfile, Sex } from '../types';
import { getAgeCategory } from './ageUtils';

// Clés de durée alignées avec PowerAnalysisTable
export const POWER_DURATION_KEYS = ['1s', '5s', '30s', '1min', '3min', '5min', '12min', '20min', 'cp'] as const;
export type PowerDurationKey = typeof POWER_DURATION_KEYS[number];

const DURATION_TO_FIELD: Record<PowerDurationKey, keyof PowerProfile> = {
  '1s': 'power1s',
  '5s': 'power5s',
  '30s': 'power30s',
  '1min': 'power1min',
  '3min': 'power3min',
  '5min': 'power5min',
  '12min': 'power12min',
  '20min': 'power20min',
  cp: 'criticalPower',
};

export type InsightSeverity = 'positive' | 'warning' | 'info' | 'neutral';

export type FatigueLevel = '15kj' | '30kj' | '45kj';

export interface PerformanceInsight {
  id: string;
  type: 'above_team_avg' | 'below_team_avg' | 'above_category_avg' | 'profile_highlight' | 'profile_mismatch' | 'scout_match' | 'fatigue_regression' | 'fatigue_resistance';
  severity: InsightSeverity;
  title: string;
  description: string;
  /** ID du rider ou du scouting profile */
  subjectId: string;
  subjectName: string;
  subjectType: 'rider' | 'scout';
  /** Durée concernée (ex: '5min', 'cp') */
  durationKey?: PowerDurationKey;
  /** Valeur affichée (ex: "6.2 W/kg") */
  valueLabel?: string;
  /** Pourcentage au-dessus de la référence (ex: 12) */
  percentAboveRef?: number;
  /** Pourcentage en dessous de la moyenne équipe (ex: 12 pour −12%) */
  percentBelowRef?: number;
  /** Moyenne équipe pour affichage "(moy. équipe X)" */
  teamRefValue?: number;
  /** Unité pour teamRefValue (ex: 'W/kg', 'W', '%') */
  teamRefUnit?: string;
  /** Catégorie d'âge si pertinent */
  category?: string;
  /** Profil de fatigue concerné (15kj, 30kj, 45kj) pour régression / résistance */
  fatigueLevel?: FatigueLevel;
  /** Pourcentage de régression vs PPR frais (ex: -12) */
  percentRegressionVsFresh?: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'missing_power' | 'profile_mismatch' | 'low_vs_profile' | 'scout_above_team' | 'fatigue_regression' | 'fatigue_data_missing' | 'above_team_avg' | 'below_team_avg';
  severity: 'info' | 'warning' | 'positive';
  title: string;
  message: string;
  subjectId: string;
  subjectName: string;
  subjectType: 'rider' | 'scout';
  actionHint?: string;
  /** Profil de fatigue concerné */
  fatigueLevel?: FatigueLevel;
  /** Pourcentage de régression vs PPR frais */
  percentRegressionVsFresh?: number;
  /** +X% ou −X% par rapport à l'équipe */
  percentVsTeam?: number;
  /** Moyenne équipe pour affichage "(moy. équipe X)" */
  teamRefValue?: number;
  teamRefUnit?: string;
  durationKey?: PowerDurationKey;
  /** Valeur actuelle du coureur (ex. "8.7 W/kg") pour affichage dans le tableau */
  valueLabel?: string;
}

// Seuils configurables (à affiner avec les données d'équipe)
export const INSIGHT_THRESHOLDS = {
  /** Pourcentage au-dessus de la moyenne pour considérer une valeur "intéressante" */
  ABOVE_AVG_PERCENT: 8,
  /** Pourcentage en dessous de la moyenne équipe pour alerte négative */
  BELOW_AVG_PERCENT: 8,
  /** Pourcentage au-dessus de la moyenne équipe pour un scout (alerte positive) */
  SCOUT_ABOVE_TEAM_PERCENT: 5,
  /** Écart en % entre une durée "profil" et la moyenne du coureur pour détecter incohérence */
  PROFILE_MISMATCH_PERCENT: 15,
  /** Régression sous fatigue vs PPR frais : au-delà de ce %, alerte (ex: 10 = alerte si baisse > 10 %) */
  REGRESSION_VS_FRESH_PERCENT: 10,
  /** Résistance à la fatigue : régression inférieure à ce % = insight positif (ex: 5 = bien maintenu si baisse < 5 %) */
  GOOD_RESISTANCE_PERCENT: 5,
};

const FATIGUE_LABELS: Record<FatigueLevel, string> = {
  '15kj': '15 kJ/kg',
  '30kj': '30 kJ/kg',
  '45kj': '45 kJ/kg',
};

type ItemWithPower = Rider | ScoutingProfile;

function getPowerProfile(item: ItemWithPower, fatigue: 'fresh' | '15kj' | '30kj' | '45kj' = 'fresh'): PowerProfile | undefined {
  if ('powerProfileFresh' in item) {
    switch (fatigue) {
      case 'fresh': return item.powerProfileFresh;
      case '15kj': return item.powerProfile15KJ;
      case '30kj': return item.powerProfile30KJ;
      case '45kj': return item.powerProfile45KJ;
      default: return item.powerProfileFresh;
    }
  }
  return item.powerProfileFresh;
}

function getPowerValue(
  item: ItemWithPower,
  durationKey: PowerDurationKey,
  mode: 'watts' | 'wattsPerKg',
  fatigue: 'fresh' | '15kj' | '30kj' | '45kj' = 'fresh'
): number {
  const profile = getPowerProfile(item, fatigue);
  if (!profile) return 0;
  const field = DURATION_TO_FIELD[durationKey];
  const raw = (profile as Record<string, number>)[field as string] ?? 0;
  if (mode === 'watts') return raw;
  const weight = item.weightKg ?? 70;
  return weight > 0 ? raw / weight : 0;
}

function getDisplayName(item: ItemWithPower): string {
  return `${item.firstName} ${item.lastName}`;
}

function getItemId(item: ItemWithPower): string {
  return item.id;
}

/** Vérifie qu'un profil de fatigue a au moins une valeur renseignée (on ne considère pas les profils vides) */
function hasMeaningfulFatigueProfile(rider: Rider, fatigue: '15kj' | '30kj' | '45kj'): boolean {
  const profile = getPowerProfile(rider, fatigue);
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as Record<string, number | undefined>;
  for (const key of POWER_DURATION_KEYS) {
    const field = DURATION_TO_FIELD[key];
    const v = p[field as string];
    if (typeof v === 'number' && v > 0) return true;
  }
  return false;
}

/** Pour les moyennes : ne garder que les riders qui ont au moins une valeur pour ce profil */
function hasMeaningfulProfile(item: ItemWithPower, fatigue: 'fresh' | '15kj' | '30kj' | '45kj'): boolean {
  const profile = getPowerProfile(item, fatigue);
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as Record<string, number | undefined>;
  for (const key of POWER_DURATION_KEYS) {
    const field = DURATION_TO_FIELD[key];
    const v = p[field as string];
    if (typeof v === 'number' && v > 0) return true;
  }
  return false;
}

/** Moyennes par groupe (équipe, catégorie, sexe) pour chaque durée */
export interface GroupAverages {
  byDuration: Partial<Record<PowerDurationKey, number>>;
  byCategory: Record<string, Partial<Record<PowerDurationKey, number>>>;
  bySex: Record<string, Partial<Record<PowerDurationKey, number>>>;
  team: Partial<Record<PowerDurationKey, number>>;
  sampleCount: number;
}

export function computeGroupAverages(
  riders: Rider[],
  mode: 'watts' | 'wattsPerKg' = 'wattsPerKg',
  fatigue: 'fresh' | '15kj' | '30kj' | '45kj' = 'fresh'
): GroupAverages {
  const withPower = riders.filter(r => hasMeaningfulProfile(r, fatigue));
  const byDuration: Partial<Record<PowerDurationKey, number>> = {};
  const byCategory: Record<string, Partial<Record<PowerDurationKey, number>>> = {};
  const bySex: Record<string, Partial<Record<PowerDurationKey, number>>> = {};

  for (const key of POWER_DURATION_KEYS) {
    const values = withPower.map(r => getPowerValue(r, key, mode, fatigue)).filter(v => v > 0);
    if (values.length > 0) {
      byDuration[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    for (const rider of withPower) {
      const { category } = getAgeCategory(rider.birthDate);
      const sexKey = rider.sex ?? 'unknown';
      if (!byCategory[category]) byCategory[category] = {};
      if (!bySex[sexKey]) bySex[sexKey] = {};
      const v = getPowerValue(rider, key, mode, fatigue);
      if (v > 0) {
        const catVals = (byCategory[category][key] ?? 0) as number;
        const catCount = (byCategory[category] as Record<string, number>)[`_count_${key}`] ?? 0;
        (byCategory[category] as Record<string, number>)[`_count_${key}`] = catCount + 1;
        (byCategory[category] as Record<string, number>)[key] = catVals + v;
        const sexVals = (bySex[sexKey][key] ?? 0) as number;
        const sexCount = (bySex[sexKey] as Record<string, number>)[`_count_${key}`] ?? 0;
        (bySex[sexKey] as Record<string, number>)[`_count_${key}`] = sexCount + 1;
        (bySex[sexKey] as Record<string, number>)[key] = sexVals + v;
      }
    }
  }

  // Normaliser byCategory et bySex (moyenne = sum / count)
  for (const cat of Object.keys(byCategory)) {
    const o = byCategory[cat] as Record<string, number>;
    for (const key of POWER_DURATION_KEYS) {
      const count = o[`_count_${key}`] ?? 0;
      if (count > 0 && typeof o[key] === 'number') {
        o[key] = o[key] / count;
      }
      delete o[`_count_${key}`];
    }
  }
  for (const sex of Object.keys(bySex)) {
    const o = bySex[sex] as Record<string, number>;
    for (const key of POWER_DURATION_KEYS) {
      const count = o[`_count_${key}`] ?? 0;
      if (count > 0 && typeof o[key] === 'number') {
        o[key] = o[key] / count;
      }
      delete o[`_count_${key}`];
    }
  }

  return {
    byDuration,
    byCategory,
    bySex,
    team: byDuration,
    sampleCount: withPower.length,
  };
}

/** Profil qualitatif -> durées "attendues" élevées (pour cohérence) */
const PROFILE_TO_STRONG_DURATIONS: Partial<Record<RiderQualitativeProfile, PowerDurationKey[]>> = {
  [RiderQualitativeProfile.SPRINTEUR]: ['1s', '5s', '30s'],
  [RiderQualitativeProfile.GRIMPEUR]: ['5min', '12min', '20min', 'cp'],
  [RiderQualitativeProfile.ROULEUR]: ['20min', 'cp', '12min'],
  [RiderQualitativeProfile.PUNCHEUR]: ['1min', '3min', '5min', '30s'],
  [RiderQualitativeProfile.CLASSIQUE]: ['5min', '20min', '30s'],
  [RiderQualitativeProfile.BAROUDEUR_PROFIL]: ['20min', 'cp', '5min'],
  [RiderQualitativeProfile.COMPLET]: ['1s', '5min', '20min', 'cp'],
};

function getQualitativeProfile(item: ItemWithPower): RiderQualitativeProfile | undefined {
  if ('qualitativeProfile' in item) return (item as Rider).qualitativeProfile;
  return (item as ScoutingProfile).qualitativeProfile;
}

/** Durées prioritaires pour analyser la régression sous fatigue (vs PPR de base) */
const FATIGUE_CRITICAL_DURATIONS: PowerDurationKey[] = ['cp', '20min', '5min', '12min', '1min'];

/** Détecte les régressions sous fatigue vs PPR frais et la résistance à la fatigue (riders uniquement) */
function getFatigueRegressionInsights(
  riders: Rider[],
  mode: 'watts' | 'wattsPerKg' = 'wattsPerKg'
): PerformanceInsight[] {
  const out: PerformanceInsight[] = [];
  const regressionThreshold = INSIGHT_THRESHOLDS.REGRESSION_VS_FRESH_PERCENT / 100;
  const goodResistanceThreshold = INSIGHT_THRESHOLDS.GOOD_RESISTANCE_PERCENT / 100;
  const teamAvg = computeGroupAverages(riders, mode, 'fresh');
  const teamRefUnit = mode === 'watts' ? 'W' : 'W/kg';

  for (const rider of riders) {
    const freshProfile = getPowerProfile(rider, 'fresh');
    if (!freshProfile) continue;

    for (const fatigueLevel of (['15kj', '30kj', '45kj'] as const)) {
      if (!hasMeaningfulFatigueProfile(rider, fatigueLevel)) continue;

      const label = FATIGUE_LABELS[fatigueLevel];
      let maxRegression = 0;
      let maxRegressionDuration: PowerDurationKey | undefined;
      let maxRegressionFatiguedVal = 0;
      let avgRegression = 0;
      let countWithValue = 0;

      for (const durationKey of FATIGUE_CRITICAL_DURATIONS) {
        const freshVal = getPowerValue(rider, durationKey, mode, 'fresh');
        const fatiguedVal = getPowerValue(rider, durationKey, mode, fatigueLevel);
        if (freshVal <= 0 || fatiguedVal <= 0) continue;
        const regression = (freshVal - fatiguedVal) / freshVal;
        if (regression > maxRegression) {
          maxRegression = regression;
          maxRegressionDuration = durationKey;
          maxRegressionFatiguedVal = fatiguedVal;
        }
        avgRegression += regression;
        countWithValue += 1;
      }

      if (countWithValue === 0) continue;
      avgRegression /= countWithValue;

      if (maxRegression >= regressionThreshold) {
        const percentReg = Math.round(maxRegression * 100);
        const teamRef = maxRegressionDuration ? teamAvg.team[maxRegressionDuration] : undefined;
        const teamDisplay = teamRef != null ? (mode === 'watts' ? Math.round(teamRef) : teamRef.toFixed(1)) : '';
        const valueLabel = mode === 'watts' ? `${Math.round(maxRegressionFatiguedVal)} W` : `${maxRegressionFatiguedVal.toFixed(1)} W/kg`;
        out.push({
          id: `fatigue-regression-${rider.id}-${fatigueLevel}`,
          type: 'fatigue_regression',
          severity: 'warning',
          title: `Régression sous fatigue (${label}) vs PPR de base`,
          description: `${getDisplayName(rider)} : baisse jusqu'à ${percentReg}% sur ${maxRegressionDuration ?? 'puissance'} au profil ${label} kJ/kg par rapport au PPR frais.${teamDisplay ? ` (moy. équipe ${teamDisplay} ${teamRefUnit} sur ${maxRegressionDuration})` : ''}`,
          subjectId: rider.id,
          subjectName: getDisplayName(rider),
          subjectType: 'rider',
          durationKey: maxRegressionDuration,
          fatigueLevel,
          percentRegressionVsFresh: -percentReg,
          teamRefValue: teamRef,
          teamRefUnit: teamRef != null ? teamRefUnit : undefined,
          valueLabel,
        });
      } else if (maxRegression <= goodResistanceThreshold && maxRegression >= 0) {
        out.push({
          id: `fatigue-resistance-${rider.id}-${fatigueLevel}`,
          type: 'fatigue_resistance',
          severity: 'positive',
          title: `Bonne résistance à la fatigue (${label})`,
          description: `${getDisplayName(rider)} maintient bien la puissance au profil ${label} par rapport au PPR frais.`,
          subjectId: rider.id,
          subjectName: getDisplayName(rider),
          subjectType: 'rider',
          fatigueLevel,
          percentRegressionVsFresh: Math.round(maxRegression * 100),
        });
      }
    }
  }

  return out;
}

/** Détecte les valeurs "intéressantes" (au-dessus des moyennes) et les incohérences profil */
export function getPerformanceInsights(
  riders: Rider[],
  scoutingProfiles: ScoutingProfile[],
  options: { mode?: 'watts' | 'wattsPerKg'; fatigue?: 'fresh' | '15kj' | '30kj' | '45kj' } = {}
): PerformanceInsight[] {
  const { mode = 'wattsPerKg', fatigue = 'fresh' } = options;
  const insights: PerformanceInsight[] = [];
  const avg = computeGroupAverages(riders, mode, fatigue);
  const thresholdAbove = INSIGHT_THRESHOLDS.ABOVE_AVG_PERCENT;
  const thresholdBelow = INSIGHT_THRESHOLDS.BELOW_AVG_PERCENT;
  const teamRefUnit = mode === 'watts' ? 'W' : 'W/kg';

  const checkRider = (item: ItemWithPower, subjectType: 'rider' | 'scout') => {
    const profile = getPowerProfile(item, fatigue);
    if (!profile) return;
    const category = getAgeCategory(item.birthDate).category;
    const teamAvg = avg.team;
    const catAvg = avg.byCategory[category];

    for (const durationKey of POWER_DURATION_KEYS) {
      const value = getPowerValue(item, durationKey, mode, fatigue);
      if (value <= 0) continue;
      const teamRef = teamAvg[durationKey];
      const catRef = catAvg?.[durationKey];
      if (teamRef && value >= teamRef * (1 + thresholdAbove / 100)) {
        const percentAbove = Math.round(((value - teamRef) / teamRef) * 100);
        const valueLabel = mode === 'watts' ? `${Math.round(value)} W` : `${value.toFixed(1)} W/kg`;
        const teamDisplay = mode === 'watts' ? Math.round(teamRef) : teamRef.toFixed(1);
        insights.push({
          id: `above-team-${getItemId(item)}-${durationKey}`,
          type: 'above_team_avg',
          severity: 'positive',
          title: `Au-dessus de la moyenne équipe`,
          description: `${getDisplayName(item)} : ${durationKey} +${percentAbove}% (moy. équipe ${teamDisplay} ${teamRefUnit}) par rapport à l'équipe`,
          subjectId: getItemId(item),
          subjectName: getDisplayName(item),
          subjectType,
          durationKey,
          valueLabel,
          percentAboveRef: percentAbove,
          teamRefValue: teamRef,
          teamRefUnit,
          category,
        });
      }
      if (teamRef && value <= teamRef * (1 - thresholdBelow / 100)) {
        const percentBelow = Math.round(((teamRef - value) / teamRef) * 100);
        const valueLabel = mode === 'watts' ? `${Math.round(value)} W` : `${value.toFixed(1)} W/kg`;
        const teamDisplay = mode === 'watts' ? Math.round(teamRef) : teamRef.toFixed(1);
        insights.push({
          id: `below-team-${getItemId(item)}-${durationKey}`,
          type: 'below_team_avg',
          severity: 'warning',
          title: `En dessous de la moyenne équipe`,
          description: `${getDisplayName(item)} : ${durationKey} −${percentBelow}% (moy. équipe ${teamDisplay} ${teamRefUnit}) par rapport à l'équipe`,
          subjectId: getItemId(item),
          subjectName: getDisplayName(item),
          subjectType,
          durationKey,
          valueLabel,
          percentBelowRef: percentBelow,
          teamRefValue: teamRef,
          teamRefUnit,
          category,
        });
      }
      if (catRef && value >= catRef * (1 + thresholdAbove / 100) && category !== 'N/A') {
        const percentAbove = Math.round(((value - catRef) / catRef) * 100);
        const valueLabel = mode === 'watts' ? `${Math.round(value)} W` : `${value.toFixed(1)} W/kg`;
        insights.push({
          id: `above-cat-${getItemId(item)}-${durationKey}`,
          type: 'above_category_avg',
          severity: 'positive',
          title: `Au-dessus de la moyenne ${category}`,
          description: `${getDisplayName(item)} : ${durationKey} à ${valueLabel} (+${percentAbove}% vs ${category})`,
          subjectId: getItemId(item),
          subjectName: getDisplayName(item),
          subjectType,
          durationKey,
          valueLabel,
          percentAboveRef: percentAbove,
          category,
        });
      }
    }

    const qualProfile = getQualitativeProfile(item);
    const strongDurations = qualProfile ? PROFILE_TO_STRONG_DURATIONS[qualProfile] : [];
    if (strongDurations && strongDurations.length > 0) {
      const cp = getPowerValue(item, 'cp', mode, fatigue);
      if (cp > 0) {
        for (const d of strongDurations) {
          const v = getPowerValue(item, d, mode, fatigue);
          if (v <= 0) continue;
          const ratio = v / cp;
          const teamRatio = teamAvg[d] && teamAvg.cp ? (teamAvg[d]! / teamAvg.cp!) : null;
          if (teamRatio != null && ratio < teamRatio * (1 - INSIGHT_THRESHOLDS.PROFILE_MISMATCH_PERCENT / 100)) {
            insights.push({
              id: `mismatch-${getItemId(item)}-${d}`,
              type: 'profile_mismatch',
              severity: 'warning',
              title: `Profil ${qualProfile} : ${d} faible`,
              description: `${getDisplayName(item)} a un profil ${qualProfile} mais ${d} est en retrait par rapport à la référence équipe.`,
              subjectId: getItemId(item),
              subjectName: getDisplayName(item),
              subjectType,
              durationKey: d,
              category,
            });
          }
        }
      }
    }
  };

  // Valeurs intéressantes : uniquement réserve (vs équipe) et recrues (scouts), pas l'équipe principale filles
  riders.filter(r => r.rosterRole === 'reserve').forEach(r => checkRider(r, 'rider'));

  // Profils de fatigue : régressions vs PPR de base (exclut filles équipe principale)
  const ridersForFatigue = riders.filter(r => r.sex !== Sex.FEMALE || r.rosterRole === 'reserve');
  const fatigueInsights = getFatigueRegressionInsights(ridersForFatigue, mode);
  insights.push(...fatigueInsights);

  for (const scout of scoutingProfiles) {
    if (!getPowerProfile(scout)) continue;
    checkRider(scout, 'scout');
    for (const durationKey of POWER_DURATION_KEYS) {
      const teamRef = avg.team[durationKey];
      const value = getPowerValue(scout, durationKey, mode, fatigue);
      if (teamRef && value > 0 && value >= teamRef * (1 + INSIGHT_THRESHOLDS.SCOUT_ABOVE_TEAM_PERCENT / 100)) {
        const percentAbove = Math.round(((value - teamRef) / teamRef) * 100);
        const teamDisplay = mode === 'watts' ? Math.round(teamRef) : teamRef.toFixed(1);
        insights.push({
          id: `scout-match-${scout.id}-${durationKey}`,
          type: 'scout_match',
          severity: 'positive',
          title: `Scout au niveau équipe`,
          description: `${getDisplayName(scout)} : ${durationKey} +${percentAbove}% (moy. équipe ${teamDisplay} ${teamRefUnit}) par rapport à l'équipe`,
          subjectId: scout.id,
          subjectName: getDisplayName(scout),
          subjectType: 'scout',
          durationKey,
          valueLabel: mode === 'watts' ? `${Math.round(value)} W` : `${value.toFixed(1)} W/kg`,
          percentAboveRef: percentAbove,
          teamRefValue: teamRef,
          teamRefUnit,
        });
      }
    }
  }

  return insights;
}

/** Alertes (données manquantes, incohérences, opportunités) */
export function getPerformanceAlerts(
  riders: Rider[],
  scoutingProfiles: ScoutingProfile[]
): PerformanceAlert[] {
  const alerts: PerformanceAlert[] = [];
  const avg = computeGroupAverages(riders, 'wattsPerKg', 'fresh');

  const shouldIncludeRiderAlert = (rider: Rider) =>
    rider.sex !== Sex.FEMALE || rider.rosterRole === 'reserve';

  for (const rider of riders) {
    if (!shouldIncludeRiderAlert(rider)) continue;
    if (!getPowerProfile(rider) || !(rider.powerProfileFresh?.criticalPower)) {
      alerts.push({
        id: `missing-power-${rider.id}`,
        type: 'missing_power',
        severity: 'info',
        title: 'Profil puissance incomplet',
        message: `${getDisplayName(rider)} n'a pas de courbe de puissance renseignée.`,
        subjectId: rider.id,
        subjectName: getDisplayName(rider),
        subjectType: 'rider',
        actionHint: 'Renseigner les PPR dans la fiche coureur',
      });
    }
    // Alerte : PPR frais renseigné mais aucun profil de fatigue renseigné (on ne compte que les profils avec au moins une valeur)
    const hasFresh = hasMeaningfulProfile(rider, 'fresh');
    const hasAnyFatigue = hasMeaningfulFatigueProfile(rider, '15kj') || hasMeaningfulFatigueProfile(rider, '30kj') || hasMeaningfulFatigueProfile(rider, '45kj');
    if (hasFresh && !hasAnyFatigue) {
      alerts.push({
        id: `fatigue-data-missing-${rider.id}`,
        type: 'fatigue_data_missing',
        severity: 'info',
        title: 'Profils de fatigue manquants',
        message: `${getDisplayName(rider)} a un PPR frais mais pas de courbes 15/30/45 kJ/kg. Les régressions sous fatigue ne peuvent pas être analysées.`,
        subjectId: rider.id,
        subjectName: getDisplayName(rider),
        subjectType: 'rider',
        actionHint: 'Renseigner les PPR fatigue dans la fiche coureur (PowerPPR)',
      });
    }
  }

  const insights = getPerformanceInsights(riders, scoutingProfiles);
  const riderIdsToInclude = new Set(riders.filter(shouldIncludeRiderAlert).map(r => r.id));
  for (const i of insights) {
    if (i.subjectType === 'rider' && !riderIdsToInclude.has(i.subjectId)) continue;
    if (i.type === 'profile_mismatch') {
      alerts.push({
        id: `alert-${i.id}`,
        type: 'profile_mismatch',
        severity: 'warning',
        title: i.title,
        message: i.description,
        subjectId: i.subjectId,
        subjectName: i.subjectName,
        subjectType: i.subjectType,
        actionHint: 'Vérifier le profil qualitatif ou les données puissance',
      });
    }
    if (i.type === 'fatigue_regression') {
      alerts.push({
        id: `alert-${i.id}`,
        type: 'fatigue_regression',
        severity: 'warning',
        title: i.title,
        message: i.description,
        subjectId: i.subjectId,
        subjectName: i.subjectName,
        subjectType: i.subjectType,
        actionHint: 'Travailler la résistance à la fatigue ; vérifier les PPR fatigue (15/30/45 kJ/kg)',
        fatigueLevel: i.fatigueLevel,
        percentRegressionVsFresh: i.percentRegressionVsFresh,
        teamRefValue: i.teamRefValue,
        teamRefUnit: i.teamRefUnit,
        valueLabel: i.valueLabel,
        durationKey: i.durationKey,
        percentVsTeam: i.percentRegressionVsFresh != null ? -Math.abs(i.percentRegressionVsFresh) : undefined,
      });
    }
    if (i.type === 'above_team_avg' && i.percentAboveRef != null) {
      alerts.push({
        id: `alert-${i.id}`,
        type: 'above_team_avg',
        severity: 'positive',
        title: i.title,
        message: i.description,
        subjectId: i.subjectId,
        subjectName: i.subjectName,
        subjectType: i.subjectType,
        percentVsTeam: i.percentAboveRef,
        teamRefValue: i.teamRefValue,
        teamRefUnit: i.teamRefUnit,
        durationKey: i.durationKey,
        valueLabel: i.valueLabel,
      });
    }
    if (i.type === 'below_team_avg' && i.percentBelowRef != null) {
      alerts.push({
        id: `alert-${i.id}`,
        type: 'below_team_avg',
        severity: 'warning',
        title: i.title,
        message: i.description,
        subjectId: i.subjectId,
        subjectName: i.subjectName,
        subjectType: i.subjectType,
        percentVsTeam: -i.percentBelowRef,
        teamRefValue: i.teamRefValue,
        teamRefUnit: i.teamRefUnit,
        durationKey: i.durationKey,
        valueLabel: i.valueLabel,
      });
    }
  }

  for (const scout of scoutingProfiles) {
    if (!getPowerProfile(scout)) continue;
    for (const durationKey of POWER_DURATION_KEYS) {
      const teamRef = avg.team[durationKey];
      const value = getPowerValue(scout, durationKey, 'wattsPerKg', 'fresh');
      if (teamRef && value >= teamRef * (1 + INSIGHT_THRESHOLDS.SCOUT_ABOVE_TEAM_PERCENT / 100)) {
        const teamDisplay = teamRef % 1 !== 0 ? teamRef.toFixed(1) : String(teamRef);
        const valueLabel = value % 1 !== 0 ? `${value.toFixed(1)} W/kg` : `${value} W/kg`;
        alerts.push({
          id: `scout-above-${scout.id}-${durationKey}`,
          type: 'scout_above_team',
          severity: 'positive',
          title: 'Talent scout au niveau équipe',
          message: `${getDisplayName(scout)} dépasse la moyenne équipe sur ${durationKey} (moy. équipe ${teamDisplay} W/kg).`,
          subjectId: scout.id,
          subjectName: getDisplayName(scout),
          subjectType: 'scout',
          actionHint: 'À suivre pour recrutement',
          teamRefValue: teamRef,
          teamRefUnit: 'W/kg',
          durationKey,
          valueLabel,
        });
        break;
      }
    }
  }

  return alerts;
}

/** Puissance du coureur en W/kg pour une durée et un profil de fatigue (pour sous-onglet Analyse PPR) */
export function getRiderPowerWkg(
  rider: Rider,
  durationKey: PowerDurationKey,
  fatigue: 'fresh' | '15kj' | '30kj' | '45kj' = 'fresh'
): number {
  return getPowerValue(rider, durationKey, 'wattsPerKg', fatigue);
}

/** Puissance du coureur en watts bruts pour une durée et un profil de fatigue (pour sous-onglet Analyse PPR) */
export function getRiderPowerWatts(
  rider: Rider,
  durationKey: PowerDurationKey,
  fatigue: 'fresh' | '15kj' | '30kj' | '45kj' = 'fresh'
): number {
  return getPowerValue(rider, durationKey, 'watts', fatigue);
}

/** Pour une cellule du tableau : indique si la valeur est "intéressante" (au-dessus de la ref) */
export function getCellInsight(
  item: ItemWithPower,
  durationKey: PowerDurationKey,
  groupAverages: GroupAverages,
  mode: 'watts' | 'wattsPerKg',
  fatigue: 'fresh' | '15kj' | '30kj' | '45kj' = 'fresh'
): { aboveTeam: boolean; aboveCategory: boolean; percentAboveTeam?: number; percentAboveCategory?: number } {
  const value = getPowerValue(item, durationKey, mode, fatigue);
  if (value <= 0) return { aboveTeam: false, aboveCategory: false };
  const teamRef = groupAverages.team[durationKey];
  const category = getAgeCategory(item.birthDate).category;
  const catRef = groupAverages.byCategory[category]?.[durationKey];
  const threshold = INSIGHT_THRESHOLDS.ABOVE_AVG_PERCENT / 100;
  const aboveTeam = !!teamRef && value >= teamRef * (1 + threshold);
  const aboveCategory = !!catRef && value >= catRef * (1 + threshold);
  const percentAboveTeam = teamRef ? Math.round(((value - teamRef) / teamRef) * 100) : undefined;
  const percentAboveCategory = catRef ? Math.round(((value - catRef) / catRef) * 100) : undefined;
  return { aboveTeam, aboveCategory, percentAboveTeam, percentAboveCategory };
}
