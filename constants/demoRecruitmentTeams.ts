import { Team, TeamLevel, TeamOperationalSettings } from '../types';

export const DEMO_RECRUITMENT_TEAM_ID_PREFIX = 'demo_recruit_';

export function isDemoRecruitmentTeam(teamId: string): boolean {
  return teamId.startsWith(DEMO_RECRUITMENT_TEAM_ID_PREFIX);
}

export interface DemoRecruitmentTeamExtra {
  pitch: string;
  recruitingLabel: string;
}

export const DEMO_RECRUITMENT_TEAM_EXTRAS: Record<string, DemoRecruitmentTeamExtra> = {
  demo_recruit_vc_lorient: {
    pitch:
      'Structure bretonne Open 2/3. Effectif de 12 coureurs, calendrier Bretagne & Pays de la Loire. Recherche renforts pour les classiques amateur.',
    recruitingLabel: 'Ouvert club & régional',
  },
  demo_recruit_stade_vernolien: {
    pitch:
      'Équipe jeunes U19–U23. Stages nationaux, critériums et préparation Tour de l’Avenir. Encadrement DS + préparateur.',
    recruitingLabel: 'Recrute jeunes & espoirs',
  },
  demo_recruit_arkea_conti: {
    pitch:
      'Équipe Continental féminine. Calendrier UCI Women’s WorldTour & ProSeries. Recherche profils Elite / Pro uniquement.',
    recruitingLabel: 'Elite & Pro',
  },
  demo_recruit_canyon_reserve: {
    pitch:
      'Réserve WorldTour. Détection et accompagnement vers l’élite internationale. Candidatures jeunes U19–U23 et Open 1.',
    recruitingLabel: 'Réserve / formation',
  },
  demo_recruit_closed_example: {
    pitch: 'Exemple d’équipe ayant fermé les candidatures spontanées (non visible dans le portail).',
    recruitingLabel: 'Candidatures fermées',
  },
};

const defaultOps = (patch: Partial<TeamOperationalSettings> = {}): TeamOperationalSettings => ({
  enabledChecklistRoles: [],
  acceptRiderApplications: true,
  ...patch,
});

/** Équipes fictives pour le portail « Chercher une équipe ». */
export const DEMO_RECRUITMENT_TEAMS: Team[] = [
  {
    id: 'demo_recruit_vc_lorient',
    name: 'VC Pays de Lorient (DEMO)',
    country: 'FR',
    level: TeamLevel.HORS_DN,
    teamKind: 'standard',
    gender: 'men',
    operationalSettings: defaultOps({ recruitmentTarget: 'regional_club', gender: 'men' }),
  },
  {
    id: 'demo_recruit_stade_vernolien',
    name: 'Stade Vernolien U23 (DEMO)',
    country: 'FR',
    level: TeamLevel.JEUNES,
    teamKind: 'espoirs',
    gender: 'men',
    operationalSettings: defaultOps({ recruitmentTarget: 'youth_u19', gender: 'men' }),
  },
  {
    id: 'demo_recruit_arkea_conti',
    name: 'Arkéa–B&B Hotels (DEMO)',
    country: 'FR',
    level: TeamLevel.PRO,
    teamKind: 'standard',
    gender: 'women',
    operationalSettings: defaultOps({ recruitmentTarget: 'pro_conti', gender: 'women' }),
  },
  {
    id: 'demo_recruit_canyon_reserve',
    name: 'Canyon–SRAM Réserve (DEMO)',
    country: 'DE',
    level: TeamLevel.PRO,
    teamKind: 'development',
    gender: 'women',
    operationalSettings: defaultOps({ recruitmentTarget: 'youth_u19', gender: 'women' }),
  },
];

export function buildDemoRecruitmentTeams(): Team[] {
  return DEMO_RECRUITMENT_TEAMS.map((team) => ({ ...team }));
}

export function getDemoRecruitmentTeamExtra(teamId: string): DemoRecruitmentTeamExtra | undefined {
  return DEMO_RECRUITMENT_TEAM_EXTRAS[teamId];
}
