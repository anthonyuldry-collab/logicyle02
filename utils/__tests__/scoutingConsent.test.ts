import { describe, expect, it } from 'vitest';
import {
  ScoutingDataScope,
  ScoutingRequestStatus,
  ProspectLevel,
  type ScoutingRequest,
  type User,
  UserRole,
  TeamRole,
} from '../../types';
import {
  buildScoutingConsentProof,
  canAthleteConsentToScouting,
  hasScoutingScopeAccess,
  isActiveScoutingConsent,
} from '../scoutingProspectUtils';

function makeRequest(overrides: Partial<ScoutingRequest> = {}): ScoutingRequest {
  return {
    id: 'req1',
    requesterTeamId: 'team1',
    athleteId: 'athlete1',
    status: ScoutingRequestStatus.ACCEPTED,
    requestDate: '2026-08-01T10:00:00.000Z',
    prospectLevel: ProspectLevel.CONTACT_REQUEST,
    grantedScopes: [ScoutingDataScope.COORDINATION],
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'athlete1',
    email: 'a@test.com',
    firstName: 'A',
    lastName: 'B',
    permissionRole: TeamRole.VIEWER,
    userRole: UserRole.COUREUR,
    signupInfo: { birthDate: '2000-01-01' },
    ...overrides,
  };
}

describe('scouting consent proof', () => {
  it('buildScoutingConsentProof horodate, versionne et snapshot la notice', () => {
    const proof = buildScoutingConsentProof({
      grantedScopes: [ScoutingDataScope.COORDINATION, ScoutingDataScope.PERFORMANCE_DATA],
      teamName: 'Team X',
      language: 'fr',
    });
    expect(proof.grantedScopes).toHaveLength(2);
    expect(proof.consentMethod).toBe('in_app_scope_selection');
    expect(proof.consentPrivacyVersion).toBe('2026-08.1');
    expect(proof.consentNoticeVersion).toContain('scouting');
    expect(proof.consentNoticeSnapshot).toContain('Team X');
    expect(proof.consentNoticeSnapshot).toContain('art. 9');
    expect(proof.consentNoticeAcknowledged).toBe(true);
    expect(proof.consentRecordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('isActiveScoutingConsent ignore un consentement retiré', () => {
    expect(isActiveScoutingConsent(makeRequest())).toBe(true);
    expect(
      isActiveScoutingConsent(
        makeRequest({
          status: ScoutingRequestStatus.WITHDRAWN,
          consentWithdrawnAt: '2026-08-01T12:00:00.000Z',
          grantedScopes: [],
        }),
      ),
    ).toBe(false);
  });

  it('hasScoutingScopeAccess coupe l’accès après retrait', () => {
    const active = [makeRequest()];
    expect(hasScoutingScopeAccess('athlete1', active, ScoutingDataScope.COORDINATION)).toBe(true);
    expect(hasScoutingScopeAccess('athlete1', active, ScoutingDataScope.PERFORMANCE_DATA)).toBe(
      false,
    );

    const withdrawn = [
      makeRequest({
        status: ScoutingRequestStatus.WITHDRAWN,
        consentWithdrawnAt: '2026-08-01T12:00:00.000Z',
        grantedScopes: [],
      }),
    ];
    expect(hasScoutingScopeAccess('athlete1', withdrawn, ScoutingDataScope.COORDINATION)).toBe(
      false,
    );
  });

  it('bloque le consentement mineur sans autorisation parentale', () => {
    const minor = makeUser({ signupInfo: { birthDate: '2012-05-01' } });
    expect(canAthleteConsentToScouting(minor).ok).toBe(false);

    const minorWithParental = makeUser({
      signupInfo: { birthDate: '2012-05-01' },
      gdprConsent: {
        termsAcceptedAt: '2026-01-01',
        termsVersion: 'x',
        privacyPolicyAcceptedAt: '2026-01-01',
        privacyPolicyVersion: 'x',
        parentalConsentAcceptedAt: '2026-01-01',
      },
    });
    expect(canAthleteConsentToScouting(minorWithParental).ok).toBe(true);

    const adult = makeUser({ signupInfo: { birthDate: '1998-01-01' } });
    expect(canAthleteConsentToScouting(adult).ok).toBe(true);
  });
});
