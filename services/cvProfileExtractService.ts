import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';
import {
  CvExtractedProfile,
  sanitizeCvExtractedProfile,
} from '../utils/cvProfileMergeUtils';

const GEMINI_MODEL = 'gemini-2.0-flash';

export class CvExtractError extends Error {
  code: 'NO_API_KEY' | 'UNSUPPORTED_TYPE' | 'EMPTY' | 'API' | 'PARSE';

  constructor(code: CvExtractError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'CvExtractError';
  }
}

const SUPPORTED_INLINE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

function normalizeMimeType(mimeType?: string, fileName?: string): string {
  const raw = (mimeType || '').toLowerCase().trim();
  if (raw && raw !== 'application/octet-stream') {
    if (raw === 'image/jpg') return 'image/jpeg';
    return raw;
  }
  const name = (fileName || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.heic')) return 'image/heic';
  if (name.endsWith('.heif')) return 'image/heif';
  return raw || 'application/octet-stream';
}

export function isCvExtractSupported(mimeType?: string, fileName?: string): boolean {
  const mime = normalizeMimeType(mimeType, fileName);
  if (SUPPORTED_INLINE_TYPES.has(mime)) return true;
  const lower = (fileName || '').toLowerCase();
  return /\.(pdf|png|jpe?g|webp|gif|heic|heif)$/.test(lower);
}

function parseAiJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function buildPrompt(fileName?: string): string {
  return `Tu es un recruteur sportif spécialisé cyclisme / logistique d'équipe.
Analyse le CV fourni (${fileName || 'document'}) et extrais les informations professionnelles pour remplir un profil staff.

Réponds UNIQUEMENT en JSON strict (pas de markdown) avec cette structure:
{
  "professionalSummary": "résumé pro en français, 2 à 5 phrases",
  "experienceYears": number | null,
  "skills": ["compétence 1", "compétence 2"],
  "certifications": ["certification 1"],
  "workHistory": [
    {
      "position": "poste",
      "company": "organisation",
      "startDate": "AAAA-MM" | "",
      "endDate": "AAAA-MM" | "présent" | "",
      "description": "missions clés"
    }
  ],
  "education": [
    {
      "degree": "diplôme",
      "institution": "école",
      "year": 2020,
      "description": ""
    }
  ],
  "languages": [
    {
      "language": "Français",
      "proficiency": "Natif" | "Courant" | "Avancé" | "Intermédiaire" | "Basique"
    }
  ]
}

Règles:
- Extrais UNIQUEMENT ce qui est clairement présent dans le CV.
- skills: compétences techniques et soft skills concrètes (max 25), libellés courts.
- Preferer le français pour professionalSummary et descriptions.
- Si une info est absente, utilise [] ou null / "".
- Ne invente pas d'entreprises, diplômes ou certifications.
- Pour le domaine cyclisme/sport, garde les termes métier (mécanicien, soigneur, DS, logistics, etc.) s'ils apparaissent.`;
}

async function callExtractViaCloudFunction(params: {
  mimeType: string;
  base64: string;
  fileName?: string;
}): Promise<unknown | null> {
  try {
    const functions = getFunctions(app);
    const callable = httpsCallable<
      { mimeType: string; base64: string; fileName?: string },
      { profile: unknown }
    >(functions, 'extractCvProfile');
    const result = await callable(params);
    return result.data?.profile ?? null;
  } catch (error) {
    console.warn('extractCvProfile Cloud Function indisponible:', error);
    return null;
  }
}

/** Repli local uniquement en DEV — la clé ne doit pas être exposée en production. */
async function callGeminiDirectDev(params: {
  mimeType: string;
  base64: string;
  fileName?: string;
}): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!import.meta.env.DEV || !apiKey?.trim()) {
    throw new CvExtractError(
      'NO_API_KEY',
      'Lecture CV indisponible. Déployez la Cloud Function extractCvProfile avec GEMINI_API_KEY, ou configurez VITE_GEMINI_API_KEY uniquement en développement local.'
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildPrompt(params.fileName) },
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new CvExtractError(
      'API',
      `Impossible d'analyser le CV (API ${response.status}). ${err.slice(0, 160)}`
    );
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new CvExtractError('EMPTY', 'Réponse IA vide lors de la lecture du CV.');
  }
  return text as string;
}

export interface ExtractCvProfileInput {
  fileName?: string;
  mimeType?: string;
  base64?: string;
}

export async function extractProfileFromCv(
  input: ExtractCvProfileInput
): Promise<CvExtractedProfile> {
  if (!input.base64?.trim()) {
    throw new CvExtractError('EMPTY', 'CV vide : impossible d’extraire le profil.');
  }

  const mimeType = normalizeMimeType(input.mimeType, input.fileName);
  if (!isCvExtractSupported(mimeType, input.fileName)) {
    throw new CvExtractError(
      'UNSUPPORTED_TYPE',
      'Pour la lecture automatique, utilisez un CV en PDF ou image (PNG/JPG/HEIC). Les fichiers Word (.doc/.docx) ne sont pas encore lus automatiquement.'
    );
  }

  const payload = {
    mimeType,
    base64: input.base64,
    fileName: input.fileName,
  };

  const cloudProfile = await callExtractViaCloudFunction(payload);
  if (cloudProfile) {
    return sanitizeCvExtractedProfile(cloudProfile);
  }

  const text = await callGeminiDirectDev(payload);
  const parsed = parseAiJson(text);
  if (!parsed) {
    throw new CvExtractError('PARSE', 'Impossible d’interpréter la réponse d’analyse du CV.');
  }
  return sanitizeCvExtractedProfile(parsed);
}
