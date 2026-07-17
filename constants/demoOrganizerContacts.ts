import { Discipline, EventType, OrganizerContact } from '../types';
import { enrichOrganizerContact } from '../utils/raceCalendarTaxonomy';
import { getCurrentSeasonYear } from '../utils/seasonUtils';

/** Calendrier UCI Women's WorldTour de référence pour les exemples. */
export const UCI_WOMEN_CALENDAR_YEAR = 2026;

/**
 * Année du dossier candidatures / projection :
 * tant que la saison courante est antérieure au calendrier UCI Femmes 2026,
 * on projette 2026 ; ensuite on suit la saison courante.
 */
export function getOrganizerDossierYear(): number {
  const season = getCurrentSeasonYear();
  return season < UCI_WOMEN_CALENDAR_YEAR ? UCI_WOMEN_CALENDAR_YEAR : season;
}

const now = () => new Date().toISOString();

function demoContact(
  partial: Omit<OrganizerContact, 'updatedAt'>,
  categoryId: string,
  lastSeason: number,
  dossierYear: number
): OrganizerContact {
  return enrichOrganizerContact({
    ...partial,
    categoryId,
    participationYears: partial.participationYears?.length
      ? partial.participationYears
      : [lastSeason],
    applications: partial.applications ?? [{ year: dossierYear, status: 'pending' }],
    updatedAt: now(),
  });
}

/**
 * Exemples alignés sur le calendrier UCI Women's WorldTour 2026
 * (dates approuvées UCI — courses à étapes avec début / fin / nb d'étapes),
 * plus quelques épreuves UCI 1.1 F, Hommes et FFC pour couvrir les autres circuits.
 */
