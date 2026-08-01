import React, { useMemo } from 'react';
import {
  LEGAL_DISCLAIMER,
  LEGAL_DOC_ORDER,
  LEGAL_DOC_BY_ID,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_ENTITY,
  LEGAL_PACK_VERSION,
  legalHashFor,
  pickLegalLocale,
  type LegalDocId,
} from '../legal';
import { LANGUAGE_OPTIONS } from '../constants';
import { useTranslations } from '../hooks/useTranslations';

interface LegalViewProps {
  docId: LegalDocId;
  language: 'fr' | 'en';
  onLanguageChange: (lang: 'fr' | 'en') => void;
  onSelectDoc: (id: LegalDocId) => void;
  onBack: () => void;
}

function renderBlocks(blocks: string[]) {
  return blocks.map((block, index) => {
    if (block.startsWith('•')) {
      return (
        <li key={index} className="ml-1 text-slate-300 leading-relaxed">
          {block.replace(/^•\s*/, '')}
        </li>
      );
    }
    return (
      <p key={index} className="text-slate-300 leading-relaxed">
        {block}
      </p>
    );
  });
}

const LegalView: React.FC<LegalViewProps> = ({
  docId,
  language,
  onLanguageChange,
  onSelectDoc,
  onBack,
}) => {
  const { t } = useTranslations();
  const locale = pickLegalLocale(language);
  const doc = LEGAL_DOC_BY_ID[docId];

  const groupedSections = useMemo(() => doc.sections, [doc]);

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 75% 20%, rgba(79,70,229,0.35), transparent 55%), radial-gradient(ellipse 50% 40% at 15% 85%, rgba(14,165,233,0.14), transparent 50%), linear-gradient(155deg, #020617 0%, #0f172a 42%, #1e293b 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-18deg, transparent, transparent 22px, #fff 22px, #fff 23px)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-slate-300 hover:text-white transition py-2 pr-2 -ml-1 touch-manipulation"
          >
            ← {t('legalBack')}
          </button>
          <select
            onChange={(e) => onLanguageChange(e.target.value as 'fr' | 'en')}
            value={language}
            aria-label="Select language"
            className="rounded-lg border border-white/15 bg-slate-900/70 text-slate-200 text-sm px-3 py-1.5 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80 mb-2">LogiCycle Legal</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-3">
          {doc.title[locale]}
        </h1>
        <p className="text-slate-400 text-sm mb-2">{doc.summary[locale]}</p>
        <p className="text-xs text-slate-500 mb-6">
          {t('legalVersion')} {doc.version} · {t('legalEffective')} {doc.effectiveDate} · Pack{' '}
          {LEGAL_PACK_VERSION} ({LEGAL_EFFECTIVE_DATE})
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {LEGAL_DOC_ORDER.map((id) => {
            const item = LEGAL_DOC_BY_ID[id];
            const active = id === docId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelectDoc(id);
                  if (typeof window !== 'undefined') {
                    window.location.hash = legalHashFor(id).slice(1);
                  }
                }}
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition border touch-manipulation ${
                  active
                    ? 'bg-indigo-500 border-indigo-400 text-white'
                    : 'bg-slate-900/50 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {item.shortTitle[locale]}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-100/90 text-xs leading-relaxed mb-8">
          {LEGAL_DISCLAIMER[locale]}
        </div>

        <article className="space-y-8 rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-sm p-5 sm:p-8">
          {groupedSections.map((section) => {
            const blocks = section.blocks[locale];
            const hasBullets = blocks.some((b) => b.startsWith('•'));
            const prose = blocks.filter((b) => !b.startsWith('•'));
            const bullets = blocks.filter((b) => b.startsWith('•'));
            return (
              <section key={section.id} id={section.id}>
                <h2 className="text-lg font-semibold text-white mb-3">{section.title[locale]}</h2>
                <div className="space-y-3">
                  {renderBlocks(prose)}
                  {hasBullets && <ul className="list-disc list-outside pl-5 space-y-1.5">{renderBlocks(bullets)}</ul>}
                </div>
              </section>
            );
          })}
        </article>

        <p className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} LogiCycle · {LEGAL_ENTITY.privacyEmail}
        </p>
      </div>
    </div>
  );
};

export default LegalView;
