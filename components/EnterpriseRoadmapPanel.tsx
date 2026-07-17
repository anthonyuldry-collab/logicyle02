import React from 'react';
import { AppSection } from '../types';
import { TranslationKey } from '../translations';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from './ActionButton';

export interface RoadmapItem {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  status: 'done' | 'partial' | 'planned';
  section?: AppSection;
  tabHint?: string;
}

const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: 'erp',
    titleKey: 'roadmapErpTitle',
    descKey: 'roadmapErpDesc',
    status: 'partial',
    section: 'organizationDashboard',
  },
  {
    id: 'gps',
    titleKey: 'roadmapGpsTitle',
    descKey: 'roadmapGpsDesc',
    status: 'partial',
    section: 'vehicles',
    tabHint: 'gps',
  },
  {
    id: 'native',
    titleKey: 'roadmapNativeTitle',
    descKey: 'roadmapNativeDesc',
    status: 'partial',
  },
  {
    id: 'partner',
    titleKey: 'roadmapPartnerTitle',
    descKey: 'roadmapPartnerDesc',
    status: 'partial',
    section: 'partnerPortal',
  },
  {
    id: 'stocks',
    titleKey: 'roadmapStocksTitle',
    descKey: 'roadmapStocksDesc',
    status: 'partial',
    section: 'stocks',
  },
  {
    id: 'wt',
    titleKey: 'roadmapWtTitle',
    descKey: 'roadmapWtDesc',
    status: 'partial',
    section: 'financial',
    tabHint: 'payroll',
  },
  {
    id: 'uci',
    titleKey: 'roadmapUciTitle',
    descKey: 'roadmapUciDesc',
    status: 'partial',
    section: 'events',
  },
];

const STATUS_STYLE: Record<RoadmapItem['status'], string> = {
  done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  partial: 'bg-amber-100 text-amber-900 border-amber-200',
  planned: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface EnterpriseRoadmapPanelProps {
  onNavigate?: (section: AppSection, tabHint?: string) => void;
  compact?: boolean;
}

const EnterpriseRoadmapPanel: React.FC<EnterpriseRoadmapPanelProps> = ({
  onNavigate,
  compact = false,
}) => {
  const { t } = useTranslations();

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">{t('roadmapEnterpriseTitle')}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">{t('roadmapEnterpriseDesc')}</p>
      <ul className={`space-y-2 ${compact ? 'max-h-72 overflow-y-auto' : ''}`}>
        {ROADMAP_ITEMS.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {index + 1}. {t(item.titleKey)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{t(item.descKey)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[item.status]}`}>
                {t(`roadmapStatus_${item.status}` as TranslationKey)}
              </span>
              {item.section && onNavigate && (
                <ActionButton size="sm" variant="secondary" onClick={() => onNavigate(item.section!, item.tabHint)}>
                  {t('roadmapOpen')}
                </ActionButton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EnterpriseRoadmapPanel;
