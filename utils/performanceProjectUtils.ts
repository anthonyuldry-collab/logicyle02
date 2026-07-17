import {
  PerformanceActionItem,
  PerformanceFactorDetail,
  PerformanceProjectEntry,
  PerformanceProjectHistoryEntry,
  Rider,
} from '../types';
import { PERFORMANCE_PROJECT_FACTORS_CONFIG } from '../constants';

export const PERFORMANCE_FACTOR_KEYS = PERFORMANCE_PROJECT_FACTORS_CONFIG.map(c => c.id) as Array<
  keyof Pick<
    Rider,
    | 'physiquePerformanceProject'
    | 'techniquePerformanceProject'
    | 'mentalPerformanceProject'
    | 'environnementPerformanceProject'
    | 'tactiquePerformanceProject'
  >
>;

export const ACTION_STATUS_LABELS: Record<PerformanceActionItem['status'], string> = {
  planned: 'Planifié',
  in_progress: 'En cours',
  done: 'Terminé',
  cancelled: 'Annulé',
};

export const ACTION_STATUS_CLASSES: Record<PerformanceActionItem['status'], string> = {
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500 line-through',
};

export const ENTRY_STATUS_LABELS: Record<PerformanceProjectEntry['status'], string> = {
  active: 'En cours',
  achieved: 'Acquis / résolu',
};

export const ENTRY_STATUS_CLASSES: Record<PerformanceProjectEntry['status'], string> = {
  active: 'bg-emerald-100 text-emerald-800',
  achieved: 'bg-gray-100 text-gray-500 line-through',
};

export type PerformanceFieldKind = 'forces' | 'aOptimiser' | 'aDevelopper';

export const FIELD_KIND_CONFIG: Record<
  PerformanceFieldKind,
  { entriesKey: keyof PerformanceFactorDetail; legacyKey: keyof PerformanceFactorDetail; label: string; addLabel: string; showStatus: boolean }
