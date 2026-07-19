/** URL affichable dans un <img> (http(s) ou data URL image). */
export function isDisplayableImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return true;
  if (trimmed.startsWith('blob:')) return true;
  return false;
}

export function mimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match?.[1] || 'image/jpeg';
}
