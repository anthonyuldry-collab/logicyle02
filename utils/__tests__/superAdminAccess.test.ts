import { describe, expect, it } from 'vitest';
import { HOLDING_SUPER_ADMIN_EMAIL, SUPER_ADMIN_EMAILS } from '../../constants';

describe('Super Admin — accès unique', () => {
  it('n’autorise qu’un seul email plateforme', () => {
    expect(SUPER_ADMIN_EMAILS).toHaveLength(1);
    expect(SUPER_ADMIN_EMAILS[0]).toBe('anthony.uldry@hotmail.fr');
    expect(HOLDING_SUPER_ADMIN_EMAIL).toBe(SUPER_ADMIN_EMAILS[0]);
  });

  it('n’inclut plus le compte équipe Lanester', () => {
    expect(
      SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase().includes('lanester')),
    ).toBe(false);
  });
});
