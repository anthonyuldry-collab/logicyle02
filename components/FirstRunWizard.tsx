import React from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { dismissFirstRun, FirstRunStep } from '../utils/firstRunWizard';
import ActionButton from './ActionButton';

interface FirstRunWizardProps {
  teamId: string;
  step: FirstRunStep;
  riderCount: number;
  eventCount: number;
  onGoRoster: () => void;
  onGoEvents: () => void;
  onDismiss: () => void;
}

const FirstRunWizard: React.FC<FirstRunWizardProps> = ({
  teamId,
  step,
  riderCount,
  eventCount,
  onGoRoster,
  onGoEvents,
  onDismiss,
}) => {
  const { t } = useTranslations();

  if (step === 'done') {
    return null;
  }

  const handleSkip = () => {
    dismissFirstRun(teamId);
    onDismiss();
  };

  const handleCompleteAndGo = (go: () => void) => {
    go();
  };

  return (
    <div className="mb-4 rounded-xl border border-indigo-500/40 bg-indigo-950/40 px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
            {t('firstRunBadge')}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">{t('firstRunTitle')}</h3>
          <p className="mt-1 text-sm text-slate-300 leading-relaxed">{t('firstRunSubtitle')}</p>
          <ol className="mt-3 space-y-1.5 text-sm text-slate-300">
            <li className={riderCount > 0 ? 'text-emerald-300' : ''}>
              {riderCount > 0 ? '✓' : '1.'} {t('firstRunStepRoster')}
              {riderCount > 0 ? ` (${riderCount})` : ''}
            </li>
            <li className={eventCount > 0 ? 'text-emerald-300' : step === 'event' ? 'text-indigo-200 font-medium' : ''}>
              {eventCount > 0 ? '✓' : '2.'} {t('firstRunStepEvent')}
              {eventCount > 0 ? ` (${eventCount})` : ''}
            </li>
            <li className="text-slate-400">3. {t('firstRunStepLogistics')}</li>
          </ol>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {step === 'roster' && (
            <ActionButton onClick={() => handleCompleteAndGo(onGoRoster)} size="sm">
              {t('firstRunCtaRoster')}
            </ActionButton>
          )}
          {step === 'event' && (
            <ActionButton onClick={() => handleCompleteAndGo(onGoEvents)} size="sm">
              {t('firstRunCtaEvent')}
            </ActionButton>
          )}
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            {t('firstRunSkip')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirstRunWizard;
