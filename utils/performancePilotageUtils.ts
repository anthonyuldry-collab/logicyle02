import { Rider } from '../types';
import { PERFORMANCE_PROJECT_FACTORS_CONFIG } from '../constants';
import {
  FIELD_KIND_CONFIG,
  PERFORMANCE_FACTOR_KEYS,
  PerformanceFieldKind,
  countActionItemsByStatus,
  getAllRiderActionItems,
  getFactorFieldEntries,
  isActionOverdue,
} from './performanceProjectUtils';

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'et', 'ou', 'un', 'une', 'avec', 'dans', 'pour', 'sur', 'par',
  'a', 'est', 'sont', 'etre', 'avoir', 'faire', 'fait', 'plus', 'moins', 'tres', 'bien', 'aussi',
  'cette', 'ces', 'aux', 'ses', 'son', 'sa', 'nos', 'vos', 'leur', 'donc', 'mais', 'car', 'que',
  'qui', 'quoi', 'dont', 'ou', 'the', 'and', 'for', 'with', 'from',
]);

export const DOMAIN_META = PERFORMANCE_PROJECT_FACTORS_CONFIG.map((c) => ({
  key: c.id as (typeof PERFORMANCE_FACTOR_KEYS)[number],
  label: c.label,
}));

const THEME_RULES: Array<{ theme: string; patterns: RegExp[] }> = [
  { theme: 'Endurance', patterns: [/endurance/, /resistance/, /aerobie/, /volume/] },
  { theme: 'Force / PMA', patterns: [/force/, /pma/, /puissance/, /seuil/, /ftp/, /\bcp\b/] },
  { theme: 'Vitesse / Sprint', patterns: [/vitesse/, /sprint/, /explosiv/, /anaerob/] },
  { theme: 'Technique', patterns: [/technique/, /geste/, /position/, /pedal/, /descente/] },
  { theme: 'Mental', patterns: [/mental/, /confiance/, /stress/, /concentration/, /motivation/] },
  { theme: 'Tactique', patterns: [/tactique/, /strateg/, /course/, /peloton/, /placement/] },
  { theme: 'Recuperation', patterns: [/recup/, /recovery/, /sommeil/, /fatigue/] },
  { theme: 'Nutrition', patterns: [/nutri/, /aliment/, /hydrat/] },
  { theme: 'Competition', patterns: [/competit/, /calendrier/] },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

/** Texte projet : entrees structurees + actions + legacy. */
export function collectRiderProjectTexts(rider: Rider): string[] {
  const texts: string[] = [];
  if (rider.performanceGoals?.trim()) texts.push(rider.performanceGoals);

  PERFORMANCE_FACTOR_KEYS.forEach((key) => {
    const factor = rider[key];
    if (!factor) return;
    (Object.keys(FIELD_KIND_CONFIG) as PerformanceFieldKind[]).forEach((kind) => {
      getFactorFieldEntries(factor, kind).forEach((entry) => {
        if (entry.content?.trim()) texts.push(entry.content);
      });
    });
    ['forces', 'aOptimiser', 'aDevelopper', 'besoinsActions'].forEach((field) => {
      const value = (factor as unknown as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim()) texts.push(value);
    });
  });

  getAllRiderActionItems(rider).forEach((item) => {
    if (item.title?.trim()) texts.push(item.title);
  });

  return texts;
}

export function extractRiderKeywords(rider: Rider): string[] {
  const keywords = new Set<string>();
  collectRiderProjectTexts(rider).forEach((text) => {
    tokenize(text).forEach((word) => keywords.add(word));
  });
  return Array.from(keywords);
}

export function extractRiderThemes(rider: Rider): string[] {
  const blob = collectRiderProjectTexts(rider)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!blob.trim()) return [];
  return THEME_RULES.filter(({ patterns }) => patterns.some((re) => re.test(blob))).map(
    (r) => r.theme
  );
}

export function riderHasProjectContent(rider: Rider): boolean {
  return collectRiderProjectTexts(rider).some((t) => t.trim().length > 0);
}

