import {
  IncomeItem,
  PartnerMediaItem,
  PartnerMediaStatus,
  RaceEvent,
} from '../types';
import { generateId } from './themeUtils';

export function buildPartnerMediaStoragePath(
  teamId: string,
  mediaId: string,
  extension = 'jpg',
): string {
  return `teams/${teamId}/partner-media/${mediaId}.${extension}`;
}

export function extensionFromMime(mimeType?: string): string {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  return 'jpg';
}

export function createPartnerMediaDraft(params: {
  teamId: string;
  photoUrl: string;
  mimeType?: string;
  eventId?: string;
  incomeItemId?: string;
  caption?: string;
  createdByUserId?: string;
  status?: PartnerMediaStatus;
}): PartnerMediaItem {
  const now = new Date().toISOString();
  const status = params.status || 'draft';
  return {
    id: generateId(),
    teamId: params.teamId,
    eventId: params.eventId,
    incomeItemId: params.incomeItemId,
    caption: params.caption,
    photoUrl: params.photoUrl,
    mimeType: params.mimeType,
    status,
    createdAt: now,
    updatedAt: now,
    publishedAt: status === 'published' ? now : undefined,
    createdByUserId: params.createdByUserId,
  };
}

export function publishPartnerMediaItem(item: PartnerMediaItem): PartnerMediaItem {
  const now = new Date().toISOString();
  return {
    ...item,
    status: 'published',
    updatedAt: now,
    publishedAt: item.publishedAt || now,
  };
}

export function archivePartnerMediaItem(item: PartnerMediaItem): PartnerMediaItem {
  return {
    ...item,
    status: 'archived',
    updatedAt: new Date().toISOString(),
  };
}

/** Photos visibles pour un partenaire (publiées, globales ou ciblées). */
export function filterMediaForPartner(
  items: PartnerMediaItem[] = [],
  teamId: string,
  incomeItemId: string,
): PartnerMediaItem[] {
  return items
    .filter((m) => m.teamId === teamId)
    .filter((m) => m.status === 'published')
    .filter((m) => !m.incomeItemId || m.incomeItemId === incomeItemId)
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
}

export function filterMediaByEvent(
  items: PartnerMediaItem[] = [],
  eventId: string,
): PartnerMediaItem[] {
  return items
    .filter((m) => m.eventId === eventId)
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
}

export function getMediaEventLabel(
  item: PartnerMediaItem,
  events: RaceEvent[],
): string | undefined {
  if (!item.eventId) return undefined;
  return events.find((e) => e.id === item.eventId)?.name;
}

export function getMediaSponsorLabel(
  item: PartnerMediaItem,
  incomeItems: IncomeItem[],
): string | undefined {
  if (!item.incomeItemId) return undefined;
  const income = incomeItems.find((i) => i.id === item.incomeItemId);
  return income?.sponsorCompanyName || income?.description;
}

export function countPublishedMedia(
  items: PartnerMediaItem[] = [],
  teamId: string,
  incomeItemId: string,
): number {
  return filterMediaForPartner(items, teamId, incomeItemId).length;
}

export function readFileAsDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: String(reader.result || ''),
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.onerror = () => reject(reader.error || new Error('Lecture fichier impossible'));
    reader.readAsDataURL(file);
  });
}
