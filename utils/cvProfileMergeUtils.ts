import {
  EducationOrCertification,
  LanguageProficiency,
  SpokenLanguage,
  StaffMember,
  WorkExperience,
} from '../types';

export type CvExtractedProfile = Pick<
  StaffMember,
  | 'skills'
  | 'certifications'
  | 'professionalSummary'
  | 'experienceYears'
  | 'workHistory'
  | 'education'
  | 'languages'
>;

const PROFICIENCY_VALUES = new Set<string>(Object.values(LanguageProficiency));

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((raw) => {
    const value = normalizeSkill(raw);
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value);
  });
  return result;
}

function mergeStringLists(existing: string[] | undefined, incoming: string[] | undefined): string[] {
  return uniqueStrings([...(existing || []), ...(incoming || [])]);
}

function mapProficiency(raw: unknown): LanguageProficiency {
  if (typeof raw !== 'string') return LanguageProficiency.INTERMEDIATE;
  const trimmed = raw.trim();
  if (PROFICIENCY_VALUES.has(trimmed)) return trimmed as LanguageProficiency;
  const lower = trimmed.toLowerCase();
  if (lower.includes('natif') || lower.includes('native') || lower.includes('maternelle')) {
    return LanguageProficiency.NATIVE;
  }
  if (lower.includes('courant') || lower.includes('fluent') || lower.includes('bilingue')) {
    return LanguageProficiency.FLUENT;
  }
  if (lower.includes('avanc') || lower.includes('advanced') || lower.includes('c1') || lower.includes('c2')) {
    return LanguageProficiency.ADVANCED;
  }
  if (lower.includes('inter') || lower.includes('b1') || lower.includes('b2')) {
    return LanguageProficiency.INTERMEDIATE;
  }
  if (lower.includes('basic') || lower.includes('basique') || lower.includes('a1') || lower.includes('a2')) {
    return LanguageProficiency.BASIC;
  }
  return LanguageProficiency.INTERMEDIATE;
}

function sanitizeWorkHistory(raw: unknown): WorkExperience[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): WorkExperience | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const position = typeof row.position === 'string' ? row.position.trim() : '';
      const company = typeof row.company === 'string' ? row.company.trim() : '';
      if (!position || !company) return null;
      return {
        id: typeof row.id === 'string' && row.id ? row.id : newId('work'),
        position,
        company,
        startDate: typeof row.startDate === 'string' ? row.startDate : undefined,
        endDate: typeof row.endDate === 'string' ? row.endDate : undefined,
        description: typeof row.description === 'string' ? row.description : undefined,
      };
    })
    .filter((item): item is WorkExperience => item != null)
    .slice(0, 12);
}

function sanitizeEducation(raw: unknown): EducationOrCertification[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): EducationOrCertification | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const degree = typeof row.degree === 'string' ? row.degree.trim() : '';
      const institution = typeof row.institution === 'string' ? row.institution.trim() : '';
      if (!degree || !institution) return null;
      const yearRaw = row.year;
      const year =
        typeof yearRaw === 'number'
          ? yearRaw
          : typeof yearRaw === 'string' && yearRaw.trim()
            ? Number(yearRaw)
            : undefined;
      return {
        id: typeof row.id === 'string' && row.id ? row.id : newId('edu'),
        degree,
        institution,
        year: Number.isFinite(year) ? year : undefined,
        startDate: typeof row.startDate === 'string' ? row.startDate : undefined,
        endDate: typeof row.endDate === 'string' ? row.endDate : undefined,
        description: typeof row.description === 'string' ? row.description : undefined,
      };
    })
    .filter((item): item is EducationOrCertification => item != null)
    .slice(0, 10);
}

function sanitizeLanguages(raw: unknown): SpokenLanguage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): SpokenLanguage | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const language = typeof row.language === 'string' ? row.language.trim() : '';
      if (!language) return null;
      return {
        id: typeof row.id === 'string' && row.id ? row.id : newId('lang'),
        language,
        proficiency: mapProficiency(row.proficiency),
      };
    })
    .filter((item): item is SpokenLanguage => item != null)
    .slice(0, 12);
}