export function riderDomainCoverage(rider: Rider): Record<string, boolean> {
  const coverage: Record<string, boolean> = {};
  DOMAIN_META.forEach(({ key, label }) => {
    const factor = rider[key];
    if (!factor) {
      coverage[label] = false;
      return;
    }
    const hasEntries = (Object.keys(FIELD_KIND_CONFIG) as PerformanceFieldKind[]).some((kind) =>
      getFactorFieldEntries(factor, kind).some((e) => e.content.trim())
    );
    const hasActions =
      (factor.actionItems && factor.actionItems.length > 0) ||
      Boolean(factor.besoinsActions?.trim());
    coverage[label] = hasEntries || hasActions;
  });
  return coverage;
}

export function commonKeywords(a: string[], b: string[]): string[] {
  const common: string[] = [];
  a.forEach((kw1) => {
    b.forEach((kw2) => {
      if (kw1 === kw2 || kw1.includes(kw2) || kw2.includes(kw1)) {
        const pick = kw1.length >= kw2.length ? kw1 : kw2;
        if (!common.some((c) => c === pick || c.includes(pick) || pick.includes(c))) {
          common.push(pick);
        }
      }
    });
  });
  return common;
}

export interface ProjectPilotageStats {
  riderCount: number;
  withGoals: number;
  withContent: number;
  contentCoveragePct: number;
  actionTotals: ReturnType<typeof countActionItemsByStatus>;
  overdueActions: number;
  openActions: number;
  profileDistribution: Array<{ profile: string; count: number }>;
  domainCoverage: Array<{ label: string; filled: number; pct: number }>;
  topThemes: Array<{ theme: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  ridersNeedingAttention: Rider[];
}

export function computeProjectPilotageStats(riders: Rider[]): ProjectPilotageStats {
  const allActions = riders.flatMap((r) => getAllRiderActionItems(r));
  const actionTotals = countActionItemsByStatus(allActions);
  const overdueActions = allActions.filter(isActionOverdue).length;
  const openActions = actionTotals.planned + actionTotals.in_progress;

  const withGoals = riders.filter((r) => Boolean(r.performanceGoals?.trim())).length;
  const withContent = riders.filter(riderHasProjectContent).length;

  const profileMap = new Map<string, number>();
  riders.forEach((r) => {
    const profile = r.qualitativeProfile || 'Non renseigne';
    profileMap.set(profile, (profileMap.get(profile) || 0) + 1);
  });

  const domainCoverage = DOMAIN_META.map(({ label, key }) => {
    const filled = riders.filter((r) => {
      const factor = r[key];
      if (!factor) return false;
      const hasEntries = (Object.keys(FIELD_KIND_CONFIG) as PerformanceFieldKind[]).some((kind) =>
        getFactorFieldEntries(factor, kind).some((e) => e.content.trim())
      );
      const hasActions =
        (factor.actionItems && factor.actionItems.length > 0) ||
        Boolean(factor.besoinsActions?.trim());
      return hasEntries || hasActions;
    }).length;
    return {
      label,
      filled,
      pct: riders.length ? Math.round((filled / riders.length) * 100) : 0,
    };
  });

  const themeMap = new Map<string, number>();
  riders.forEach((r) => {
    extractRiderThemes(r).forEach((theme) => {
      themeMap.set(theme, (themeMap.get(theme) || 0) + 1);
    });
  });

  const keywordMap = new Map<string, number>();
  riders.forEach((r) => {
    extractRiderKeywords(r).forEach((kw) => {
      keywordMap.set(kw, (keywordMap.get(kw) || 0) + 1);
    });
  });

  const ridersNeedingAttention = riders.filter((r) => {
    const actions = getAllRiderActionItems(r);
    return (
      !riderHasProjectContent(r) ||
      actions.some(isActionOverdue) ||
      (!r.performanceGoals?.trim() && actions.length === 0)
    );
  });

  return {
    riderCount: riders.length,
    withGoals,
    withContent,
    contentCoveragePct: riders.length ? Math.round((withContent / riders.length) * 100) : 0,
    actionTotals,
    overdueActions,
    openActions,
    profileDistribution: Array.from(profileMap.entries())
      .map(([profile, count]) => ({ profile, count }))
      .sort((a, b) => b.count - a.count),
    domainCoverage,
    topThemes: Array.from(themeMap.entries())
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topKeywords: Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .filter((x) => x.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    ridersNeedingAttention: ridersNeedingAttention.slice(0, 12),
  };
}
