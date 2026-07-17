import { describe, expect, it } from 'vitest';
import { TeamLevel } from '../../types';
import {
  canRiderApplyToTeam,
  canTeamScoutRider,
  getAllowedRiderSegments,
  getRecruitmentTargetsForTeam,
  getTeamMarketContext,
  resolveRiderMarketSegment,
  teamAcceptsRiderApplications,
} from '../riderTeamMarketSegment';

describe('resolveRiderMarketSegment', () => {
  it('classe un coureur Open 3', () => {
    expect(resolveRiderMarketSegment({ levelCategory: 'Open 3' })).toBe('open3');
  });

  it('classe un jeune U19', () => {
    const birthDate = `${new Date().getFullYear() - 17}-06-01`;
    expect(resolveRiderMarketSegment({ birthDate })).toBe('youth');
  });
});

describe('segmentation WorldTour', () => {
  const wtCtx = getTeamMarketContext({
    id: 'wt',
    name: 'WT Team',
    country: 'FR',
    level: TeamLevel.PRO,
    teamKind: 'worldtour',
  });

  it('autorise uniquement pro et elite', () => {
    const allowed = getAllowedRiderSegments(wtCtx);
    expect(allowed.has('pro')).toBe(true);
    expect(allowed.has('elite')).toBe(true);
    expect(allowed.has('open1')).toBe(false);
    expect(allowed.has('open3')).toBe(false);
    expect(allowed.has('regional')).toBe(false);
  });

  it('refuse qu’un Open 1 postule', () => {
    expect(
      canRiderApplyToTeam('open1', {
        id: 'wt',
        name: 'WT',
        country: 'FR',
        level: TeamLevel.PRO,
        teamKind: 'worldtour',
      }),
    ).toBe(false);
  });

  it('refuse qu’un Open 3 postule', () => {
    expect(canRiderApplyToTeam('open3', { id: 'wt', name: 'WT', country: 'FR', level: TeamLevel.PRO, teamKind: 'worldtour' })).toBe(false);
  });
});

describe('segmentation Continental / Pro', () => {
  const contiCtx = getTeamMarketContext({
    id: 'conti',
    name: 'Continental Team',
    country: 'FR',
    level: TeamLevel.PRO,
    teamKind: 'standard',
  });

  it('autorise uniquement pro et elite', () => {
    const allowed = getAllowedRiderSegments(contiCtx);
    expect(allowed.has('pro')).toBe(true);
    expect(allowed.has('elite')).toBe(true);
    expect(allowed.has('open1')).toBe(false);
    expect(allowed.has('open2')).toBe(false);
  });
});

describe('segmentation réserve / espoirs', () => {
  const reserveCtx = getTeamMarketContext({
    id: 'dev',
    name: 'Réserve',
    country: 'FR',
    level: TeamLevel.PRO,
    teamKind: 'development',
  });

  it('peut voir les jeunes U19', () => {
    expect(canTeamScoutRider(reserveCtx, 'youth')).toBe(true);
  });

  it('ne voit pas le club régional', () => {
    expect(canTeamScoutRider(reserveCtx, 'regional')).toBe(false);
  });
});

describe('cible de recrutement', () => {
  it('limite les options pour une WorldTour', () => {
    const ctx = getTeamMarketContext({
      id: 'wt',
      name: 'WT',
      country: 'FR',
      level: TeamLevel.PRO,
      teamKind: 'worldtour',
    });
    const options = getRecruitmentTargetsForTeam(ctx);
    expect(options).toContain('pro_conti');
    expect(options).not.toContain('elite_n1');
    expect(options).not.toContain('regional_club');
  });

  it('filtre selon la cible choisie', () => {
    const ctx = getTeamMarketContext(
      { id: 'wt', name: 'WT', country: 'FR', level: TeamLevel.PRO, teamKind: 'worldtour' },
      { recruitmentTarget: 'youth_u19', enabledChecklistRoles: [] },
    );
    expect(canTeamScoutRider(ctx, 'youth')).toBe(false);
    expect(canTeamScoutRider(ctx, 'elite')).toBe(false);
  });
});

describe('candidatures portail équipe', () => {
  it('accepte par défaut les candidatures', () => {
    expect(teamAcceptsRiderApplications({ id: 't', name: 'Team', country: 'FR', level: TeamLevel.N1_N3 })).toBe(true);
  });

  it('refuse si l’équipe a désactivé les candidatures', () => {
    const team = {
      id: 't',
      name: 'Team',
      country: 'FR',
      level: TeamLevel.N1_N3,
      operationalSettings: { acceptRiderApplications: false, enabledChecklistRoles: [] },
    };
    expect(teamAcceptsRiderApplications(team, team.operationalSettings)).toBe(false);
    expect(canRiderApplyToTeam('elite', team, team.operationalSettings)).toBe(false);
  });
});
