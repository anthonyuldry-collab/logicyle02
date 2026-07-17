/** Rôle d’effectif : Équipe 1 (principal) vs Réserve. */

export type RosterRoleKey = 'principal' | 'reserve';

export function getRosterRole(item: { rosterRole?: string | null }): RosterRoleKey {
  return item.rosterRole === 'reserve' ? 'reserve' : 'principal';
}

export function isScoutLike(item: object): boolean {
  return 'status' in item && 'potentialRating' in item;
}

export const ROSTER_ROLE_LABELS: Record<RosterRoleKey, string> = {
  principal: 'Équipe 1',
  reserve: 'Réserve',
};

export type RosterGroupRow<T> =
  | { kind: 'header'; key: string; label: string; count: number; accent: 'blue' | 'amber' | 'green' }
  | { kind: 'item'; item: T };

/**
 * Scinde une liste triée en sections Équipe 1 → Réserve → Scouts.
 * Si un seul groupe d’athlètes est présent, pas d’en-tête athlètes (seulement scouts si besoin).
 */
export function buildRosterGroupedRows<T extends { id: string; rosterRole?: string | null }>(
  items: T[],
  opts?: { forceHeaders?: boolean },
): RosterGroupRow<T>[] {
  const riders = items.filter((i) => !isScoutLike(i));
  const scouts = items.filter((i) => isScoutLike(i));
  const principal = riders.filter((i) => getRosterRole(i) === 'principal');
  const reserve = riders.filter((i) => getRosterRole(i) === 'reserve');
  const showAthleteHeaders =
    Boolean(opts?.forceHeaders) || (principal.length > 0 && reserve.length > 0);

  const rows: RosterGroupRow<T>[] = [];

  const pushGroup = (
    key: string,
    label: string,
    accent: 'blue' | 'amber' | 'green',
    list: T[],
    withHeader: boolean,
  ) => {
    if (list.length === 0) return;
    if (withHeader) {
      rows.push({ kind: 'header', key, label, count: list.length, accent });
    }
    list.forEach((item) => rows.push({ kind: 'item', item }));
  };

  pushGroup('hdr-equipe1', ROSTER_ROLE_LABELS.principal, 'blue', principal, showAthleteHeaders);
  pushGroup('hdr-reserve', ROSTER_ROLE_LABELS.reserve, 'amber', reserve, showAthleteHeaders);
  pushGroup('hdr-scouts', 'Scouts', 'green', scouts, scouts.length > 0 && riders.length > 0);

  return rows;
}
