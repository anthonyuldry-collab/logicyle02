import React, { useMemo, useState } from 'react';
import {
  AppState,
  ChecklistRole,
  RaceEvent,
  Rider,
} from '../../types';
import { getEventSelectedRiders } from '../../utils/staffRoleDataAccess';
import EventOperationalLogisticsTab from '../../sections/eventDetailTabs/EventOperationalLogisticsTab';
import ActionButton from '../ActionButton';
import {
  buildPartantsSocialCopy,
  buildResultsPlaceholderCopy,
  getActiveSponsorsForMedia,
  getEventMediaStaffContacts,
  getRaceScheduleHighlights,
  summarizePartnerNewsletters,
} from '../../utils/communicationMissionUtils';
import {
  getFichePosteTasks,
  groupFicheTasksBySection,
  resolveFicheStructureForTeam,
} from '../../utils/fichePosteUtils';
import { formatEventDateRange } from '../../utils/dateUtils';
import { isStageRace } from '../../utils/stageRaceUtils';

interface CommunicationMissionTabProps {
  event: RaceEvent;
  appState: AppState;
  updateEvent: (updated: Partial<RaceEvent>) => void;
}

function RiderMediaCard({ rider }: { rider: Rider }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
      {rider.photoUrl ? (
        <img src={rider.photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-800">
          {rider.firstName?.[0]}
          {rider.lastName?.[0]}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-medium text-gray-900">
          {rider.firstName} {rider.lastName}
        </p>
        {(rider.categories?.length ?? 0) > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{rider.categories!.join(' · ')}</p>
        )}
      </div>
    </li>
  );
}

const CommunicationMissionTab: React.FC<CommunicationMissionTabProps> = ({
  event,
  appState,
  updateEvent,
}) => {
  const selectedRiders = useMemo(
    () => getEventSelectedRiders(event, appState.riders),
    [event, appState.riders],
  );

  const teamName =
    appState.teams.find(t => t.id === appState.activeTeamId)?.name || 'Équipe';

  const scheduleHighlights = useMemo(() => getRaceScheduleHighlights(event), [event]);
  const staffContacts = useMemo(
    () => getEventMediaStaffContacts(event, appState.staff),
    [event, appState.staff],
  );

  const ficheGroups = useMemo(() => {
    const structure = resolveFicheStructureForTeam(
      appState.teamLevel,
      appState.operationalSettings,
    );
    const tasks = getFichePosteTasks(
      ChecklistRole.COMMUNICATION,
      structure,
      appState.teamLevel,
      appState.operationalSettings,
      [event],
    );
    return groupFicheTasksBySection(tasks);
  }, [appState.teamLevel, appState.operationalSettings, event]);

  const sponsors = useMemo(
    () => getActiveSponsorsForMedia(appState.incomeItems),
    [appState.incomeItems],
  );

  const newsletterSummary = useMemo(
    () => summarizePartnerNewsletters(appState.partnerNewsletters),
    [appState.partnerNewsletters],
  );

  const partantsCopy = useMemo(
    () => buildPartantsSocialCopy({ event, riders: selectedRiders, teamName }),
    [event, selectedRiders, teamName],
  );

  const resultsCopy = useMemo(
    () => buildResultsPlaceholderCopy({ event, riders: selectedRiders, teamName }),
    [event, selectedRiders, teamName],
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const eventTypeLabel = isStageRace(event) ? 'Stage' : event.eventType;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
        <h3 className="text-base font-semibold text-indigo-900">Mission média — {event.name}</h3>
        <p className="mt-1 text-sm text-indigo-800">
          Brief course, horaires clés, timings OP, partantes, modèles réseaux et visibilité partenaires.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Brief course
          </h4>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Dates</dt>
              <dd className="text-gray-900 font-medium">{formatEventDateRange(event)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Lieu</dt>
              <dd className="text-gray-900">{event.location || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Type</dt>
              <dd className="text-gray-900">{eventTypeLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Discipline</dt>
              <dd className="text-gray-900">{event.discipline || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-gray-500">Catégorie</dt>
              <dd className="text-gray-900">{event.eligibleCategory || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Horaires clés
          </h4>
          {scheduleHighlights.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 italic">
              Renseignez les infos course (onglet Infos) pour alimenter le brief média.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {scheduleHighlights.map(row => (
                <li key={row.label} className="flex gap-2 text-sm">
                  <span className="w-36 shrink-0 text-gray-500">{row.label}</span>
                  <span className="text-gray-900 font-medium">{row.value}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {staffContacts.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Contacts sur la course
          </h4>
          <div className="mt-3 flex flex-wrap gap-4">
            {staffContacts.map(group => (
              <div key={group.label}>
                <p className="text-xs font-medium text-gray-500">{group.label}</p>
                <ul className="mt-1 text-sm text-gray-900">
                  {group.members.map(m => (
                    <li key={m.id}>
                      {m.firstName} {m.lastName}
                      {m.phone ? ` · ${m.phone}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <EventOperationalLogisticsTab
          event={event}
          updateEvent={updateEvent}
          appState={appState}
          readOnly
          embedded
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Modèles réseaux sociaux</h4>
            <p className="text-xs text-gray-500">Textes préremplis à adapter avant publication.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => copyText('partants', partantsCopy)}
            >
              {copiedKey === 'partants' ? 'Copié ✓' : 'Copier annonce partantes'}
            </ActionButton>
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => copyText('results', resultsCopy)}
            >
              {copiedKey === 'results' ? 'Copié ✓' : 'Copier brouillon résultats'}
            </ActionButton>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-800 font-sans">
            {partantsCopy}
          </pre>
          <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-800 font-sans">
            {resultsCopy}
          </pre>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Partantes ({selectedRiders.length})
        </h4>
        {selectedRiders.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 italic">
            Aucune coureuse sélectionnée — demandez la validation de la sélection à l&apos;encadrement.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedRiders.map(rider => (
              <RiderMediaCard key={rider.id} rider={rider} />
            ))}
          </ul>
        )}
      </section>

      {ficheGroups.length > 0 && (
        <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-violet-950">
            Fiche de poste communication
          </h4>
          <div className="mt-3 space-y-4">
            {ficheGroups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-violet-800">{group.label}</p>
                <ul className="mt-1.5 space-y-1">
                  {group.items.map(task => (
                    <li key={task.name} className="flex items-start gap-2 text-sm text-violet-950">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      {task.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {(sponsors.length > 0 || newsletterSummary.recent.length > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-950">
            Partenaires & contenus
          </h4>
          {sponsors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-amber-900 mb-2">
                Sponsors actifs — visibilité à prévoir sur cette épreuve
              </p>
              <ul className="space-y-2">
                {sponsors.slice(0, 8).map(sponsor => (
                  <li
                    key={sponsor.id}
                    className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-900">
                      {sponsor.sponsorCompanyName || sponsor.description}
                    </p>
                    {sponsor.partnershipCounterparts && (
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {sponsor.partnershipCounterparts}
                      </p>
                    )}
                    {(sponsor.partnershipDeliverables?.length ?? 0) > 0 && (
                      <ul className="mt-1 text-xs text-amber-900/80">
                        {sponsor.partnershipDeliverables!.slice(0, 3).map(d => (
                          <li key={d.id}>• {d.label}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {newsletterSummary.recent.length > 0 && (
            <div className="mt-4 pt-3 border-t border-amber-200/80">
              <p className="text-xs text-amber-900">
                Newsletters partenaires : {newsletterSummary.published} publiée
                {newsletterSummary.published > 1 ? 's' : ''}
                {newsletterSummary.drafts > 0
                  ? ` · ${newsletterSummary.drafts} brouillon${newsletterSummary.drafts > 1 ? 's' : ''}`
                  : ''}
              </p>
              <ul className="mt-2 text-sm text-gray-800 space-y-1">
                {newsletterSummary.recent.slice(0, 3).map(nl => (
                  <li key={nl.id}>
                    {nl.title || nl.subject || 'Sans titre'}
                    <span className="ml-2 text-xs text-gray-500">
                      {nl.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-amber-800/80">
                Édition complète des newsletters : Finance › Sponsors (accès manager).
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CommunicationMissionTab;
