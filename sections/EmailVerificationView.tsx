import React, { useState } from 'react';
import { sendEmailVerification, User as FirebaseUser } from 'firebase/auth';
import ActionButton from '../components/ActionButton';
import { useTranslations } from '../hooks/useTranslations';

interface EmailVerificationViewProps {
  firebaseUser: FirebaseUser;
  onLogout: () => void;
  onVerified: () => Promise<void>;
}

const EmailVerificationView: React.FC<EmailVerificationViewProps> = ({
  firebaseUser,
  onLogout,
  onVerified,
}) => {
  const { t } = useTranslations();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setError('');
    setFeedback(null);
    setIsSending(true);
    try {
      await sendEmailVerification(firebaseUser);
      setFeedback(t('verifyEmailSent'));
    } catch {
      setError(t('verifyEmailSendError'));
    } finally {
      setIsSending(false);
    }
  };

  const handleCheck = async () => {
    setError('');
    setFeedback(null);
    setIsChecking(true);
    try {
      await firebaseUser.reload();
      if (firebaseUser.emailVerified) {
        await onVerified();
      } else {
        setFeedback(t('verifyEmailNotYet'));
      }
    } catch {
      setError(t('verifyEmailCheckError'));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white px-4">
      <div className="w-full max-w-md p-8 space-y-5 text-center rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-sm shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-100">{t('verifyEmailTitle')}</h1>
        <p className="text-slate-300 text-sm leading-relaxed">{t('verifyEmailMessage')}</p>
        <p className="text-sm font-medium text-indigo-300 break-all">{firebaseUser.email}</p>
        <p className="text-xs text-slate-400">{t('verifyEmailHint')}</p>

        {feedback && (
          <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-xl px-3 py-2">
            {feedback}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-2 space-y-2">
          <ActionButton onClick={handleCheck} className="w-full" disabled={isChecking}>
            {isChecking ? t('verifyEmailChecking') : t('verifyEmailCheckButton')}
          </ActionButton>
          <ActionButton onClick={handleResend} variant="secondary" className="w-full" disabled={isSending}>
            {isSending ? t('verifyEmailSending') : t('verifyEmailResend')}
          </ActionButton>
          <ActionButton onClick={onLogout} variant="secondary" className="w-full">
            {t('sidebarLogout')}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationView;
