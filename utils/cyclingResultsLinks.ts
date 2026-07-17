export function openExternalUrl(url: string): void {
  if (!url?.trim()) return;
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Impossible d’ouvrir le lien:', error);
  }
}

export function buildRiderSearchTerm(
  firstName?: string,
  lastName?: string,
  customTerm?: string
): string {
  const custom = customTerm?.trim();
  if (custom) return custom;
  return `${firstName ?? ''} ${lastName ?? ''}`.trim();
}

export function buildPcsSearchUrl(
  firstName?: string,
  lastName?: string,
  customTerm?: string
): string {
  const term = buildRiderSearchTerm(firstName, lastName, customTerm);
  if (!term) return 'https://www.procyclingstats.com/';
  return `https://www.procyclingstats.com/search.php?term=${encodeURIComponent(term)}`;
}

/** DirectVélo n’expose pas d’URL de recherche publique stable — fallback Google ciblé site:directvelo.com */
export function buildDirectVeloSearchUrl(
  firstName?: string,
  lastName?: string,
  customTerm?: string
): string {
  const term = buildRiderSearchTerm(firstName, lastName, customTerm);
  if (!term) return 'https://www.directvelo.com/coureurs';
  return `https://www.google.com/search?q=${encodeURIComponent(`site:directvelo.com/coureur ${term}`)}`;
}

export function isValidHttpUrl(value?: string): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
