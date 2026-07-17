import {
  PartnerCounterpartDeliverable,
  PartnerNewsletter,
  PartnerNewsletterBlock,
  RaceEvent,
  Rider,
  CounterpartDeliverableStatus,
} from '../types';
import {
  isCounterpartDeliverableComplete,
  normalizePartnerCounterpartDeliverable,
} from './counterpartDeliverableUtils';

export type PartnerNewsletterTemplateId =
  | 'sponsor_spotlight'
  | 'rider_interview'
  | 'race_results'
  | 'season_calendar'
  | 'visibility_report'
  | 'blank';

const generateBlockId = () => `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function buildNewsletterFromTemplate(
  templateId: PartnerNewsletterTemplateId,
  params: {
    teamName: string;
    sponsorName: string;
    events?: RaceEvent[];
    riders?: Rider[];
    language?: 'fr' | 'en';
  },
): Pick<PartnerNewsletter, 'title' | 'subject' | 'previewText' | 'blocks'> {
  const { teamName, sponsorName, events = [], riders = [], language = 'fr' } = params;
  const isFr = language === 'fr';
  const upcoming = events
    .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 6);

  if (templateId === 'sponsor_spotlight') {
    const featuredRider = riders[0];
    const riderName = featuredRider
      ? `${featuredRider.firstName} ${featuredRider.lastName}`
      : (isFr ? 'l\'effectif' : 'the roster');
    return {
      title: isFr ? `${sponsorName} × ${teamName}` : `${sponsorName} × ${teamName}`,
      subject: isFr
        ? `Mise en avant partenaire — ${sponsorName}`
        : `Partner spotlight — ${sponsorName}`,
      previewText: isFr
        ? 'Votre visibilité sur la saison et les prochains rendez-vous médias.'
        : 'Your season visibility and upcoming media moments.',
      blocks: [
        { id: generateBlockId(), type: 'heading', content: isFr ? 'Partenaire à l\'honneur' : 'Partner in the spotlight' },
        {
          id: generateBlockId(),
          type: 'sponsorSpotlight',
          content: isFr
            ? `${sponsorName} accompagne ${teamName} cette saison.\n\nVisibilité prévue :\n• Logo sur maillots & véhicules\n• Présence réseaux sociaux (2 publications / mois)\n• Hospitality VIP sur les courses majeures\n• Mention dans les communiqués post-course`
            : `${sponsorName} supports ${teamName} this season.\n\nPlanned visibility:\n• Logo on kits & vehicles\n• Social media presence (2 posts / month)\n• VIP hospitality at major races\n• Mention in post-race releases`,
        },
        {
          id: generateBlockId(),
          type: 'highlight',
          content: isFr
            ? `Prochain focus média : ${riderName} portera votre logo lors des prochaines échappées télévisées.`
            : `Next media focus: ${riderName} will carry your logo during upcoming televised breakaways.`,
        },
        {
          id: generateBlockId(),
          type: 'cta',
          content: isFr
            ? 'Besoin de visuels HD ou d\'un plan de visibilité détaillé ? Contactez votre interlocuteur équipe — réponse sous 48 h.'
            : 'Need HD assets or a detailed visibility plan? Contact your team liaison — reply within 48 h.',
        },
      ],
    };
  }

  if (templateId === 'rider_interview') {
    const rider = riders[0];
    const riderName = rider ? `${rider.firstName} ${rider.lastName}` : (isFr ? 'Un coureur' : 'A rider');
    return {
      title: isFr ? `Interview — ${riderName}` : `Interview — ${riderName}`,
      subject: isFr
        ? `${teamName} × ${sponsorName} — interview coureur`
        : `${teamName} × ${sponsorName} — rider interview`,
      previewText: isFr
        ? 'Contenu exclusif pour nos partenaires.'
        : 'Exclusive content for our partners.',
      blocks: [
        { id: generateBlockId(), type: 'heading', content: isFr ? `Rencontre avec ${riderName}` : `Meet ${riderName}` },
        {
          id: generateBlockId(),
          type: 'interview',
          content: isFr
            ? `Q — Quel est votre objectif sur la saison avec ${teamName} ?\nR — Performer sur les courses où ${sponsorName} sera le plus visible, et remercier nos partenaires pour leur confiance.\n\nQ — Un mot pour ${sponsorName} ?\nR — Leur soutien nous permet de viser haut — merci pour cette aventure commune.`
            : `Q — What's your season goal with ${teamName}?\nA — Perform at races where ${sponsorName} gets maximum visibility, and thank our partners for their trust.\n\nQ — A word for ${sponsorName}?\nA — Their support lets us aim high — thank you for this journey together.`,
        },
        {
          id: generateBlockId(),
          type: 'paragraph',
          content: isFr
            ? 'Cette interview est réservée à l\'espace partenaire. Les extraits vidéo pourront être partagés sur demande.'
            : 'This interview is reserved for the partner space. Video excerpts can be shared on request.',
        },
      ],
    };
  }

  if (templateId === 'season_calendar') {
    const eventLines = upcoming.map((e) => `• ${e.name} — ${e.date}`).join('\n');
    return {
      title: isFr ? `Calendrier ${teamName}` : `${teamName} calendar`,
      subject: isFr
        ? `${teamName} × ${sponsorName} — prochaines dates`
        : `${teamName} × ${sponsorName} — upcoming dates`,
      previewText: isFr
        ? 'Vos prochaines opportunités de visibilité sur la saison.'
        : 'Your upcoming visibility opportunities this season.',
      blocks: [
        { id: generateBlockId(), type: 'heading', content: isFr ? 'Bonjour,' : 'Hello,' },
        {
          id: generateBlockId(),
          type: 'paragraph',
          content: isFr
            ? `Voici le calendrier des prochaines courses où ${sponsorName} bénéficiera d'une visibilité avec ${teamName}.`
            : `Here is the upcoming race calendar where ${sponsorName} will enjoy visibility with ${teamName}.`,
        },
        {
          id: generateBlockId(),
          type: 'eventList',
          content: eventLines || (isFr ? 'Calendrier en cours de finalisation.' : 'Calendar being finalized.'),
        },
        {
          id: generateBlockId(),
          type: 'cta',
          content: isFr
            ? 'Besoin d\'assets logo ou d\'un point visibilité ? Répondez à ce message — votre contact équipe vous répond sous 48 h.'
            : 'Need logo assets or a visibility briefing? Reply to this message — your team contact responds within 48 h.',
        },
      ],
    };
  }

  if (templateId === 'race_results') {
    const lastEvent = events
      .filter((e) => e.date < new Date().toISOString().slice(0, 10))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const roster = riders.slice(0, 8).map((r) => `${r.firstName} ${r.lastName}`).join(', ');
    return {
      title: isFr ? 'Résultats & visibilité course' : 'Race results & visibility',
      subject: isFr
        ? `${teamName} — compte-rendu ${lastEvent?.name || 'course'}`
        : `${teamName} — ${lastEvent?.name || 'race'} recap`,
      previewText: isFr
        ? 'Résumé performance et retombées médias pour nos partenaires.'
        : 'Performance summary and media exposure for our partners.',
      blocks: [
        { id: generateBlockId(), type: 'heading', content: lastEvent?.name || teamName },
        {
          id: generateBlockId(),
          type: 'highlight',
          content: isFr
            ? `Merci ${sponsorName} pour votre soutien — votre logo était présent sur les tenues et le matériel logistique.`
            : `Thank you ${sponsorName} for your support — your logo was visible on kits and logistics equipment.`,
        },
        {
          id: generateBlockId(),
          type: 'results',
          content: isFr
            ? `Partants : ${roster || 'effectif complet'}.\nRetombées : stories équipe, photos finish line, communiqué post-course.`
            : `Starters: ${roster || 'full roster'}.\nExposure: team stories, finish line photos, post-race release.`,
        },
        {
          id: generateBlockId(),
          type: 'paragraph',
          content: isFr
            ? 'Le rapport visibilité détaillé (reach, impressions, clips) sera disponible dans votre espace partenaire sous 10 jours.'
            : 'Detailed visibility report (reach, impressions, clips) will be available in your partner space within 10 days.',
        },
      ],
    };
  }

  if (templateId === 'visibility_report') {
    return {
      title: isFr ? 'Bilan visibilité partenaire' : 'Partner visibility report',
      subject: isFr
        ? `${teamName} × ${sponsorName} — bilan trimestriel`
        : `${teamName} × ${sponsorName} — quarterly report`,
      previewText: isFr
        ? 'Synthèse des livrables et prochaines étapes.'
        : 'Deliverables summary and next steps.',
      blocks: [
        { id: generateBlockId(), type: 'heading', content: isFr ? 'Bilan visibilité' : 'Visibility report' },
        {
          id: generateBlockId(),
          type: 'paragraph',
          content: isFr
            ? `Période couverte : trimestre en cours. Partenaire : ${sponsorName}.`
            : `Period covered: current quarter. Partner: ${sponsorName}.`,
        },
        {
          id: generateBlockId(),
          type: 'highlight',
          content: isFr
            ? '✓ Logo sur maillots & véhicules\n✓ 2 publications réseaux / mois\n✓ Hospitality VIP (à planifier)'
            : '✓ Logo on kits & vehicles\n✓ 2 social posts / month\n✓ VIP hospitality (to schedule)',
        },
        {
          id: generateBlockId(),
          type: 'quote',
          content: isFr
            ? '« Notre partenariat avec l\'équipe nous apporte une visibilité premium sur le peloton professionnel. »'
            : '"Our partnership with the team delivers premium visibility in the professional peloton."',
        },
      ],
    };
  }

  return {
    title: isFr ? 'Newsletter partenaire' : 'Partner newsletter',
    subject: `${teamName} × ${sponsorName}`,
    previewText: '',
    blocks: [{ id: generateBlockId(), type: 'paragraph', content: '' }],
  };
}

