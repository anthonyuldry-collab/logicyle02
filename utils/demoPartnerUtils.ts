import { IncomeItem, PartnerAccess, PartnerNewsletter, User } from '../types';
import {
  DEMO_PARTNER_EMAIL,
  DEMO_PARTNER_INCOME_ID,
  DEMO_PARTNER_NEWSLETTER_ID,
  buildDemoPartnerIncome,
  buildDemoPartnerNewsletter,
  isDemoPartnerIncome,
  isDemoPartnerNewsletter,
} from '../constants/demoPartnerPortal';
import { buildPartnerAccessFromIncome } from './partnerAccessUtils';

export interface DemoPartnerInstallResult {
  income: IncomeItem;
  newsletter: PartnerNewsletter;
  access: PartnerAccess | null;
  partnerUserFound: boolean;
}

export function mergeDemoPartnerIncome(
  existing: IncomeItem[],
  teamName?: string,
  language: 'fr' | 'en' = 'fr',
): IncomeItem[] {
  if (existing.some((i) => isDemoPartnerIncome(i.id))) return existing;
  return [...existing, buildDemoPartnerIncome({ teamName, language })];
}

export function mergeDemoPartnerNewsletter(
  existing: PartnerNewsletter[],
  teamId: string,
  teamName: string,
  language: 'fr' | 'en' = 'fr',
): PartnerNewsletter[] {
  if (existing.some((n) => isDemoPartnerNewsletter(n.id))) return existing;
  return [...existing, buildDemoPartnerNewsletter({ teamId, teamName, language })];
}

export function buildDemoPartnerAccess(params: {
  income: IncomeItem;
  teamId: string;
  partnerUser: User;
  grantedByUserId?: string;
}): PartnerAccess | null {
  return buildPartnerAccessFromIncome(
    params.income,
    params.partnerUser.id,
    params.teamId,
    params.grantedByUserId,
  );
}

export function findDemoPartnerUser(users: User[]): User | undefined {
  const normalized = DEMO_PARTNER_EMAIL.trim().toLowerCase();
  return users.find((u) => u.email?.trim().toLowerCase() === normalized);
}

export function prepareDemoPartnerInstall(params: {
  teamId: string;
  teamName: string;
  language?: 'fr' | 'en';
  users?: User[];
  grantedByUserId?: string;
}): DemoPartnerInstallResult {
  const language = params.language ?? 'fr';
  const income = buildDemoPartnerIncome({ teamName: params.teamName, language });
  const newsletter = buildDemoPartnerNewsletter({
    teamId: params.teamId,
    teamName: params.teamName,
    language,
  });
  const partnerUser = findDemoPartnerUser(params.users ?? []);
  const access = partnerUser
    ? buildDemoPartnerAccess({
        income,
        teamId: params.teamId,
        partnerUser,
        grantedByUserId: params.grantedByUserId,
      })
    : null;
  return {
    income,
    newsletter,
    access,
    partnerUserFound: !!partnerUser,
  };
}

export function getDemoPartnerIncomeId(): string {
  return DEMO_PARTNER_INCOME_ID;
}

export function getDemoPartnerNewsletterId(): string {
  return DEMO_PARTNER_NEWSLETTER_ID;
}
