import React, { useState } from 'react';
import ActionButton from '../components/ActionButton';
import { useTranslations } from '../hooks/useTranslations';
import { LANGUAGE_OPTIONS } from '../constants';
import { Team, UserRole } from '../types';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';

export interface SignupData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  userRole: UserRole;
}

interface SignupViewProps {
  onRegister: (data: SignupData) => Promise<{ success: boolean; message: string }>;
  onSwitchToLogin: () => void;
  teams: Team[];
}

const SignupView: React.FC<SignupViewProps> = ({ onRegister, onSwitchToLogin, teams }) => {
  const [formData, setFormData] = useState<SignupData>({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      userRole: UserRole.COUREUR, // Rôle par défaut : Coureur
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const { t, language, setLanguage } = useTranslations();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== confirmPassword) {
      setError(t('signupPasswordsMismatch'));
      return;
    }
    
    if (formData.password.length < 6) {
        setError(t('signupPasswordTooShort'));
        return;
    }

    // Vérifier l'acceptation des conditions générales
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
      return;
    }

    setIsLoading(true);
    
    const result = await onRegister(formData);
    
    if (result && !result.success) {
      setError(result.message);
      setIsLoading(false);
    }
    // On success, onAuthStateChanged in App.tsx will handle the rest
  };

  const handleAcceptTerms = () => {
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
    // Relancer la soumission du formulaire
    handleSubmit(new Event('submit') as any);
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setError('Vous devez accepter les conditions générales pour continuer.');
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen relative" style={{ backgroundColor: 'var(--theme-primary-bg)'}}>
      <div className="absolute top-4 right-4">
          <select 
              onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
              value={language}
              className="input-field-sm py-1"
              aria-label="Select language"
          >
              {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-700">{opt.label}</option>)}
          </select>
      </div>
      <div className="w-full max-w-lg p-6 sm:p-8 space-y-6 bg-slate-800 bg-opacity-80 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-100">🚴 {t('signupWelcome')}</h1>
            <p className="mt-2 text-sm text-slate-300">{t('signupSlogan')}</p>
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          <h3 className="text-lg font-semibold text-slate-200">{t('signupYourInfo')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="firstName" placeholder={t('signupFirstName')} required value={formData.firstName} onChange={handleInputChange} className="input-field-sm w-full" />
            <input type="text" name="lastName" placeholder={t('signupLastName')} required value={formData.lastName} onChange={handleInputChange} className="input-field-sm w-full" />
          </div>
          
          <div>
            <input type="email" name="email" placeholder={t('loginEmailPlaceholder')} required value={formData.email} onChange={handleInputChange} className="input-field-sm w-full" />
          </div>
          
          <div>
            <select 
              name="userRole" 
              value={formData.userRole} 
              onChange={handleInputChange}
              className="input-field-sm w-full"
              required
            >
              <option value={UserRole.COUREUR}>🚴 Coureur</option>
              <option value={UserRole.STAFF}>👥 Staff</option>
              <option value={UserRole.MANAGER}>👑 Manager</option>
            </select>
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="password" name="password" placeholder={t('signupPasswordPlaceholder')} required value={formData.password} onChange={handleInputChange} className="input-field-sm w-full" />
                <input type="password" name="confirmPassword" placeholder={t('signupConfirmPasswordPlaceholder')} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field-sm w-full" />
           </div>
          
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          
          <ActionButton type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('signupCreatingButton') : t('signupCreateAccountButton')}
          </ActionButton>
        </form>
         <div className="text-sm text-center text-slate-400">
            {t('signupAlreadyAccount')}{' '}
            <button onClick={onSwitchToLogin} className="font-medium text-blue-400 hover:text-blue-300">
                {t('signupLoginLink')}
            </button>
        </div>
      </div>

      {/* Modal des Conditions Générales */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    </div>
  );
};

export default SignupView;
