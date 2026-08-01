import React, { useEffect, useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';

const STORAGE_KEY = 'logicycle_cookies_notice_dismissed';

type EssentialCookiesNoticeProps = {
  onViewCookies?: () => void;
};

/**
 * Avis transparence (cookies essentiels uniquement) — pas un bandeau de consentement
 * marketing : aucun tracker d’audience n’est chargé tant que non ajouté.
 */
const EssentialCookiesNotice: React.FC<EssentialCookiesNoticeProps> = ({ onViewCookies }) => {
  const { t } = useTranslations();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="fixed bottom-0 inset-x-0 z-[80] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-md shadow-2xl shadow-black/40 px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-200 mb-[env(safe-area-inset-bottom)]">
        <p className="flex-1 leading-relaxed text-[13px] sm:text-sm">
          {t('cookiesNoticeBody')}{' '}
          {onViewCookies && (
            <button
              type="button"
              onClick={onViewCookies}
              className="font-semibold text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
            >
              {t('cookiesNoticeLink')}
            </button>
          )}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 w-full sm:w-auto self-stretch sm:self-auto px-4 py-2.5 sm:py-2 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-400 transition touch-manipulation"
        >
          {t('cookiesNoticeDismiss')}
        </button>
      </div>
    </div>
  );
};

export default EssentialCookiesNotice;
