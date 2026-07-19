import React, { useMemo, useState } from 'react';
import {
  IncomeItem,
  PartnerAccess,
  PartnerMediaItem,
  PartnerNewsletter,
  PartnerRaceReport,
  RaceEvent,
  TeamInvoiceSettings,
} from '../types';
import SectionWrapper from '../components/SectionWrapper';
import { useTranslations } from '../hooks/useTranslations';
import {
  ALL_PARTNER_SCOPES,
  buildPartnerDashboard,
  canPartnerView,
  getPartnerScopeLabel,
} from '../utils/partnerAccessUtils';
import { formatFinancialAmount, formatFinancialDate } from '../utils/financialUtils';
import ActionButton from '../components/ActionButton';
import { exportPartnershipConventionPdf } from '../utils/partnershipPdfExport';
import PartnerNewsletterReader from '../components/PartnerNewsletterReader';
import {
  deliverableProgress,
  filterNewslettersForPartner,
  getDeliverablesForIncome,
} from '../utils/partnerNewsletterUtils';
import { countPublishedMedia, filterMediaForPartner } from '../utils/partnerMediaUtils';
import {
  countPublishedRaceReports,
  filterRaceReportsForPartner,
  findReportForEvent,
} from '../utils/partnerRaceReportUtils';

interface PartnerPortalSectionProps {
  access: PartnerAccess;
  incomeItem: IncomeItem;
  teamName: string;
  raceEvents?: RaceEvent[];
  invoiceSettings?: TeamInvoiceSettings;
  partnerNewsletters?: PartnerNewsletter[];
  partnerMediaItems?: PartnerMediaItem[];
  partnerRaceReports?: PartnerRaceReport[];
  themePrimaryColor?: string;
  isPreview?: boolean;
  /** Aperçu service com : bannière dédiée (scopes déjà restreints). */
  isCommsPreview?: boolean;
}

type PartnerTab = 'overview' | 'comms' | 'media' | 'results' | 'counterparts' | 'events' | 'documents';

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

const DELIVERABLE_STATUS_STYLE: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-800',
  delivered: 'bg-blue-100 text-blue-800',
  validated: 'bg-emerald-100 text-emerald-800',
};