export function buildDemoOrganizerContacts(): OrganizerContact[] {
  const lastSeason = getCurrentSeasonYear();
  const dossierYear = getOrganizerDossierYear();
  const y = UCI_WOMEN_CALENDAR_YEAR;

  const raw: Array<{ contact: Omit<OrganizerContact, 'updatedAt'>; categoryId: string }> = [
    // ——— UCI Women's WorldTour 2026 ———
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_tdu_women',
        eventName: 'Santos Tour Down Under (Women)',
        organizingEntity: 'Tour Down Under Organisation',
        contactName: 'Team entries WWT',
        contactEmail: 'entries.tdu.women.demo@sau',
        location: 'Adélaïde, Australie',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-01-17`,
        lastEventEndDate: `${y}-01-19`,
        typicalMonth: 1,
        typicalDay: 17,
        typicalEndMonth: 1,
        typicalEndDay: 19,
        stageCount: 3,
        eventType: EventType.STAGE,
        participationYears: [y - 1, y],
        applications: [{ year: dossierYear, status: 'sent', sentAt: `${y - 1}-10-15T09:00:00.000Z` }],
        notes: 'WWT 2026 — ouverture de saison Australie · 3 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_uae_tour_women',
        eventName: 'UAE Tour Women',
        organizingEntity: 'Abu Dhabi Sports Council',
        contactName: 'Team relations',
        contactEmail: 'teams.uaetour.women.demo@ae',
        location: 'Émirats arabes unis',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-02-05`,
        lastEventEndDate: `${y}-02-08`,
        typicalMonth: 2,
        typicalDay: 5,
        typicalEndMonth: 2,
        typicalEndDay: 8,
        stageCount: 4,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 5–8 février · 4 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_omloop_nieuwsblad_f',
        eventName: 'Omloop Het Nieuwsblad (Women)',
        organizingEntity: 'Flanders Classics',
        contactName: 'Entries office',
        contactEmail: 'entries.omloop.women.demo@be',
        location: 'Gand, Belgique',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-02-28`,
        typicalMonth: 2,
        typicalDay: 28,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 28 février · classique pavée.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_paris_roubaix_f',
        eventName: 'Paris-Roubaix Femmes avec Zwift',
        organizingEntity: 'Amaury Sport Organisation',
        contactName: 'Bureau compétitions féminines',
        contactEmail: 'paris-roubaix.femmes.demo@aso.fr',
        location: 'Denain → Roubaix',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-04-12`,
        typicalMonth: 4,
        typicalDay: 12,
        participationYears: [y - 1, y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 12 avril · candidature dès novembre N-1.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_liege_bastogne_f',
        eventName: 'Liège-Bastogne-Liège Femmes',
        organizingEntity: 'Amaury Sport Organisation',
        contactName: 'Service engagements WWT',
        contactEmail: 'engagements.lbl.femmes.demo@aso.fr',
        location: 'Liège, Belgique',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-04-26`,
        typicalMonth: 4,
        typicalDay: 26,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'sent', sentAt: `${y - 1}-11-10T10:00:00.000Z` }],
        notes: 'WWT 2026 — 26 avril · Ardennaise.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_vuelta_femenina',
        eventName: 'Vuelta España Femenina by Carrefour.es',
        organizingEntity: 'Unipublic / ASO',
        contactName: 'Team relations WWT',
        contactEmail: 'teams.vuelta.femenina.demo@aso.es',
        location: 'Espagne',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-05-03`,
        lastEventEndDate: `${y}-05-10`,
        typicalMonth: 5,
        typicalDay: 3,
        typicalEndMonth: 5,
        typicalEndDay: 10,
        stageCount: 8,
        eventType: EventType.STAGE,
        participationYears: [y - 1, y],
        applications: [{ year: dossierYear, status: 'sent', sentAt: `${y - 1}-10-20T09:00:00.000Z` }],
        notes: 'WWT 2026 — 3–10 mai · 8 étapes (Grand Tour F).',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_itzulia_women',
        eventName: 'Itzulia Women',
        organizingEntity: 'Organización Ciclista Profesional',
        contactName: 'Team relations',
        contactEmail: 'teams.itzulia.women.demo@eus',
        location: 'Pays Basque, Espagne',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-05-15`,
        lastEventEndDate: `${y}-05-17`,
        typicalMonth: 5,
        typicalDay: 15,
        typicalEndMonth: 5,
        typicalEndDay: 17,
        stageCount: 3,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'accepted', sentAt: `${y - 1}-11-05T12:00:00.000Z` }],
        notes: 'WWT 2026 — 15–17 mai · 3 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_burgos_feminas',
        eventName: 'Vuelta a Burgos Feminas',
        organizingEntity: 'Club Ciclista Burgalés',
        contactName: 'Entries office',
        contactEmail: 'entries.burgos.feminas.demo@es',
        location: 'Burgos, Espagne',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-05-21`,
        lastEventEndDate: `${y}-05-24`,
        typicalMonth: 5,
        typicalDay: 21,
        typicalEndMonth: 5,
        typicalEndDay: 24,
        stageCount: 4,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 21–24 mai · 4 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_giro_women',
        eventName: "Giro d'Italia Women",
        organizingEntity: 'RCS Sport',
        contactName: 'Team relations Maglia Rosa',
        contactEmail: 'teams.giro.women.demo@rcs.it',
        location: 'Italie',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-05-30`,
        lastEventEndDate: `${y}-06-07`,
        typicalMonth: 5,
        typicalDay: 30,
        typicalEndMonth: 6,
        typicalEndDay: 7,
        stageCount: 9,
        eventType: EventType.STAGE,
        participationYears: [y - 1, y],
        applications: [{ year: dossierYear, status: 'sent', sentAt: `${y - 1}-09-15T10:00:00.000Z` }],
        notes: 'WWT 2026 — 30 mai–7 juin · 9 étapes (créneau avancé vs juillet).',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_suisse_women',
        eventName: 'Tour de Suisse Women',
        organizingEntity: 'Tour de Suisse Organisation',
        contactName: 'Team entries',
        contactEmail: 'entries.tds.women.demo@ch',
        location: 'Suisse',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-06-17`,
        lastEventEndDate: `${y}-06-21`,
        typicalMonth: 6,
        typicalDay: 17,
        typicalEndMonth: 6,
        typicalEndDay: 21,
        stageCount: 5,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 17–21 juin · 5 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_tdf_femmes',
        eventName: 'Tour de France Femmes avec Zwift',
        organizingEntity: 'Amaury Sport Organisation',
        contactName: 'Service engagements WWT',
        contactEmail: 'engagements.wwt.demo@aso.fr',
        location: 'Lausanne → Nice (France / Suisse)',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-08-01`,
        lastEventEndDate: `${y}-08-09`,
        typicalMonth: 8,
        typicalDay: 1,
        typicalEndMonth: 8,
        typicalEndDay: 9,
        stageCount: 9,
        eventType: EventType.STAGE,
        participationYears: [y - 1, y],
        applications: [{ year: dossierYear, status: 'sent', sentAt: `${y - 1}-10-01T09:00:00.000Z` }],
        notes: 'WWT 2026 — 1–9 août · 9 étapes · une semaine après le Tour hommes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_tour_britain_women',
        eventName: 'Lloyds Tour of Britain Women',
        organizingEntity: 'SweetSpot Group',
        contactName: 'Team relations',
        contactEmail: 'teams.tob.women.demo@uk',
        location: 'Grande-Bretagne',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-08-20`,
        lastEventEndDate: `${y}-08-23`,
        typicalMonth: 8,
        typicalDay: 20,
        typicalEndMonth: 8,
        typicalEndDay: 23,
        stageCount: 4,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 20–23 août · 4 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_lorient_ceratizit',
        eventName: 'Classic Lorient Agglomération - CERATIZIT',
        organizingEntity: 'Organisation Classic Lorient',
        contactName: 'Service engagements',
        contactEmail: 'engagements.lorient.demo@fr',
        location: 'Lorient, France',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-08-29`,
        typicalMonth: 8,
        typicalDay: 29,
        participationYears: [y - 1, y],
        applications: [{ year: dossierYear, status: 'accepted', sentAt: `${y - 1}-12-01T08:00:00.000Z` }],
        notes: 'WWT 2026 — 29 août · classique française.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_romandie_feminin',
        eventName: 'Tour de Romandie Féminin',
        organizingEntity: 'Tour de Romandie',
        contactName: 'Entries office',
        contactEmail: 'entries.romandie.feminin.demo@ch',
        location: 'Suisse romande',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-09-04`,
        lastEventEndDate: `${y}-09-06`,
        typicalMonth: 9,
        typicalDay: 4,
        typicalEndMonth: 9,
        typicalEndDay: 6,
        stageCount: 3,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 4–6 septembre · 3 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_simac_ladies',
        eventName: 'Simac Ladies Tour of Holland',
        organizingEntity: 'Women Cycling Organization Holland',
        contactName: 'Team entries',
        contactEmail: 'entries.simac.ladies.demo@nl',
        location: 'Pays-Bas',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-09-09`,
        lastEventEndDate: `${y}-09-13`,
        typicalMonth: 9,
        typicalDay: 9,
        typicalEndMonth: 9,
        typicalEndDay: 13,
        stageCount: 5,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 9–13 septembre · 5 étapes.',
      },
    },
    {
      categoryId: 'uci.wwt',
      contact: {
        id: 'demo_org_guangxi_women',
        eventName: 'Tour of Guangxi (Women)',
        organizingEntity: 'Wanda Sports',
        contactName: 'Team relations',
        contactEmail: 'teams.guangxi.women.demo@cn',
        location: 'Guangxi, Chine',
        uciClass: 'UCI WWT',
        category: "UCI Women's WorldTour",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-10-18`,
        typicalMonth: 10,
        typicalDay: 18,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'WWT 2026 — 18 octobre · clôture de saison.',
      },
    },

    // ——— UCI Women's Classe 1 ———
    {
      categoryId: 'uci.w.1',
      contact: {
        id: 'demo_org_omloop_hageland',
        eventName: 'FENIX Omloop van het Hageland',
        organizingEntity: 'Kempens Sportproeven',
        contactName: 'Entries office',
        contactEmail: 'entries.hageland.demo@be',
        location: 'Tielt-Winge, Belgique',
        uciClass: 'UCI 1.1',
        category: "UCI Women's Classe 1",
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-03-01`,
        typicalMonth: 3,
        typicalDay: 1,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'UCI 1.1 F 2026 — 1er mars · hors WWT.',
      },
    },

    // ——— Autres circuits (H / amateur / jeunes) ———
    {
      categoryId: 'uci.1',
      contact: {
        id: 'demo_org_classique_loire',
        eventName: 'Classique Loire Atlantique',
        organizingEntity: 'Organisation Classique Loire Atlantique',
        contactName: 'Marc Dupont',
        contactEmail: 'engagements@classique-loire.demo.fr',
        location: 'La Chapelle-sur-Erdre',
        uciClass: 'UCI 1.1',
        category: 'UCI Classe 1',
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-03-30`,
        typicalMonth: 3,
        typicalDay: 30,
        participationYears: [y - 1, y],
        applications: [{ year: dossierYear, status: 'accepted', sentAt: `${y - 1}-11-15T10:00:00.000Z` }],
      },
    },
    {
      categoryId: 'uci.2',
      contact: {
        id: 'demo_org_tour_limousin',
        eventName: 'Tour du Limousin',
        organizingEntity: 'Limousin Cyclisme Organisation',
        contactName: 'Claire Dubois',
        contactEmail: 'participation@tour-du-limousin.fr',
        location: 'Limoges / Corrèze',
        uciClass: 'UCI 2.1',
        category: 'Élite Nationale',
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-05-15`,
        lastEventEndDate: `${y}-05-17`,
        typicalMonth: 5,
        typicalDay: 15,
        typicalEndMonth: 5,
        typicalEndDay: 17,
        stageCount: 3,
        eventType: EventType.STAGE,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'sent', sentAt: `${y - 1}-11-20T14:00:00.000Z` }],
        notes: 'UCI 2.1 H — 3 étapes · Continental / Elite.',
      },
    },
    {
      categoryId: 'cdf.n2',
      contact: {
        id: 'demo_org_cdf_n2_mayenne',
        eventName: 'Coupe de France N2 — Mayenne',
        organizingEntity: 'Ligue du Pays de la Loire',
        contactName: 'Service calendrier FFC',
        contactEmail: 'calendrier.pdl.demo@ffc.fr',
        location: 'Laval',
        category: 'Coupe de France N2',
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-06-14`,
        typicalMonth: 6,
        typicalDay: 14,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'pending' }],
        notes: 'Épreuve fédérale — inscription CycleWeb · licence FFC à jour.',
      },
    },
    {
      categoryId: 'uci.ncup',
      contact: {
        id: 'demo_org_tour_avenir',
        eventName: "Tour de l'Avenir",
        organizingEntity: 'Amaury Sport Organisation (Jeunes)',
        contactName: 'Service engagements U23',
        contactEmail: 'engagements.u23.demo@aso.fr',
        location: 'France',
        uciClass: 'UCI 2.2',
        category: 'Coupe des Nations U23',
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-08-24`,
        lastEventEndDate: `${y}-08-31`,
        typicalMonth: 8,
        typicalDay: 24,
        typicalEndMonth: 8,
        typicalEndDay: 31,
        stageCount: 8,
        eventType: EventType.STAGE,
        participationYears: [y],
        notes: 'Sélection fédérale U23 — effectif né sous 23 ans.',
      },
    },
    {
      categoryId: 'fed.u19',
      contact: {
        id: 'demo_org_fed_u19_bzh',
        eventName: 'Fédérale U19 — Bretagne',
        organizingEntity: 'Ligue Bretagne FFC',
        contactName: 'Commission jeunes',
        contactEmail: 'jeunes.bretagne.demo@ffc.fr',
        location: 'Pontivy',
        category: 'Fédérale U19 (Juniors)',
        discipline: Discipline.ROUTE,
        lastEventDate: `${y}-04-20`,
        typicalMonth: 4,
        typicalDay: 20,
        participationYears: [y],
        applications: [{ year: dossierYear, status: 'accepted', sentAt: `${y - 1}-12-10T08:00:00.000Z` }],
      },
    },
  ];

  return raw.map(({ contact, categoryId }) =>
    demoContact(contact, categoryId, lastSeason, dossierYear)
  );
}

export function isDemoOrganizerContact(id: string): boolean {
  return id.startsWith('demo_org_');
}

/** Fusionne / remplace les contacts démo (mise à jour dates calendrier UCI). */
export function mergeDemoOrganizerContacts(existing: OrganizerContact[]): OrganizerContact[] {
  const demos = buildDemoOrganizerContacts();
  const demoIds = new Set(demos.map((d) => d.id));
  const withoutStaleDemos = existing.filter(
    (c) => !isDemoOrganizerContact(c.id) || demoIds.has(c.id)
  );

  let merged = [...withoutStaleDemos];
  for (const demo of demos) {
    const byId = merged.findIndex((c) => c.id === demo.id);
    if (byId >= 0) {
      merged[byId] = { ...demo, id: merged[byId].id };
      continue;
    }
    const dup = merged.findIndex(
      (c) =>
        c.contactEmail.toLowerCase() === demo.contactEmail.toLowerCase() &&
        c.eventName.toLowerCase() === demo.eventName.toLowerCase()
    );
    if (dup >= 0) {
      merged[dup] = { ...demo, id: merged[dup].id };
    } else {
      merged.push(demo);
    }
  }

  // Retirer d'anciennes démos dont l'id n'existe plus (ex. Itzulia hommes)
  const currentDemoIds = new Set(demos.map((d) => d.id));
  merged = merged.filter((c) => !isDemoOrganizerContact(c.id) || currentDemoIds.has(c.id));

  return merged.sort((a, b) => a.eventName.localeCompare(b.eventName, 'fr'));
}
