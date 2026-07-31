import React, { useState } from 'react';
import { SUPPORT_FAQ_ITEMS } from '../data/supportFaq';
import { LEGAL_ENTITY } from '../legal/meta';
import { useTranslations } from '../hooks/useTranslations';

type SupportFaqPanelProps = {
  /** Variante sombre (landing / public) ou claire (settings in-app). */
  tone?: 'dark' | 'light';
  className?: string;
};

const SupportFaqPanel: React.FC<SupportFaqPanelProps> = ({ tone = 'dark', className = '' }) => {
  const { t, language } = useTranslations();
  const [openId, setOpenId] = useState<string | null>(SUPPORT_FAQ_ITEMS[0]?.id ?? null);
  const isDark = tone === 'dark';

  return (
    <div className={className}>
      <div className="mb-6">
        <h2
          className={`text-2xl sm:text-3xl font-semibold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {t('faqTitle')}
        </h2>
        <p className={`mt-2 text-sm sm:text-base max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {t('faqSubtitle')}
        </p>
      </div>

      <div className="space-y-2">
        {SUPPORT_FAQ_ITEMS.map((item) => {
          const open = openId === item.id;
          return (
            <div
              key={item.id}
              className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
                className={`w-full flex items-start justify-between gap-4 py-4 text-left transition ${
                  isDark ? 'text-slate-100 hover:text-white' : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                <span className="font-medium text-sm sm:text-base">{item.question[language]}</span>
                <span
                  className={`shrink-0 text-lg leading-none mt-0.5 ${
                    isDark ? 'text-indigo-300' : 'text-indigo-600'
                  }`}
                  aria-hidden
                >
                  {open ? '−' : '+'}
                </span>
              </button>
              {open && (
                <p
                  className={`pb-4 text-sm leading-relaxed max-w-3xl ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {item.answer[language]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div
        className={`mt-8 flex flex-wrap items-center gap-3 text-sm ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        <span>{t('faqContactHint')}</span>
        <a
          href={`mailto:${LEGAL_ENTITY.supportEmail}?subject=${encodeURIComponent(
            language === 'fr' ? 'Support LogiCycle' : 'LogiCycle support',
          )}`}
          className={`font-semibold underline-offset-2 hover:underline ${
            isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          {LEGAL_ENTITY.supportEmail}
        </a>
      </div>
    </div>
  );
};

export default SupportFaqPanel;
