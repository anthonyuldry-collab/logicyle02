import { ChecklistRole, TeamLevel } from '../types';
import type { FichePosteStructureLevel } from './fichePosteCatalog';

export interface TeamOperationalPreset {
  label: string;
  description: string;
  enabledChecklistRoles: ChecklistRole[];
  ficheProfile: FichePosteStructureLevel | 'auto';
  optionalRoles: ChecklistRole[];
  optionalRoleHints: Partial<Record<ChecklistRole, string>>;
}

const CORE_ROLES: ChecklistRole[] = [
  ChecklistRole.DS,
  ChecklistRole.ASSISTANT,
  ChecklistRole.COUREUR,
];

const ALL_ROLES = Object.values(ChecklistRole);

export const TEAM_OPERATIONAL_PRESETS: Record<TeamLevel, TeamOperationalPreset> = {
  [TeamLevel.JEUNES]: {
    label: 'Formation / jeunes',
    description:
      'Encadrement, entraînement et logistique légère. Santé activable selon le dispositif.',
    enabledChecklistRoles: [
      ...CORE_ROLES,
      ChecklistRole.ENTRAINEUR,
    ],
    ficheProfile: 'club',
    optionalRoles: [
      ChecklistRole.MECANO,
      ChecklistRole.KINE,
      ChecklistRole.MEDECIN,
      ChecklistRole.MANAGER,
      ChecklistRole.COMMUNICATION,
    ],
    optionalRoleHints: {
      [ChecklistRole.MECANO]: 'Si le club gère son parc vélo',
      [ChecklistRole.KINE]: 'Stages longs ou calendrier dense',
      [ChecklistRole.MEDECIN]: 'Si médecin référent sur les courses',
      [ChecklistRole.MANAGER]: 'Rarement nécessaire en structure jeunes',
      [ChecklistRole.COMMUNICATION]: 'Communication dédiée uniquement',
    },
  },
  [TeamLevel.HORS_DN]: {
    label: 'Club amateur / comité',
    description:
      'DS, assistant, entraîneur et coureurs. Mécano et santé selon organisation.',
    enabledChecklistRoles: [
      ...CORE_ROLES,
      ChecklistRole.MECANO,
      ChecklistRole.ENTRAINEUR,
    ],
    ficheProfile: 'club',
    optionalRoles: [ChecklistRole.KINE, ChecklistRole.MEDECIN, ChecklistRole.MANAGER, ChecklistRole.COMMUNICATION],
    optionalRoleHints: {
      [ChecklistRole.KINE]: 'Recommandé si staff santé identifié',
      [ChecklistRole.MEDECIN]: 'Courses fédérales ou déplacements longs',
      [ChecklistRole.MANAGER]: 'Structure avec bureau et budget',
      [ChecklistRole.COMMUNICATION]: 'Réseaux sociaux / partenaires locaux',
    },
  },
  [TeamLevel.FEDERATION]: {
    label: 'Fédération / programme national',
    description: 'Dispositif complet incluant staff santé et encadrement performance.',
    enabledChecklistRoles: ALL_ROLES,
    ficheProfile: 'competition',
    optionalRoles: [],
    optionalRoleHints: {},
  },
  [TeamLevel.N1]: {
    label: 'Élite N1',
    description: 'Division Nationale 1 — calendrier fédéral + UCI (ProSeries, Classe 1/2).',
    enabledChecklistRoles: ALL_ROLES,
    ficheProfile: 'competition',
    optionalRoles: [],
    optionalRoleHints: {},
  },
  [TeamLevel.N2]: {
    label: 'Élite N2',
    description: 'Division Nationale 2 — calendrier fédéral + invitations UCI selon niveau.',
    enabledChecklistRoles: ALL_ROLES,
    ficheProfile: 'competition',
    optionalRoles: [],
    optionalRoleHints: {},
  },
  [TeamLevel.N3]: {
    label: 'Élite N3 (hommes)',
    description: 'Division Nationale 3 hommes — calendrier fédéral national.',
    enabledChecklistRoles: ALL_ROLES,
    ficheProfile: 'competition',
    optionalRoles: [],
    optionalRoleHints: {},
  },
  [TeamLevel.N1_N3]: {
    label: 'Élite amateur / DN (legacy)',
    description: 'Ancien niveau regroupé N1–N3 — préférer N1, N2 ou N3.',
    enabledChecklistRoles: ALL_ROLES,
    ficheProfile: 'competition',
    optionalRoles: [],
    optionalRoleHints: {},
  },
  [TeamLevel.PRO]: {
    label: 'Professionnel',
    description: 'Protocole complet UCI, santé, performance et communication.',
    enabledChecklistRoles: ALL_ROLES,
    ficheProfile: 'pro',
    optionalRoles: [],
    optionalRoleHints: {},
  },
};

export const TEAM_FICHE_PROFILE_OPTIONS: { value: TeamOperationalPreset['ficheProfile']; label: string }[] = [
  { value: 'auto', label: 'Automatique (selon niveau structure)' },
  { value: 'club', label: 'Club / régional' },
  { value: 'competition', label: 'National (N1–N3)' },
  { value: 'pro', label: 'Professionnel (DN / WT)' },
];

export const TEAM_EVENT_FOCUS_OPTIONS: { value: 'auto' | 'mixed' | 'stage' | 'competition'; label: string; hint: string }[] = [
  { value: 'auto', label: 'Automatique (selon calendrier)', hint: 'Analyse les prochains événements stage vs compétition' },
  { value: 'mixed', label: 'Mixte', hint: 'Fiches stage et compétition' },
  { value: 'stage', label: 'Priorité stage', hint: 'Stages, camps et sorties longues' },
  { value: 'competition', label: 'Priorité compétition', hint: 'Courses et épreuves ponctuelles' },
];
