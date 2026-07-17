import { TeamSponsorshipNeed } from '../types';

export const DEMO_TEAM_SPONSORSHIP_NEEDS: TeamSponsorshipNeed[] = [
  {
    id: 'demo_need_continental',
    teamId: 'demo_team_continental',
    teamName: 'Team Continental Demo',
    title: 'Naming maillot principal — saison 2027',
    description:
      'Équipe UCI Continental (15 coureurs). Recherche partenaire naming pour maillot, véhicule DS et contenus réseaux sociaux (12 posts/mois).',
    budgetMinEur: 25000,
    budgetMaxEur: 60000,
    objectives: 'Visibilité nationale, activation réseaux, présence événements',
    disciplines: ['Route', 'Classiques'],
    isOpen: true,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'demo_need_femmes',
    teamId: 'demo_team_femmes',
    teamName: 'Équipe Féminine Elite',
    title: 'Partenaire équipementier & co-branding',
    description:
      'Structure féminine Elite. Package visibilité : maillot manche, casques, bidons personnalisés, 4 newsletters/an.',
    budgetMinEur: 15000,
    budgetMaxEur: 40000,
    objectives: 'Co-branding produit, contenus femmes, événements partenaires',
    disciplines: ['Route', 'Critérium'],
    isOpen: true,
    createdAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'demo_need_development',
    teamId: 'demo_team_dev',
    teamName: 'Development Team U23',
    title: 'Sponsor local régional — visibilité territoire',
    description:
      'Équipe développement U23. Partenariat territorial : logo maillot dos, panneaux arrivée, soirée partenaires (2/an).',
    budgetMinEur: 8000,
    budgetMaxEur: 20000,
    objectives: 'Ancrage local, RH marque employeur, événementiel',
    disciplines: ['Route'],
    isOpen: true,
    createdAt: '2026-03-10T10:00:00.000Z',
  },
];

export function isDemoSponsorshipNeed(id: string): boolean {
  return id.startsWith('demo_need_');
}