export function filterNewslettersForPartner(
  newsletters: PartnerNewsletter[],
  teamId: string,
  incomeItemId: string,
): PartnerNewsletter[] {
  return newsletters
    .filter(
      (n) =>
        n.teamId === teamId
        && n.status === 'published'
        && (!n.incomeItemId || n.incomeItemId === incomeItemId),
    )
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
}

export function exportNewsletterHtml(
  newsletter: PartnerNewsletter,
  teamName: string,
  sponsorName: string,
): string {
  const blocksHtml = newsletter.blocks
    .map((block) => renderBlockHtml(block))
    .join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${newsletter.title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1e293b}
.hero{background:linear-gradient(135deg,#1e293b,#4338ca);color:#fff;padding:32px;border-radius:12px;margin-bottom:24px}
.highlight{background:#eef2ff;border-left:4px solid #6366f1;padding:16px;margin:16px 0;border-radius:0 8px 8px 0}
.cta{background:#ecfdf5;border:1px solid #6ee7b7;padding:16px;border-radius:8px;margin:16px 0}
.quote{font-style:italic;color:#64748b;border-left:3px solid #cbd5e1;padding-left:16px;margin:16px 0}
pre{white-space:pre-wrap;font-family:inherit}</style></head><body>
<div class="hero"><p style="opacity:.8;margin:0">${teamName}</p><h1 style="margin:8px 0 0">${newsletter.title}</h1>
<p style="opacity:.9;margin:8px 0 0">${sponsorName}</p></div>
${blocksHtml}
</body></html>`;
}

function renderBlockHtml(block: PartnerNewsletterBlock): string {
  switch (block.type) {
    case 'heading':
      return `<h2>${escapeHtml(block.content)}</h2>`;
    case 'highlight':
      return `<div class="highlight"><pre>${escapeHtml(block.content)}</pre></div>`;
    case 'cta':
      return `<div class="cta"><pre>${escapeHtml(block.content)}</pre></div>`;
    case 'quote':
      return `<blockquote class="quote">${escapeHtml(block.content)}</blockquote>`;
    case 'interview':
      return `<div class="highlight" style="border-left-color:#0ea5e9"><pre>${escapeHtml(block.content)}</pre></div>`;
    case 'sponsorSpotlight':
      return `<div class="highlight" style="background:#fef3c7;border-left-color:#f59e0b"><pre>${escapeHtml(block.content)}</pre></div>`;
    case 'eventList':
    case 'results':
      return `<pre>${escapeHtml(block.content)}</pre>`;
    default:
      return `<p>${escapeHtml(block.content).replace(/\n/g, '<br>')}</p>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadNewsletterHtml(
  newsletter: PartnerNewsletter,
  teamName: string,
  sponsorName: string,
) {
  const html = exportNewsletterHtml(newsletter, teamName, sponsorName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `newsletter-${newsletter.title.replace(/\s+/g, '-').toLowerCase()}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export const DEFAULT_COUNTERPART_DELIVERABLES = (language: 'fr' | 'en' = 'fr') =>
  language === 'fr'
    ? [
        { label: 'Logo sur maillots (saison)', status: CounterpartDeliverableStatus.PLANNED },
        { label: 'Logo sur véhicules équipe', status: CounterpartDeliverableStatus.PLANNED },
        { label: 'Publications réseaux sociaux (2/mois)', status: CounterpartDeliverableStatus.IN_PROGRESS },
        { label: 'Hospitality VIP — 1 événement', status: CounterpartDeliverableStatus.PLANNED },
        { label: 'Rapport visibilité semestriel', status: CounterpartDeliverableStatus.PLANNED },
      ]
    : [
        { label: 'Logo on kits (season)', status: CounterpartDeliverableStatus.PLANNED },
        { label: 'Logo on team vehicles', status: CounterpartDeliverableStatus.PLANNED },
        { label: 'Social media posts (2/month)', status: CounterpartDeliverableStatus.IN_PROGRESS },
        { label: 'VIP hospitality — 1 event', status: CounterpartDeliverableStatus.PLANNED },
        { label: 'Semi-annual visibility report', status: CounterpartDeliverableStatus.PLANNED },
      ];

export function getDeliverablesForIncome(
  incomeItem: { partnershipDeliverables?: PartnerCounterpartDeliverable[] },
  language: 'fr' | 'en' = 'fr',
): PartnerCounterpartDeliverable[] {
  if (incomeItem.partnershipDeliverables?.length) {
    return incomeItem.partnershipDeliverables.map(normalizePartnerCounterpartDeliverable);
  }
  return DEFAULT_COUNTERPART_DELIVERABLES(language).map((d, i) => ({
    id: `default-${i}`,
    ...d,
  }));
}

export function deliverableProgress(
  items: PartnerCounterpartDeliverable[],
): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((d) => isCounterpartDeliverableComplete(d.status)).length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}
