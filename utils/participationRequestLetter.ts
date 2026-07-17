import { OrganizerContact } from '../types';
import { formatFrenchDate, getTheoreticalEventDate } from './organizerContactUtils';
import {
  enrichOrganizerContact,
  getParticipationRegime,
  resolveRaceTaxonomy,
  usesCycleWebRegistration,
  FEDERAL_REGISTRATION_LABEL,
} from './raceCalendarTaxonomy';

export interface ParticipationLetterParams {
  teamName: string;
  contact: OrganizerContact;
  targetYear: number;
  signerName?: string;
  signerRole?: string;
}

export type ParticipationLetterBlock =
  | { type: 'sender'; lines: string[] }
  | { type: 'recipient'; lines: string[] }
  | { type: 'place-date'; line: string }
  | { type: 'subject'; line: string }
  | { type: 'salutation'; line: string }
  | { type: 'paragraph'; text: string }
  | { type: 'event-info'; items: { label: string; value: string }[] }
  | { type: 'list'; title?: string; items: string[] }
  | { type: 'closing'; lines: string[] }
  | { type: 'signature'; lines: string[] };

export interface ParticipationLetter {
  subject: string;
  body: string;
  blocks: ParticipationLetterBlock[];
}

function formatLetterDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildLetterBlocks(params: ParticipationLetterParams): ParticipationLetterBlock[] {
  const {
    teamName,
    contact,
    targetYear,
    signerName = '',
    signerRole = 'Directeur Sportif',
  } = params;

  const enriched = enrichOrganizerContact(contact);
  const taxonomy = resolveRaceTaxonomy(enriched);
  const regime = getParticipationRegime(taxonomy);

  const lastYear = contact.participationYears?.[0];
  const entity = contact.organizingEntity || 'Organisation';
  const categoryLabel = taxonomy.categoryLabel || contact.category;
  const genderLabel =
    taxonomy.genderSegment === 'women'
      ? 'Calendrier féminin'
      : taxonomy.genderSegment === 'men'
        ? 'Calendrier masculin'
        : taxonomy.genderSegment === 'youth'
          ? 'Catégorie jeunes'
          : null;

  const theoreticalDate = getTheoreticalEventDate(contact, targetYear);
  const placeLabel = contact.location?.split(',')[0]?.trim() || 'France';

  const pastParticipation = lastYear
    ? `Nous avons eu le plaisir de participer à cette épreuve en ${lastYear} et souhaitons renouveler notre engagement pour la saison ${targetYear}.`
    : `Nous souhaitons participer à cette épreuve pour la première fois lors de l'édition ${targetYear}.`;

  const eventInfoItems: { label: string; value: string }[] = [
    { label: 'Épreuve', value: contact.eventName },
    { label: 'Édition', value: String(targetYear) },
    { label: 'Circuit', value: taxonomy.badgeLabel },
  ];
  if (categoryLabel) eventInfoItems.push({ label: 'Catégorie', value: categoryLabel });
  if (genderLabel) eventInfoItems.push({ label: 'Segment', value: genderLabel });
  if (theoreticalDate) {
    eventInfoItems.push({
      label: 'Date visée',
      value: formatFrenchDate(theoreticalDate, { approximate: true }),
    });
  }
  if (contact.location) eventInfoItems.push({ label: 'Lieu', value: contact.location });
  if (usesCycleWebRegistration(taxonomy)) {
    eventInfoItems.push({ label: 'Inscription', value: FEDERAL_REGISTRATION_LABEL.fr });
  }

  const recipientLines = [
    entity,
    ...(contact.contactName ? [`À l'attention de ${contact.contactName}`] : []),
    contact.contactEmail,
    ...(contact.contactPhone ? [contact.contactPhone] : []),
  ];

  return [
    {
      type: 'sender',
      lines: [teamName, signerName ? `${signerName} — ${signerRole}` : signerRole],
    },
    {
      type: 'recipient',
      lines: recipientLines,
    },
    {
      type: 'place-date',
      line: `${placeLabel}, le ${formatLetterDate()}`,
    },
    {
      type: 'subject',
      line: `Demande de participation — ${contact.eventName} — Édition ${targetYear}`,
    },
    {
      type: 'salutation',
      line: contact.contactName ? `Madame, Monsieur ${contact.contactName},` : 'Madame, Monsieur,',
    },
    {
      type: 'paragraph',
      text: `Par la présente, l'équipe ${teamName} sollicite sa participation à l'épreuve « ${contact.eventName} », organisée par ${entity}, dans le cadre de l'édition ${targetYear}.`,
    },
    {
      type: 'paragraph',
      text: pastParticipation,
    },
    {
      type: 'event-info',
      items: eventInfoItems,
    },
    {
      type: 'paragraph',
      text: regime.letterIntro.fr,
    },
    {
      type: 'list',
      title: 'Engagements de l\'équipe',
      items: regime.engagementSteps.map((s) => s.fr),
    },
    {
      type: 'paragraph',
      text: `Références réglementaires : ${regime.regulationRefs.join(' · ')}.`,
    },
    {
      type: 'paragraph',
      text:
        'Nous vous remercions de nous indiquer les modalités d\'invitation, les dates limites de candidature et l\'interlocuteur administratif pour la saison à venir.',
    },
    {
      type: 'closing',
      lines: [
        'Dans l\'attente de votre retour, nous vous prions d\'agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.',
      ],
    },
    {
      type: 'signature',
      lines: [signerName || teamName, signerRole, teamName],
    },
  ];
}

function blocksToPlainText(blocks: ParticipationLetterBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'sender':
        lines.push('— EXPÉDITEUR —');
        lines.push(...block.lines);
        lines.push('');
        break;
      case 'recipient':
        lines.push('— DESTINATAIRE —');
        lines.push(...block.lines);
        lines.push('');
        break;
      case 'place-date':
        lines.push(block.line);
        lines.push('');
        break;
      case 'subject':
        lines.push(`OBJET : ${block.line}`);
        lines.push('');
        lines.push('─'.repeat(48));
        lines.push('');
        break;
      case 'salutation':
        lines.push(block.line);
        lines.push('');
        break;
      case 'paragraph':
        lines.push(block.text);
        lines.push('');
        break;
      case 'event-info':
        lines.push('— INFORMATIONS ÉPREUVE —');
        block.items.forEach((item) => {
          lines.push(`  ${item.label.padEnd(14, ' ')} : ${item.value}`);
        });
        lines.push('');
        break;
      case 'list':
        if (block.title) lines.push(block.title);
        block.items.forEach((item) => lines.push(`  • ${item}`));
        lines.push('');
        break;
      case 'closing':
        lines.push(...block.lines);
        lines.push('');
        break;
      case 'signature':
        lines.push(...block.lines);
        break;
      default:
        break;
    }
  }

  return lines.join('\n').trim();
}

export function buildParticipationRequestLetter(params: ParticipationLetterParams): ParticipationLetter {
  const blocks = buildLetterBlocks(params);
  const subject = `Demande de participation — ${params.teamName} — ${params.contact.eventName} ${params.targetYear}`;
  const body = blocksToPlainText(blocks);
  return { subject, body, blocks };
}

export function openParticipationRequestEmail(params: ParticipationLetterParams): void {
  const { subject, body } = buildParticipationRequestLetter(params);
  const mailto = `mailto:${encodeURIComponent(params.contact.contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

export function copyParticipationRequestLetter(params: ParticipationLetterParams): Promise<void> {
  const { body } = buildParticipationRequestLetter(params);
  return navigator.clipboard.writeText(body);
}
