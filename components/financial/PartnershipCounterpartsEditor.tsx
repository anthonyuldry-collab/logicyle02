import React, { useMemo, useState } from 'react';
import {
  CounterpartDeliverableStatus,
  IncomeCategory,
  PartnerCounterpartDeliverable,
  SponsorshipCounterpartCategory,
} from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import {
  SPONSORSHIP_COUNTERPART_CATALOG,
  SPONSORSHIP_COUNTERPART_CATEGORIES,
  buildSuggestedDeliverables,
  createBlankDeliverable,
  createDeliverableFromCatalog,
  formatDeliverablesAsContractText,
  getCounterpartCategoryLabel,
} from '../../utils/counterpartDeliverableUtils';

interface PartnershipCounterpartsEditorProps {
  items: PartnerCounterpartDeliverable[];
  category: IncomeCategory;
  canEdit: boolean;
  /** dark = modal contrat ; light = formulaire revenu */
  variant?: 'dark' | 'light';
  onChange: (items: PartnerCounterpartDeliverable[], contractText: string) => void;
}

const PartnershipCounterpartsEditor: React.FC<PartnershipCounterpartsEditorProps> = ({
  items,
  category,
  canEdit,
  variant = 'dark',
  onChange,
}) => {
  const { t, language } = useTranslations();
  const lang = language === 'en' ? 'en' : 'fr';
  const [catalogFilter, setCatalogFilter] = useState<SponsorshipCounterpartCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dark = variant === 'dark';
  const box = dark
    ? 'rounded-lg border border-white/10 bg-slate-950/40'
    : 'rounded-lg border border-gray-200 bg-white';
  const input = dark
    ? 'w-full rounded-md border border-white/15 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:opacity-50'
    : 'w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:opacity-50';
  const labelCls = dark ? 'text-xs text-slate-400' : 'text-xs text-gray-500';
  const chip =
    dark
      ? 'rounded-md border border-white/10 bg-slate-900/80 px-2 py-1 text-xs text-slate-200 hover:border-indigo-400/50 hover:text-indigo-200 disabled:opacity-40'
      : 'rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:border-blue-400 hover:text-blue-700 disabled:opacity-40';
  const chipActive = dark
    ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
    : 'border-blue-400 bg-blue-50 text-blue-800';

  const emit = (next: PartnerCounterpartDeliverable[]) => {
    onChange(next, formatDeliverablesAsContractText(next, lang));
  };

  const catalog = useMemo(() => {
    if (catalogFilter === 'all') return SPONSORSHIP_COUNTERPART_CATALOG;
    return SPONSORSHIP_COUNTERPART_CATALOG.filter((c) => c.category === catalogFilter);
  }, [catalogFilter]);

  const addFromCatalog = (catalogId: string) => {
    const created = createDeliverableFromCatalog(catalogId, lang);
    if (!created) return;
    emit([...items, created]);
    setExpandedId(created.id);
  };

  const applySuggestedPack = () => {
    const pack = buildSuggestedDeliverables(category, lang);
    emit(pack);
    if (pack[0]) setExpandedId(pack[0].id);
  };

  const updateItem = (id: string, patch: Partial<PartnerCounterpartDeliverable>) => {
    emit(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    emit(items.filter((i) => i.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addBlank = () => {
    const blank = createBlankDeliverable(lang);
    emit([...items, blank]);
    setExpandedId(blank.id);
  };

  return (
    <div className="space-y-4">
      <div className={`${box} p-3 space-y-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
            {t('counterpartsEditorHint')}
          </p>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip} onClick={applySuggestedPack}>
                {t('counterpartsSuggestPack')}
              </button>
              <button type="button" className={chip} onClick={addBlank}>
                {t('counterpartsAddCustom')}
              </button>
            </div>
          )}
        </div>

        {canEdit && (
          <>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                className={`${chip} ${catalogFilter === 'all' ? chipActive : ''}`}
                onClick={() => setCatalogFilter('all')}
              >
                {t('counterpartsFilterAll')}
              </button>
              {SPONSORSHIP_COUNTERPART_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${chip} ${catalogFilter === cat ? chipActive : ''}`}
                  onClick={() => setCatalogFilter(cat)}
                >
                  {getCounterpartCategoryLabel(cat, lang)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {catalog.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={chip}
                  title={lang === 'en' ? c.notesEn || c.labelEn : c.notesFr || c.labelFr}
                  onClick={() => addFromCatalog(c.id)}
                >
                  + {lang === 'en' ? c.labelEn : c.labelFr}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <p className={`text-sm italic ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
          {t('counterpartsEmpty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const open = expandedId === item.id;
            return (
              <li key={item.id} className={`${box} overflow-hidden`}>
                <div className="flex items-start gap-2 p-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      dark ? 'bg-indigo-500/20 text-indigo-200' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {getCounterpartCategoryLabel(item.category, lang)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${dark ? 'text-slate-100' : 'text-gray-900'}`}>
                      {item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''} — ` : ''}
                      {item.label || t('counterpartsUntitled')}
                    </p>
                    <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {[item.placement, item.channel, item.frequency].filter(Boolean).join(' · ') ||
                        t('counterpartsNoDetails')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className={chip}
                      onClick={() => setExpandedId(open ? null : item.id)}
                    >
                      {open ? t('counterpartsCollapse') : t('counterpartsEdit')}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        className={`${chip} ${dark ? 'text-rose-300' : 'text-red-600'}`}
                        onClick={() => removeItem(item.id)}
                        aria-label={t('counterpartsRemove')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {open && (
                  <div
                    className={`grid gap-2 border-t p-3 sm:grid-cols-2 ${
                      dark ? 'border-white/10' : 'border-gray-100'
                    }`}
                  >
                    <div className="sm:col-span-2">
                      <label className={labelCls}>{t('counterpartsLabel')}</label>
                      <input
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.label}
                        onChange={(e) => updateItem(item.id, { label: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('counterpartsCategory')}</label>
                      <select
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.category || 'other'}
                        onChange={(e) =>
                          updateItem(item.id, {
                            category: e.target.value as SponsorshipCounterpartCategory,
                          })
                        }
                      >
                        {SPONSORSHIP_COUNTERPART_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {getCounterpartCategoryLabel(cat, lang)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{t('counterpartsStatus')}</label>
                      <select
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.status}
                        onChange={(e) =>
                          updateItem(item.id, {
                            status: e.target.value as CounterpartDeliverableStatus,
                          })
                        }
                      >
                        <option value={CounterpartDeliverableStatus.PLANNED}>
                          {t('counterpartStatusPlanned')}
                        </option>
                        <option value={CounterpartDeliverableStatus.IN_PROGRESS}>
                          {t('counterpartStatusInProgress')}
                        </option>
                        <option value={CounterpartDeliverableStatus.DELIVERED}>
                          {t('counterpartStatusDelivered')}
                        </option>
                        <option value={CounterpartDeliverableStatus.VALIDATED}>
                          {t('counterpartStatusValidated')}
                        </option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>{t('counterpartsQuantity')}</label>
                        <input
                          type="number"
                          min={0}
                          className={`${input} mt-0.5`}
                          disabled={!canEdit}
                          value={item.quantity ?? ''}
                          onChange={(e) =>
                            updateItem(item.id, {
                              quantity: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t('counterpartsUnit')}</label>
                        <input
                          className={`${input} mt-0.5`}
                          disabled={!canEdit}
                          value={item.unit || ''}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                          placeholder={lang === 'en' ? 'posts, invites…' : 'publications, invitations…'}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{t('counterpartsFrequency')}</label>
                      <input
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.frequency || ''}
                        onChange={(e) => updateItem(item.id, { frequency: e.target.value })}
                        placeholder={lang === 'en' ? 'per month / season' : 'par mois / saison'}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('counterpartsPlacement')}</label>
                      <input
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.placement || ''}
                        onChange={(e) => updateItem(item.id, { placement: e.target.value })}
                        placeholder={lang === 'en' ? 'Chest, sleeve…' : 'Poitrine, manche…'}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('counterpartsChannel')}</label>
                      <input
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.channel || ''}
                        onChange={(e) => updateItem(item.id, { channel: e.target.value })}
                        placeholder={lang === 'en' ? 'Jersey, Instagram…' : 'Maillot, Instagram…'}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>{t('counterpartsDueDate')}</label>
                      <input
                        type="date"
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.dueDate || ''}
                        onChange={(e) => updateItem(item.id, { dueDate: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>{t('counterpartsNotes')}</label>
                      <textarea
                        rows={2}
                        className={`${input} mt-0.5`}
                        disabled={!canEdit}
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                        placeholder={t('counterpartsNotesPh')}
                      />
                    </div>
                    <p className={`sm:col-span-2 text-[11px] ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
                      #{index + 1} · {t('counterpartsLineHint')}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <details className={`${box} p-3`}>
          <summary
            className={`cursor-pointer text-xs font-medium ${dark ? 'text-slate-300' : 'text-gray-600'}`}
          >
            {t('counterpartsContractPreview')}
          </summary>
          <pre
            className={`mt-2 whitespace-pre-wrap text-xs leading-relaxed ${
              dark ? 'text-slate-400' : 'text-gray-600'
            }`}
          >
            {formatDeliverablesAsContractText(items, lang) || '—'}
          </pre>
        </details>
      )}
    </div>
  );
};

export default PartnershipCounterpartsEditor;