export function sanitizeCvExtractedProfile(raw: unknown): CvExtractedProfile {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const skills = Array.isArray(data.skills)
    ? uniqueStrings(data.skills.filter((s): s is string => typeof s === 'string'))
    : [];
  const certifications = Array.isArray(data.certifications)
    ? uniqueStrings(data.certifications.filter((s): s is string => typeof s === 'string'))
    : [];
  const professionalSummary =
    typeof data.professionalSummary === 'string' && data.professionalSummary.trim()
      ? data.professionalSummary.trim()
      : undefined;
  const experienceYearsRaw = data.experienceYears;
  const experienceYears =
    typeof experienceYearsRaw === 'number'
      ? experienceYearsRaw
      : typeof experienceYearsRaw === 'string' && experienceYearsRaw.trim()
        ? Number(experienceYearsRaw)
        : undefined;

  return {
    skills: skills.slice(0, 40),
    certifications: certifications.slice(0, 30),
    professionalSummary,
    experienceYears:
      experienceYears != null && Number.isFinite(experienceYears)
        ? Math.max(0, Math.min(50, Math.round(experienceYears)))
        : undefined,
    workHistory: sanitizeWorkHistory(data.workHistory),
    education: sanitizeEducation(data.education),
    languages: sanitizeLanguages(data.languages),
  };
}

function mergeByKey<T extends { id: string }>(
  existing: T[] | undefined,
  incoming: T[] | undefined,
  keyFn: (item: T) => string,
  mergeItem?: (current: T, next: T) => T
): T[] {
  const result = [...(existing || [])];
  const indexByKey = new Map(result.map((item, idx) => [keyFn(item), idx]));
  (incoming || []).forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    const existingIdx = indexByKey.get(key);
    if (existingIdx == null) {
      indexByKey.set(key, result.length);
      result.push(item);
      return;
    }
    if (mergeItem) {
      result[existingIdx] = mergeItem(result[existingIdx], item);
    }
  });
  return result;
}

/**
 * Fusion non destructive : complète les champs vides et ajoute skills / expériences sans doublons.
 * Pour clés déjà présentes, remplit uniquement les champs vides (descriptions, niveaux…).
 */
export function mergeCvExtractIntoStaff(
  current: Partial<StaffMember>,
  extracted: CvExtractedProfile,
  options?: { overwriteSummary?: boolean }
): Partial<StaffMember> {
  const overwriteSummary = options?.overwriteSummary ?? false;
  const summary =
    overwriteSummary || !current.professionalSummary?.trim()
      ? extracted.professionalSummary || current.professionalSummary
      : current.professionalSummary;

  return {
    skills: mergeStringLists(current.skills, extracted.skills),
    certifications: mergeStringLists(current.certifications, extracted.certifications),
    professionalSummary: summary,
    experienceYears:
      current.experienceYears != null && current.experienceYears > 0
        ? current.experienceYears
        : extracted.experienceYears ?? current.experienceYears,
    workHistory: mergeByKey(
      current.workHistory,
      extracted.workHistory,
      (item) => `${item.position}|${item.company}|${item.startDate || ''}`.toLowerCase(),
      (prev, next) => ({
        ...prev,
        endDate: prev.endDate || next.endDate,
        description: prev.description?.trim() ? prev.description : next.description,
      })
    ),
    education: mergeByKey(
      current.education,
      extracted.education,
      (item) => `${item.degree}|${item.institution}|${item.year || ''}`.toLowerCase(),
      (prev, next) => ({
        ...prev,
        year: prev.year ?? next.year,
        startDate: prev.startDate || next.startDate,
        endDate: prev.endDate || next.endDate,
        description: prev.description?.trim() ? prev.description : next.description,
      })
    ),
    languages: mergeByKey(
      current.languages,
      extracted.languages,
      (item) => item.language.toLowerCase(),
      (prev, next) => ({
        ...prev,
        // Met à jour le niveau si on a une info plus précise côté CV
        proficiency: next.proficiency || prev.proficiency,
      })
    ),
  };
}

export function summarizeCvExtract(extracted: CvExtractedProfile): string {
  const parts: string[] = [];
  if (extracted.skills?.length) parts.push(`${extracted.skills.length} compétence(s)`);
  if (extracted.certifications?.length) parts.push(`${extracted.certifications.length} certification(s)`);
  if (extracted.workHistory?.length) parts.push(`${extracted.workHistory.length} expérience(s)`);
  if (extracted.education?.length) parts.push(`${extracted.education.length} formation(s)`);
  if (extracted.languages?.length) parts.push(`${extracted.languages.length} langue(s)`);
  if (extracted.professionalSummary?.trim()) parts.push('présentation');
  if (extracted.experienceYears != null) parts.push(`${extracted.experienceYears} an(s) d'expérience`);
  if (parts.length === 0) return 'Aucune information exploitable trouvée dans le CV.';
  return `Profil enrichi : ${parts.join(', ')}.`;
}