> = {
  forces: {
    entriesKey: 'forcesEntries',
    legacyKey: 'forces',
    label: 'Forces',
    addLabel: 'Ajouter une force',
    showStatus: true,
  },
  aOptimiser: {
    entriesKey: 'aOptimiserEntries',
    legacyKey: 'aOptimiser',
    label: 'À optimiser',
    addLabel: 'Ajouter un axe d\'optimisation',
    showStatus: true,
  },
  aDevelopper: {
    entriesKey: 'aDevelopperEntries',
    legacyKey: 'aDevelopper',
    label: 'À développer',
    addLabel: 'Ajouter un objectif de développement',
    showStatus: true,
  },
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export function createPerformanceProjectEntry(content = '', targetDate?: string): PerformanceProjectEntry {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    content: content.trim(),
    targetDate: targetDate || undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function migrateTextToEntries(text?: string): PerformanceProjectEntry[] {
  if (!text?.trim()) return [];
  return text
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
    .map(line => createPerformanceProjectEntry(line));
}

export function getFactorFieldEntries(
  factor: PerformanceFactorDetail | undefined,
  kind: PerformanceFieldKind
): PerformanceProjectEntry[] {
  if (!factor) return [];
  const cfg = FIELD_KIND_CONFIG[kind];
  const entries = factor[cfg.entriesKey] as PerformanceProjectEntry[] | undefined;
  if (entries && entries.length > 0) return entries;
  const legacy = factor[cfg.legacyKey] as string | undefined;
  return migrateTextToEntries(legacy);
}

/** Synchronise les champs texte legacy à partir des entrées structurées */
export function syncFactorLegacyText(factor: PerformanceFactorDetail): PerformanceFactorDetail {
  const sync = (kind: PerformanceFieldKind) => {
    const entries = getFactorFieldEntries(factor, kind);
    const cfg = FIELD_KIND_CONFIG[kind];
    const activeText = entries
      .filter(e => e.status === 'active' && e.content.trim())
      .map(e => e.content.trim())
      .join('\n');
    return activeText || (factor[cfg.legacyKey] as string) || '';
  };

  return {
    ...factor,
    forces: sync('forces'),
    aOptimiser: sync('aOptimiser'),
    aDevelopper: sync('aDevelopper'),
    forcesEntries: getFactorFieldEntries(factor, 'forces'),
    aOptimiserEntries: getFactorFieldEntries(factor, 'aOptimiser'),
    aDevelopperEntries: getFactorFieldEntries(factor, 'aDevelopper'),
  };
}

export function syncRiderPerformanceProjectFields(rider: Rider): Rider {
  const synced = { ...rider };
  for (const key of PERFORMANCE_FACTOR_KEYS) {
    synced[key] = syncFactorLegacyText(rider[key]);
  }
  return synced;
}

export function createPerformanceActionItem(
  title: string,
  targetDate?: string
): PerformanceActionItem {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: title.trim(),
    targetDate: targetDate || undefined,
    status: 'planned',
    createdAt: now,
    updatedAt: now,
  };
}

/** Convertit les lignes legacy de besoinsActions en items sans date */
export function migrateBesoinsActionsToItems(factor: PerformanceFactorDetail | undefined): PerformanceActionItem[] {
  if (!factor) return [];
  if (factor.actionItems && factor.actionItems.length > 0) return factor.actionItems;
  if (!factor.besoinsActions?.trim()) return [];

  return factor.besoinsActions
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
    .map(line => createPerformanceActionItem(line));
}

export function getFactorActionItems(factor: PerformanceFactorDetail | undefined): PerformanceActionItem[] {
  return migrateBesoinsActionsToItems(factor);
}

export function countActionItemsByStatus(items: PerformanceActionItem[]) {
  return {
    planned: items.filter(i => i.status === 'planned').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    done: items.filter(i => i.status === 'done').length,
    cancelled: items.filter(i => i.status === 'cancelled').length,
  };
}

export function getAllRiderActionItems(rider: Rider): PerformanceActionItem[] {
  return PERFORMANCE_FACTOR_KEYS.flatMap(key => getFactorActionItems(rider[key]));
}

function snapshotFactors(rider: Rider): Partial<Record<string, PerformanceFactorDetail>> {
  return Object.fromEntries(
    PERFORMANCE_FACTOR_KEYS.map(key => [key, structuredClone(rider[key])])
  );
}

function projectChanged(previous: Rider, updated: Rider): boolean {
  if ((previous.performanceGoals || '') !== (updated.performanceGoals || '')) return true;
  return PERFORMANCE_FACTOR_KEYS.some(
    key => JSON.stringify(previous[key]) !== JSON.stringify(updated[key])
  );
}

/** Ajoute une entrée d'historique si le projet a changé */
export function withPerformanceProjectHistory(previous: Rider, updated: Rider): Rider {
  const syncedUpdated = syncRiderPerformanceProjectFields(updated);
  if (!projectChanged(previous, syncedUpdated)) return syncedUpdated;

  const entry: PerformanceProjectHistoryEntry = {
    id: generateId(),
    savedAt: new Date().toISOString(),
    label: 'Mise à jour du projet de formation',
    performanceGoals: syncedUpdated.performanceGoals,
    factors: snapshotFactors(syncedUpdated),
  };

  const history = syncedUpdated.performanceProjectHistory ?? [];
  return {
    ...syncedUpdated,
    performanceProjectHistory: [entry, ...history].slice(0, 50),
  };
}

export function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isActionOverdue(item: PerformanceActionItem): boolean {
  if (!item.targetDate || item.status === 'done' || item.status === 'cancelled') return false;
  const today = new Date().toISOString().slice(0, 10);
  return item.targetDate < today;
}

export function formatTargetDate(date?: string): string {
  if (!date) return '—';
  return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function summarizeHistoryEntry(entry: PerformanceProjectHistoryEntry): string {
  let activeEntries = 0;
  let achievedEntries = 0;
  let actionsTotal = 0;
  let actionsDone = 0;

  for (const key of PERFORMANCE_FACTOR_KEYS) {
    const factor = entry.factors[key];
    if (!factor) continue;
    (['forces', 'aOptimiser', 'aDevelopper'] as PerformanceFieldKind[]).forEach(kind => {
      getFactorFieldEntries(factor, kind).forEach(e => {
        if (e.status === 'achieved') achievedEntries += 1;
        else activeEntries += 1;
      });
    });
    const items = getFactorActionItems(factor);
    actionsTotal += items.length;
    actionsDone += items.filter(i => i.status === 'done').length;
  }

  const parts: string[] = [];
  if (activeEntries + achievedEntries > 0) {
    parts.push(`${activeEntries} point(s) actif(s), ${achievedEntries} acquis`);
  }
  if (actionsTotal > 0) {
    parts.push(`${actionsDone}/${actionsTotal} action(s) terminée(s)`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Mise à jour enregistrée';
}

export function getFieldHistoryTimeline(
  history: PerformanceProjectHistoryEntry[],
  factorKey: string,
  kind: PerformanceFieldKind
): { savedAt: string; entries: PerformanceProjectEntry[] }[] {
  return history
    .map(entry => ({
      savedAt: entry.savedAt,
      entries: getFactorFieldEntries(entry.factors[factorKey], kind),
    }))
    .filter(h => h.entries.length > 0);
}
