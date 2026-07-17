/** Extraction du montant TTC depuis un texte OCR (format européen). */
export function parseAmountFromOcrText(text: string): number | null {
  if (!text.trim()) return null;

  const candidates: number[] = [];
  const patterns = [
    /total\s*(?:ttc|à\s*payer)?\s*[:\s]*(\d{1,6}[.,]\d{2})/gi,
    /(\d{1,6}[.,]\d{2})\s*€/g,
    /€\s*(\d{1,6}[.,]\d{2})/g,
    /montant\s*[:\s]*(\d{1,6}[.,]\d{2})/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1].replace(',', '.');
      const value = parseFloat(raw);
      if (!Number.isNaN(value) && value > 0 && value < 100_000) {
        candidates.push(value);
      }
    }
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/** Extraction d'une date depuis le texte OCR (JJ/MM/AAAA ou AAAA-MM-JJ). */
export function parseDateFromOcrText(text: string): string | null {
  const fr = text.match(/(\d{2})[/.-](\d{2})[/.-](\d{4})/);
  if (fr) {
    const [, d, m, y] = fr;
    return `${y}-${m}-${d}`;
  }
  const iso = text.match(/(\d{4})[/.-](\d{2})[/.-](\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m}-${d}`;
  }
  return null;
}

export interface ReceiptOcrResult {
  text: string;
  confidence: number;
  suggestedAmount: number | null;
  suggestedDate: string | null;
}

/**
 * OCR client (Tesseract.js chargé à la demande).
 * Retourne un résultat vide si la librairie n'est pas disponible.
 */
export async function runReceiptOcr(imageDataUrl: string): Promise<ReceiptOcrResult> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('fra+eng', 1, { logger: () => {} });
    try {
      const { data } = await worker.recognize(imageDataUrl);
      const text = data.text || '';
      const confidence = data.confidence ?? 0;
      return {
        text,
        confidence,
        suggestedAmount: parseAmountFromOcrText(text),
        suggestedDate: parseDateFromOcrText(text),
      };
    } finally {
      await worker.terminate();
    }
  } catch {
    return {
      text: '',
      confidence: 0,
      suggestedAmount: null,
      suggestedDate: null,
    };
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