const PartnerPortalSection: React.FC<PartnerPortalSectionProps> = ({
  access,
  incomeItem,
  teamName,
  raceEvents = [],
  invoiceSettings,
  partnerNewsletters = [],
  partnerMediaItems = [],
  partnerRaceReports = [],
  themePrimaryColor = '#4338ca',
  isPreview = false,
  isCommsPreview = false,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const scopes = access.scopes?.length ? access.scopes : ALL_PARTNER_SCOPES;
  const scopedAccess = { ...access, scopes };

  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);

  const dashboard = useMemo(
    () => buildPartnerDashboard({ access: scopedAccess, incomeItem, teamName, events: raceEvents }),
    [access, scopes, incomeItem, teamName, raceEvents],
  );

  const newsletters = useMemo(
    () => filterNewslettersForPartner(partnerNewsletters, access.teamId, incomeItem.id),
    [partnerNewsletters, access.teamId, incomeItem.id],
  );

  const mediaItems = useMemo(
    () => filterMediaForPartner(partnerMediaItems, access.teamId, incomeItem.id),
    [partnerMediaItems, access.teamId, incomeItem.id],
  );

  const raceReports = useMemo(
    () => filterRaceReportsForPartner(partnerRaceReports, access.teamId, incomeItem.id),
    [partnerRaceReports, access.teamId, incomeItem.id],
  );

  const publishedMediaCount = useMemo(
    () => countPublishedMedia(partnerMediaItems, access.teamId, incomeItem.id),
    [partnerMediaItems, access.teamId, incomeItem.id],
  );

  const publishedResultsCount = useMemo(
    () => countPublishedRaceReports(partnerRaceReports, access.teamId, incomeItem.id),
    [partnerRaceReports, access.teamId, incomeItem.id],
  );

  const deliverables = useMemo(
    () => getDeliverablesForIncome(incomeItem, language),
    [incomeItem, language],
  );

  const deliverableStats = useMemo(() => deliverableProgress(deliverables), [deliverables]);

  const selectedNewsletter = newsletters.find((n) => n.id === selectedNewsletterId) || newsletters[0];

  const tabs: { id: PartnerTab; labelKey: string; visible: boolean; badge?: number }[] = [
    { id: 'overview', labelKey: 'partnerTabOverview', visible: true },
    { id: 'comms', labelKey: 'partnerTabComms', visible: canPartnerView('view_comms', scopedAccess), badge: newsletters.length },
    { id: 'media', labelKey: 'partnerTabMedia', visible: canPartnerView('view_media', scopedAccess), badge: publishedMediaCount },
    { id: 'results', labelKey: 'partnerTabResults', visible: canPartnerView('view_results', scopedAccess), badge: publishedResultsCount },
    {
      id: 'counterparts',
      labelKey: 'partnerTabCounterparts',
      visible: canPartnerView('view_counterparts', scopedAccess),
    },
    { id: 'events', labelKey: 'partnerTabEvents', visible: canPartnerView('view_events', scopedAccess) },
    {
      id: 'documents',
      labelKey: 'partnerTabDocuments',
      visible:
        canPartnerView('view_documents', scopedAccess)
        || canPartnerView('view_payment_status', scopedAccess),
    },
  ];

  if (!access.isActive) {
    return (
      <SectionWrapper title={t('partnerPortalTitle')}>
        <p className="text-sm text-gray-500">{t('partnerAccessRevoked')}</p>
      </SectionWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6">
      {isPreview && (
        <div className={`mb-4 max-w-5xl mx-auto rounded-lg border px-4 py-3 text-sm ${
          isCommsPreview
            ? 'border-sky-200 bg-sky-50 text-sky-950'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}>
          {isCommsPreview ? t('partnerCommsPreviewHint') : t('partnerPortalPreviewHint')}
        </div>
      )}

      <div
        className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-xl mb-6 text-white relative"
        style={{ background: `linear-gradient(135deg, #0f172a 0%, ${themePrimaryColor} 85%)` }}
      >
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IndoaXRlIi8+PC9zdmc+')]" />
        <div className="relative px-6 sm:px-10 py-10 sm:py-14">
          <p className="text-sm opacity-80 uppercase tracking-wider">{t('partnerWelcome')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2">{dashboard.sponsorName}</h1>
          <p className="text-lg opacity-90 mt-2">{teamName}</p>
          {dashboard.contractStart && dashboard.contractEnd && (
            <div className="mt-6 max-w-md">
              <div className="flex justify-between text-xs opacity-80 mb-1">
                <span>{formatFinancialDate(dashboard.contractStart, locale)}</span>
                <span>{formatFinancialDate(dashboard.contractEnd, locale)}</span>
              </div>
              {dashboard.contractProgressPercent != null && (
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white/90 rounded-full transition-all"
                    style={{ width: `${dashboard.contractProgressPercent}%` }}
                  />
                </div>
              )}
              <p className="text-xs opacity-70 mt-1">{t('partnerContractProgress')}</p>
            </div>
          )}
          {(dashboard.contactName || dashboard.contactEmail) && (
            <p className="mt-4 text-sm opacity-80">
              {t('partnerContact')}: {dashboard.contactName || dashboard.contactEmail}
              {dashboard.contactEmail && dashboard.contactName ? ` · ${dashboard.contactEmail}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto mb-6 flex flex-wrap gap-2">
        {tabs.filter((tab) => tab.visible).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t(tab.labelKey as 'partnerTabOverview')}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px]">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {canPartnerView('view_budget', scopedAccess) && (
              <KpiCard title={t('partnerBudget')} accent={themePrimaryColor}>
                <p className="text-2xl font-bold text-slate-900">
                  {formatFinancialAmount(dashboard.allocatedBudget, locale)}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dashboard.contractDescription}</p>
              </KpiCard>
            )}
            {canPartnerView('view_payment_status', scopedAccess) && (
              <KpiCard title={t('partnerPaymentStatus')}>
                <StatusPill status={dashboard.paymentStatus} t={t} />
              </KpiCard>
            )}
            {canPartnerView('view_counterparts', scopedAccess) && (
              <KpiCard title={t('partnerDeliverablesProgress')}>
                <p className="text-2xl font-bold text-slate-900">{deliverableStats.percent}%</p>
                <p className="text-xs text-gray-500">
                  {deliverableStats.done}/{deliverableStats.total} {t('partnerDeliverablesDone')}
                </p>
              </KpiCard>
            )}
            {canPartnerView('view_comms', scopedAccess) && (
              <KpiCard title={t('partnerTabComms')}>
                <p className="text-2xl font-bold text-slate-900">{newsletters.length}</p>
                <p className="text-xs text-gray-500">{t('partnerNewslettersAvailable')}</p>
              </KpiCard>
            )}
            {canPartnerView('view_media', scopedAccess) && (
              <KpiCard title={t('partnerMediaKpi')}>
                <p className="text-2xl font-bold text-slate-900">{publishedMediaCount}</p>
              </KpiCard>
            )}
            {canPartnerView('view_results', scopedAccess) && (
              <KpiCard title={t('partnerResultsKpi')}>
                <p className="text-2xl font-bold text-slate-900">{publishedResultsCount}</p>
              </KpiCard>
            )}
          </div>
        )}

        {activeTab === 'comms' && canPartnerView('view_comms', scopedAccess) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('partnerNewslettersTabDesc')}</p>
            {newsletters.length === 0 ? (
              <EmptyState message={t('partnerNewsletterEmpty')} />
            ) : (
              <>
                {newsletters.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {newsletters.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setSelectedNewsletterId(n.id)}
                        className={`rounded-lg px-3 py-2 text-sm border ${
                          (selectedNewsletter?.id === n.id)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        {n.title}
                      </button>
                    ))}
                  </div>
                )}
                {selectedNewsletter && (
                  <PartnerNewsletterReader
                    newsletter={selectedNewsletter}
                    teamName={teamName}
                    sponsorName={dashboard.sponsorName}
                    accentColor={themePrimaryColor}
                  />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'media' && canPartnerView('view_media', scopedAccess) && (
          <div className="space-y-4">
            {mediaItems.length === 0 ? (
              <EmptyState message={t('partnerMediaEmpty')} />
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {mediaItems.map((item) => {
                  const eventName = item.eventId
                    ? raceEvents.find((e) => e.id === item.eventId)?.name
                    : undefined;
                  return (
                    <li key={item.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                      <a href={item.photoUrl} target="_blank" rel="noreferrer">
                        <img
                          src={item.photoUrl}
                          alt={item.caption || eventName || ''}
                          className="h-40 w-full object-cover hover:opacity-95 transition-opacity"
                        />
                      </a>
                      <div className="p-3">
                        {item.caption && (
                          <p className="text-sm text-gray-800 line-clamp-2">{item.caption}</p>
                        )}
                        {eventName && (
                          <p className="text-xs text-gray-500 mt-1">{eventName}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'results' && canPartnerView('view_results', scopedAccess) && (
          <div className="space-y-4">
            {raceReports.length === 0 ? (
              <EmptyState message={t('partnerResultsEmpty')} />
            ) : (
              <ul className="space-y-3">
                {raceReports.map((report) => {
                  const event = raceEvents.find((e) => e.id === report.eventId);
                  return (
                    <li key={report.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div>
                        <h3 className="font-semibold text-gray-900">{event?.name || report.eventId}</h3>
                        {event && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatFinancialDate(event.date, locale)}
                            {event.location ? ` · ${event.location}` : ''}
                          </p>
                        )}
                      </div>
                      {report.raceOverallRanking && (
                        <p className="mt-3 text-sm">
                          <span className="font-medium text-gray-500">{t('partnerResultsOverall')} : </span>
                          <span className="text-gray-900">{report.raceOverallRanking}</span>
                        </p>
                      )}
                      {report.teamRiderRankings && (
                        <p className="mt-2 text-sm whitespace-pre-wrap">
                          <span className="font-medium text-gray-500">{t('partnerResultsTeam')} : </span>
                          <span className="text-gray-900">{report.teamRiderRankings}</span>
                        </p>
                      )}
                      {report.resultsSummary && (
                        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">{t('partnerResultsSummary')}</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{report.resultsSummary}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'counterparts' && canPartnerView('view_counterparts', scopedAccess) && (
          <div className="space-y-4">
            <Card title={t('partnerDeliverablesTitle')}>
              <div className="mb-4 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${deliverableStats.percent}%` }}
                />
              </div>
              <ul className="space-y-2">
                {deliverables.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                  >
                    <span className="text-sm text-gray-800">{d.label}</span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      DELIVERABLE_STATUS_STYLE[d.status] || DELIVERABLE_STATUS_STYLE.planned
                    }`}>
                      {t(`partnerDeliverable_${d.status}` as 'partnerDeliverable_planned')}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            {dashboard.counterparts && (
              <Card title={t('partnerCounterparts')}>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{dashboard.counterparts}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'events' && canPartnerView('view_events', scopedAccess) && (
          <Card title={t('partnerEvents')}>
            {dashboard.upcomingEvents.length === 0 ? (
              <EmptyState message={t('partnerPortalEmpty')} />
            ) : (
              <ul className="divide-y">
                {dashboard.upcomingEvents.map((e) => {
                  const report = findReportForEvent(partnerRaceReports, e.id, incomeItem.id);
                  const published = report?.status === 'published'
                    && (!report.incomeItemId || report.incomeItemId === incomeItem.id);
                  return (
                    <li key={e.id} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                      <div>
                        <p className="font-medium text-gray-900">{e.name}</p>
                        {e.location && <p className="text-xs text-gray-500">{e.location}</p>}
                        {published && canPartnerView('view_results', scopedAccess) && (
                          <button
                            type="button"
                            className="mt-1 text-xs font-medium text-emerald-700 hover:underline"
                            onClick={() => setActiveTab('results')}
                          >
                            {t('partnerResultsViewLink')} →
                          </button>
                        )}
                      </div>
                      <span className="text-sm text-indigo-600 font-medium shrink-0">
                        {formatFinancialDate(e.date, locale)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        {activeTab === 'documents' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {canPartnerView('view_documents', scopedAccess) && (
              <Card title={t('partnerDocuments')}>
                {dashboard.conventionNumber && (
                  <p className="text-sm">{t('partnerConvention')}: {dashboard.conventionNumber}</p>
                )}
                {dashboard.cerfaReceiptNumber && (
                  <p className="text-sm mt-1">{t('partnerCerfa')}: {dashboard.cerfaReceiptNumber}</p>
                )}
                {incomeItem.conventionNumber && invoiceSettings && (
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() =>
                      exportPartnershipConventionPdf(incomeItem, invoiceSettings, teamName, language)
                    }
                  >
                    {t('partnerDownloadConvention')}
                  </ActionButton>
                )}
              </Card>
            )}
            {canPartnerView('view_payment_status', scopedAccess) && (
              <Card title={t('partnerTabInvoices')}>
                <div className="space-y-2 text-sm">
                  <p><strong>{t('quoteNumber')}:</strong> {incomeItem.invoiceNumber || '—'}</p>
                  <p><strong>{t('partnerPaymentStatus')}:</strong>{' '}
                    <StatusPill status={dashboard.paymentStatus} t={t} />
                  </p>
                  <p><strong>{t('quoteAmount')}:</strong>{' '}
                    {formatFinancialAmount(dashboard.allocatedBudget, locale)}
                  </p>
                  {dashboard.paidAt && (
                    <p><strong>{t('partnerPaidAt')}:</strong> {formatFinancialDate(dashboard.paidAt, locale)}</p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 pb-8">
          {t('partnerScopes')}: {scopes.map((s) => getPartnerScopeLabel(s, language)).join(' · ')}
        </p>
      </div>
    </div>
  );
};

function KpiCard({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <div className="mt-2">{children}</div>
      {accent && <div className="mt-3 h-1 w-8 rounded-full" style={{ background: accent }} />}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (k: string) => string }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    invoiced: 'bg-blue-100 text-blue-800',
    pending: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {t(`partnerStatus_${status}`)}
    </span>
  );
}

export default PartnerPortalSection;
