import React, { useMemo, useState } from 'react';
import {
  Mission,
  MissionApplicationStatus,
  MissionPayment,
  TeamInvoiceSettings,
} from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import ActionButton from '../../components/ActionButton';
import { getMissionApplications, isDemoMission } from '../../constants/demoMissions';
import { MISSION_COMMISSION_LABELS } from '../../constants/missionMarketplace';
import {
  exportTeamMissionInvoicePdf,
  exportVacataireDraftMissionInvoicePdf,
} from '../../utils/missionInvoicePdfExport';
import { formatFinancialAmount, formatFinancialDate } from '../../utils/financialUtils';
import { writeGdprAuditLog } from '../../services/gdprService';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

interface FinancialMissionInvoicesTabProps {
  missions: Mission[];
  teamName: string;
  isProTeam?: boolean;
  invoiceSettings?: TeamInvoiceSettings;
  currentUserId?: string;
}

const LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

function centsToEur(cents: number | undefined): number | null {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return null;
  return Math.round(cents) / 100;
}

function escapeCsv(value: string | number | undefined): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportMissionInvoicesCsv(
  teamName: string,
  rows: Array<{
    mission: Mission;
    payment: MissionPayment;
    vacataireName: string;
  }>,
  locale: string,
): void {
  const header = [
    'Date paiement',
    'Statut',
    'Mission',
    'Vacataire',
    'N° facture équipe',
    'N° avoir',
    'N° modèle / facture vacataire',
    'GMV EUR',
    'Commission EUR',
    'Net vacataire EUR',
    'Réf. paiement',
    'Mission ID',
  ].join(',');

  const lines = rows.map(({ mission, payment, vacataireName }) => {
    const gmv = centsToEur(payment.gmvCents);
    const commission = centsToEur(payment.commissionCents);
    const net =
      gmv !== null && commission !== null
        ? Math.round((gmv - commission) * 100) / 100
        : null;
    const vacNumber =
      payment.vacataireInvoiceNumber || payment.vacataireInvoiceDraftNumber || '';
    return [
      escapeCsv(payment.paidAt ? formatFinancialDate(payment.paidAt.slice(0, 10), locale) : ''),
      escapeCsv(payment.status),
      escapeCsv(mission.title),
      escapeCsv(vacataireName),
      escapeCsv(payment.teamInvoiceNumber),
      escapeCsv(payment.creditNoteNumber),
      escapeCsv(vacNumber),
      escapeCsv(gmv ?? ''),
      escapeCsv(commission ?? ''),
      escapeCsv(net ?? ''),
      escapeCsv(payment.paymentIntentId || payment.checkoutSessionId),
      escapeCsv(mission.id),
    ].join(',');
  });

  const blob = new Blob([[header, ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = teamName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'equipe';
  a.download = `factures_missions_${safe}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function auditInvoiceDownload(
  userId: string | undefined,
  missionId: string,
  kind: string,
): Promise<void> {
  if (!userId) return;
  try {
    await writeGdprAuditLog({
      action: 'mission_invoice_downloaded',
      targetId: missionId,
      performedBy: userId,
      method: 'client',
      metadata: { kind },
    });
  } catch {
    /* non-bloquant */
  }
}

async function downloadStoragePdf(
  path: string,
  userId: string | undefined,
  missionId: string,
): Promise<void> {
  const url = await getDownloadURL(ref(storage, path));
  window.open(url, '_blank', 'noopener,noreferrer');
  await auditInvoiceDownload(userId, missionId, 'archive_pdf');
}

const FinancialMissionInvoicesTab: React.FC<FinancialMissionInvoicesTabProps> = ({
  missions,
  teamName,
  isProTeam = false,
  invoiceSettings,
  currentUserId,
}) => {
  const { t, language } = useTranslations();
  const locale = LOCALE_MAP[language] || 'fr-FR';
  const [search, setSearch] = useState('');
  const currentYear = String(new Date().getFullYear());
  const [yearFilter, setYearFilter] = useState<string>(currentYear);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'refunded'>('all');

  const teamBilling = useMemo(
    () => ({
      name: invoiceSettings?.issuerName || teamName,
      address: invoiceSettings?.issuerAddress,
      siret: invoiceSettings?.issuerSiret,
      vatNumber: invoiceSettings?.issuerVatNumber,
    }),
    [invoiceSettings, teamName],
  );

  const paidRows = useMemo(() => {
    return missions
      .filter((m) => !isDemoMission(m.id))
      .filter((m) => m.payment?.status === 'paid' || m.payment?.status === 'refunded')
      .map((mission) => {
        const payment = mission.payment!;
        const accepted = getMissionApplications(mission).find(
          (a) => a.status === MissionApplicationStatus.ACCEPTED,
        );
        const vacataireName = accepted
          ? `${accepted.firstName} ${accepted.lastName}`.trim()
          : '—';
        return { mission, payment, accepted, vacataireName };
      })
      .sort((a, b) => (b.payment.paidAt || '').localeCompare(a.payment.paidAt || ''));
  }, [missions]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>([currentYear]);
    for (const { payment } of paidRows) {
      const y = (payment.paidAt || '').slice(0, 4);
      if (y) years.add(y);
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [paidRows, currentYear]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paidRows.filter(({ mission, payment, vacataireName }) => {
      if (yearFilter !== 'all' && !(payment.paidAt || '').startsWith(yearFilter)) return false;
      if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
      if (!q) return true;
      return (
        mission.title.toLowerCase().includes(q) ||
        vacataireName.toLowerCase().includes(q) ||
        (payment.teamInvoiceNumber || '').toLowerCase().includes(q) ||
        (payment.vacataireInvoiceDraftNumber || '').toLowerCase().includes(q) ||
        (payment.vacataireInvoiceNumber || '').toLowerCase().includes(q) ||
        (payment.creditNoteNumber || '').toLowerCase().includes(q)
      );
    });
  }, [paidRows, search, yearFilter, statusFilter]);

  const totals = useMemo(() => {
    let gmv = 0;
    let commission = 0;
    for (const { payment } of filteredRows) {
      if (payment.status !== 'paid') continue;
      gmv += centsToEur(payment.gmvCents) ?? 0;
      commission += centsToEur(payment.commissionCents) ?? 0;
    }
    return { gmv, commission, net: Math.round((gmv - commission) * 100) / 100 };
  }, [filteredRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('missionInvoicesTitle')}</h3>
          <p className="text-sm text-gray-500">{t('missionInvoicesDesc')}</p>
        </div>
        {filteredRows.length > 0 && (
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => exportMissionInvoicesCsv(teamName, filteredRows, locale)}
          >
            {t('missionInvoicesExportCsv')}
          </ActionButton>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Kpi label={t('missionInvoicesPaidCount')} value={String(filteredRows.length)} />
        <Kpi label={t('missionInvoicesTotalGmv')} value={formatFinancialAmount(totals.gmv, locale)} />
        <Kpi
          label={t('missionInvoicesTotalCommission')}
          value={formatFinancialAmount(totals.commission, locale)}
        />
        <Kpi label={t('missionInvoicesTotalNet')} value={formatFinancialAmount(totals.net, locale)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('financialSearch')}
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">{t('missionInvoicesAllYears')}</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'refunded')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">{t('missionInvoicesAllStatuses')}</option>
          <option value="paid">{t('missionInvoicesStatusPaid')}</option>
          <option value="refunded">{t('missionInvoicesStatusRefunded')}</option>
        </select>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          {paidRows.length === 0 ? t('missionInvoicesEmpty') : t('missionInvoicesNoMatch')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">{t('missionInvoicesColDate')}</th>
                <th className="px-3 py-2 text-left">{t('missionInvoicesColStatus')}</th>
                <th className="px-3 py-2 text-left">{t('missionInvoicesColMission')}</th>
                <th className="px-3 py-2 text-left">{t('missionInvoicesColVacataire')}</th>
                <th className="px-3 py-2 text-left">{t('missionInvoicesColTeamInvoice')}</th>
                <th className="px-3 py-2 text-right">{t('missionInvoicesColGmv')}</th>
                <th className="px-3 py-2 text-right">{t('missionInvoicesColCommission')}</th>
                <th className="px-3 py-2 text-right">{t('financialActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRows.map(({ mission, payment, accepted, vacataireName }) => {
                const gmv = centsToEur(payment.gmvCents);
                const commission = centsToEur(payment.commissionCents);
                return (
                  <tr key={mission.id}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {payment.paidAt
                        ? formatFinancialDate(payment.paidAt.slice(0, 10), locale)
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={payment.status} t={t} />
                    </td>
                    <td className="px-3 py-2">{mission.title}</td>
                    <td className="px-3 py-2">{vacataireName}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {payment.status === 'refunded' && payment.creditNoteNumber
                        ? payment.creditNoteNumber
                        : payment.teamInvoiceNumber || '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {gmv !== null ? formatFinancialAmount(gmv, locale) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {commission !== null ? formatFinancialAmount(commission, locale) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                          <ActionButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            exportTeamMissionInvoicePdf({
                              mission,
                              payment,
                              teamName,
                              accepted,
                              isProTeam,
                              teamBilling: payment.teamBillingSnapshot || teamBilling,
                            });
                            void auditInvoiceDownload(currentUserId, mission.id, 'team');
                          }}
                        >
                          {MISSION_COMMISSION_LABELS.downloadTeamInvoice[language]}
                        </ActionButton>
                        {payment.teamInvoicePdfPath && (
                          <ActionButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              void downloadStoragePdf(payment.teamInvoicePdfPath!, currentUserId, mission.id);
                            }}
                          >
                            {t('missionInvoicesDownloadArchive')}
                          </ActionButton>
                        )}
                        {accepted && (
                          <ActionButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              exportVacataireDraftMissionInvoicePdf({
                                mission,
                                payment,
                                teamName,
                                accepted,
                                isProTeam,
                                business: payment.vacataireBusinessSnapshot,
                              });
                              void auditInvoiceDownload(currentUserId, mission.id, 'vacataire');
                            }}
                          >
                            {MISSION_COMMISSION_LABELS.downloadVacataireDraft[language]}
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">{MISSION_COMMISSION_LABELS.invoiceChainHint[language]}</p>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string; t: (k: string) => string }> = ({ status, t }) => {
  if (status === 'refunded') {
    return (
      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
        {t('missionInvoicesStatusRefunded')}
      </span>
    );
  }
  return (
    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
      {t('missionInvoicesStatusPaid')}
    </span>
  );
};

const Kpi: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border bg-white px-3 py-2">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="mt-0.5 font-semibold text-gray-900">{value}</div>
  </div>
);

export default FinancialMissionInvoicesTab;
