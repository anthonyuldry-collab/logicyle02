import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { REFERRAL_LABELS } from '../constants/referralProgram';
import { getReferralStats, ReferralStats } from '../services/referralService';
import { User } from '../types';
import ActionButton from './ActionButton';

interface ReferralPanelProps {
  currentUser: User;
}

const ReferralPanel: React.FC<ReferralPanelProps> = ({ currentUser }) => {
  const { t, language } = useTranslations();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getReferralStats(currentUser);
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) setError(t('referralLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser.id, t]);

  const copyLink = useCallback(async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [stats]);

  if (loading) {
    return <p className="text-sm text-slate-400">{t('referralLoading')}</p>;
  }

  if (error || !stats) {
    return <p className="text-sm text-rose-300">{error || t('referralLoadError')}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-300">
        {REFERRAL_LABELS.programSubtitle[language]}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-950 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            {t('referralForFriend')}
          </p>
          <p className="mt-1.5 text-base font-semibold leading-snug text-emerald-50">
            {REFERRAL_LABELS.refereeDiscount[language]}
          </p>
        </div>
        <div className="rounded-xl border border-indigo-500/35 bg-indigo-950 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
            {t('referralForYou')}
          </p>
          <p className="mt-1.5 text-base font-semibold leading-snug text-indigo-50">
            {REFERRAL_LABELS.referrerReward[language]}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200">
          {t('referralYourCode')}
        </label>
        <div className="flex flex-wrap gap-2">
          <code className="flex-grow rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100">
            {stats.code}
          </code>
          <ActionButton variant="secondary" size="sm" onClick={copyLink}>
            {copied ? t('referralCopied') : t('referralCopyLink')}
          </ActionButton>
        </div>
        <p className="mt-2 break-all text-xs text-slate-400">{stats.shareUrl}</p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
        <span>
          <strong className="text-white">{stats.convertedReferrals}</strong> {t('referralConverted')}
        </span>
        <span>
          <strong className="text-white">{stats.pendingCredits}</strong> {t('referralCreditsPending')}
        </span>
      </div>

      <p className="border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-400">
        {t('referralIndependentNote')}
      </p>
    </div>
  );
};

export default ReferralPanel;
