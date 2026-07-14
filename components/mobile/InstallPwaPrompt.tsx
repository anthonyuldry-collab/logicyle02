import React, { useEffect, useState } from 'react';
import { useTranslations } from '../../hooks/useTranslations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPwaPrompt: React.FC = () => {
  const { t } = useTranslations();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('pwa-install-dismissed') === '1'
  );

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1');
    setDismissed(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto md:hidden">
      <div className="bg-slate-800 text-white rounded-xl shadow-xl p-4 flex flex-col gap-3">
        <p className="text-sm font-medium">{t('pwaInstallTitle')}</p>
        <p className="text-xs text-slate-300">{t('pwaInstallDesc')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {t('pwaInstallButton')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm text-slate-400 hover:text-white py-2.5 px-3 transition-colors"
          >
            {t('pwaInstallDismiss')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPwaPrompt;
