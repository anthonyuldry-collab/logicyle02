


import React, { useState, useEffect } from 'react';
import SectionWrapper from '../components/SectionWrapper';
import ActionButton from '../components/ActionButton';
import { DEFAULT_THEME_PRIMARY_COLOR, DEFAULT_THEME_ACCENT_COLOR, LANGUAGE_OPTIONS } from '../constants';
import { TeamLevel, Team, Address, SubscriptionPlanId, User, TeamOperationalSettings, RaceEvent } from '../types';
import TeamOperationalSettingsPanel from '../components/TeamOperationalSettingsPanel';
import { getPlanById, formatPriceEur } from '../constants/subscriptionPlans';
import { SubscriptionAccess } from '../utils/subscriptionEntitlements';
import ReferralPanel from '../components/ReferralPanel';
import UploadIcon from '../components/icons/UploadIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTranslations } from '../hooks/useTranslations';


export interface SettingsSectionProps {
  teamLogoBase64?: string;
  teamLogoMimeType?: string;
  setTeamLogoBase64: (logo?: string) => void;
  setTeamLogoMimeType: (mimeType?: string) => void;
  themePrimaryColor?: string;
  setThemePrimaryColor: (color?: string) => void;
  themeAccentColor?: string;
  setThemeAccentColor: (color?: string) => void;
  teamLevel?: TeamLevel;
  setTeamLevel: (level: TeamLevel) => void;
  operationalSettings?: TeamOperationalSettings;
  setOperationalSettings: (settings: TeamOperationalSettings) => void;
  onSaveOperationalSettings?: () => Promise<void>;
  onTeamLevelChanged?: (level: TeamLevel) => void;
  onNavigateToChecklist?: () => void;
  raceEvents?: RaceEvent[];
  language?: 'fr' | 'en';
  setLanguage: (lang: 'fr' | 'en') => void;
  team?: Team;
  onUpdateTeam: (team: Team) => void;
  canDeleteTeam?: boolean;
  onDeleteTeam?: (password: string) => Promise<void>;
  subscriptionAccess?: SubscriptionAccess;
  onUpgradePlan?: (planId: SubscriptionPlanId) => Promise<void>;
  onManageBillingPortal?: () => Promise<void>;
  currentUser?: User;
  /** Installe le pack équipe fictive « Horizon Atlantique » (présentation) */
  onInstallPresentationDemo?: () => Promise<{
    teamName: string;
    riders: number;
    staff: number;
    events: number;
    entityCount: number;
  }>;
  presentationDemoAlreadyInstalled?: boolean;
  /** Si true, n'affiche pas le SectionWrapper (page Paramètres unifiée). */
  embedded?: boolean;
  /** Ouvre l’onglet Abonnement des paramètres unifiés */
  onNavigateToSubscription?: () => void;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const SettingsSection: React.FC<SettingsSectionProps> = ({
  teamLogoBase64,
  teamLogoMimeType,
  setTeamLogoBase64,
  setTeamLogoMimeType,
  themePrimaryColor,
  setThemePrimaryColor,
  themeAccentColor,
  setThemeAccentColor,
  teamLevel,
  setTeamLevel,
  operationalSettings,
  setOperationalSettings,
  onSaveOperationalSettings,
  onTeamLevelChanged,
  onNavigateToChecklist,
  raceEvents,
  language,
  setLanguage,
  team,
  onUpdateTeam,
  canDeleteTeam = false,
  onDeleteTeam,
  subscriptionAccess,
  onUpgradePlan,
  onManageBillingPortal,
  currentUser,
  onInstallPresentationDemo,
  presentationDemoAlreadyInstalled = false,
  embedded = false,
  onNavigateToSubscription,
}) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(
    teamLogoBase64 && teamLogoMimeType ? `data:${teamLogoMimeType};base64,${teamLogoBase64}` : null
  );
  const [levelToChange, setLevelToChange] = useState<TeamLevel | null>(null);
  const [localAddress, setLocalAddress] = useState<Address>(team?.address || {});
  const [showTeamDeleteModal, setShowTeamDeleteModal] = useState(false);
  const [teamDeletePassword, setTeamDeletePassword] = useState('');
  const [teamDeleteNameConfirm, setTeamDeleteNameConfirm] = useState('');
  const [teamDeleteError, setTeamDeleteError] = useState('');
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [isInstallingDemo, setIsInstallingDemo] = useState(false);

  useEffect(() => {
    setLocalAddress(team?.address || {});
  }, [team?.address]);

  const { t } = useTranslations();
  const currentPlan = subscriptionAccess ? getPlanById(subscriptionAccess.planId) : null;

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
        const base64Data = result.substring(result.indexOf(',') + 1);
        setTeamLogoBase64(base64Data);
        setTeamLogoMimeType(mimeType);
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setTeamLogoBase64(undefined);
    setTeamLogoMimeType(undefined);
    setLogoPreview(null);
    const fileInput = document.getElementById('teamLogoUpload') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handlePrimaryColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemePrimaryColor(event.target.value);
  };

  const handleAccentColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemeAccentColor(event.target.value);
  };
  
  const handleLevelChangeRequest = (newLevel: TeamLevel) => {
    if (newLevel !== teamLevel) {
      setLevelToChange(newLevel);
    }
  };

  const handleConfirmLevelChange = () => {
    if (levelToChange) {
      setTeamLevel(levelToChange);
      onTeamLevelChanged?.(levelToChange);
    }
    setLevelToChange(null);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveAddress = () => {
    if (team) {
      onUpdateTeam({ ...team, address: localAddress });
      alert('Adresse du club mise à jour.');
    }
  };

  const inputBaseClass = "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow bg-white text-gray-900 placeholder-gray-400";
  const labelBaseClass = "block text-sm font-medium text-gray-700 mb-1";

  const content = (
    <>
      <div className="space-y-8">

        {subscriptionAccess && currentPlan && (
          <SettingsCard title={t('billingCardTitle')}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-gray-900">{currentPlan.name[language]}</p>
                <p className="text-sm text-gray-500">{subscriptionAccess.statusLabel[language]}</p>
                {currentPlan.monthlyPriceEur !== null && (
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPriceEur(currentPlan.monthlyPriceEur, language)}/{t('pricingMonth')}
                    {' · '}
                    {formatPriceEur(currentPlan.annualPriceEur, language)}/{t('pricingYear')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {onNavigateToSubscription && (
                  <ActionButton variant="primary" size="sm" onClick={onNavigateToSubscription}>
                    Voir les plans
                  </ActionButton>
                )}
                {onManageBillingPortal && subscriptionAccess.isActive && !subscriptionAccess.isPilot && (
                  <ActionButton variant="secondary" size="sm" onClick={() => onManageBillingPortal()}>
                    {t('billingManage')}
                  </ActionButton>
                )}
                {onUpgradePlan && subscriptionAccess.planId !== SubscriptionPlanId.FEDERATION && (
                  <ActionButton
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      onNavigateToSubscription
                        ? onNavigateToSubscription()
                        : onUpgradePlan(SubscriptionPlanId.PRO)
                    }
                  >
                    {t('billingUpgradePro')}
                  </ActionButton>
                )}
              </div>
            </div>
            {(subscriptionAccess.isTrial || subscriptionAccess.isPilot) && (
              <p className="mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">{t('billingTrialNote')}</p>
            )}
          </SettingsCard>
        )}

        {currentUser && (
          <SettingsCard title={t('referralCardTitle')}>
            <ReferralPanel currentUser={currentUser} />
          </SettingsCard>
        )}
        
        <SettingsCard title="Logo de l'Équipe">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label htmlFor="teamLogoUpload" className={labelBaseClass}>
                Télécharger un nouveau logo
              </label>
              <div className="mt-2 flex items-center gap-4">
                <label htmlFor="teamLogoUpload" className="cursor-pointer">
                    <span className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Choisir un fichier
                    </span>
                    <input
                        type="file"
                        id="teamLogoUpload"
                        accept="image/png, image/jpeg, image/svg+xml, image/gif"
                        onChange={handleLogoUpload}
                        className="sr-only"
                    />
                </label>
                 <p className="text-xs text-gray-500">PNG, JPG, SVG. Max 2MB.</p>
              </div>
            </div>
            {logoPreview && (
              <div className="text-center">
                <p className={`${labelBaseClass} mb-2`}>Aperçu actuel :</p>
                <div className="inline-block p-2 border rounded-lg bg-gray-50 shadow-inner">
                  <img src={logoPreview} alt="Aperçu du logo" className="max-h-24 max-w-xs object-contain" />
                </div>
                <ActionButton onClick={handleRemoveLogo} variant="danger" size="sm" className="mt-2" icon={<TrashIcon className="w-3 h-3" />}>
                  Supprimer
                </ActionButton>
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard title="Personnalisation du Thème">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
             <div>
              <label htmlFor="themePrimaryColor" className={labelBaseClass}>
                Couleur Principale
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="themePrimaryColor"
                  value={themePrimaryColor || DEFAULT_THEME_PRIMARY_COLOR}
                  onChange={handlePrimaryColorChange}
                  className="p-1 h-10 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                />
                <input 
                  type="text"
                  value={themePrimaryColor || DEFAULT_THEME_PRIMARY_COLOR}
                  onChange={handlePrimaryColorChange}
                  className={inputBaseClass}
                  placeholder="#192646"
                />
              </div>
               <p className="text-xs text-gray-500 mt-2">Utilisée pour le menu latéral, les boutons principaux, etc.</p>
            </div>
            <div>
              <label htmlFor="themeAccentColor" className={labelBaseClass}>
                Couleur d'Accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="themeAccentColor"
                  value={themeAccentColor || DEFAULT_THEME_ACCENT_COLOR}
                  onChange={handleAccentColorChange}
                  className="p-1 h-10 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                />
                <input 
                  type="text"
                  value={themeAccentColor || DEFAULT_THEME_ACCENT_COLOR}
                  onChange={handleAccentColorChange}
                  className={inputBaseClass}
                  placeholder="#efa9b6"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Utilisée pour les icônes du menu et autres éléments graphiques.</p>
            </div>
           </div>
        </SettingsCard>
        
        <SettingsCard title={t('settingsTeamLevel')}>
            <p className="text-sm text-gray-600">
                {t('settingsTeamLevelHelp')}
            </p>
            <div>
                <label htmlFor="teamLevel" className={labelBaseClass}>
                Niveau de votre équipe
                </label>
                <select
                    id="teamLevel"
                    value={teamLevel || ''}
                    onChange={(e) => handleLevelChangeRequest(e.target.value as TeamLevel)}
                    className={`${inputBaseClass} max-w-md`}
                >
                    <option value="" disabled>-- {teamLevel ? "Sélectionner un niveau" : "Non défini"} --</option>
                    {Object.values(TeamLevel).map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
            </div>
        </SettingsCard>

        <SettingsCard title="Profil opérationnel & fiches de poste">
          <TeamOperationalSettingsPanel
            teamLevel={teamLevel}
            operationalSettings={operationalSettings}
            raceEvents={raceEvents}
            onChange={setOperationalSettings}
            onSave={async () => {
              if (onSaveOperationalSettings) {
                await onSaveOperationalSettings();
                alert('Profil opérationnel enregistré.');
              }
            }}
            onNavigateToChecklist={onNavigateToChecklist}
          />
        </SettingsCard>

        <SettingsCard title="Adresse du Club">
          <p className="text-sm text-gray-600">
            Définissez l'adresse de base de votre club. Elle servira de point de départ pour la recherche de staff.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="streetName" className={labelBaseClass}>Rue</label>
              <input type="text" name="streetName" id="streetName" value={localAddress.streetName || ''} onChange={handleAddressChange} className={inputBaseClass} placeholder="123 Rue de la République" />
            </div>
            <div>
              <label htmlFor="postalCode" className={labelBaseClass}>Code Postal</label>
              <input type="text" name="postalCode" id="postalCode" value={localAddress.postalCode || ''} onChange={handleAddressChange} className={inputBaseClass} placeholder="75001"/>
            </div>
            <div>
              <label htmlFor="city" className={labelBaseClass}>Ville</label>
              <input type="text" name="city" id="city" value={localAddress.city || ''} onChange={handleAddressChange} className={inputBaseClass} placeholder="Paris"/>
            </div>
            <div>
                <label htmlFor="region" className={labelBaseClass}>Région/Département</label>
                <input type="text" name="region" id="region" value={localAddress.region || ''} onChange={handleAddressChange} className={inputBaseClass} placeholder="Ex: Bretagne"/>
            </div>
            <div>
              <label htmlFor="country" className={labelBaseClass}>Pays</label>
              <input type="text" name="country" id="country" value={localAddress.country || ''} onChange={handleAddressChange} className={inputBaseClass} placeholder="France"/>
            </div>
          </div>
          <div className="text-right mt-4">
            <ActionButton onClick={handleSaveAddress}>Sauvegarder l'Adresse</ActionButton>
          </div>
        </SettingsCard>

        <SettingsCard title={t('settingsCardLanguage')}>
            <div>
                <label htmlFor="languageSelect" className={labelBaseClass}>
                    {t('settingsLabelLanguage')}
                </label>
                <select
                    id="languageSelect"
                    value={language || 'fr'}
                    onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                    className={`${inputBaseClass} max-w-md`}
                >
                    {LANGUAGE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>
        </SettingsCard>

        {onInstallPresentationDemo && (
          <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-teal-950 mb-2">Équipe démo — Horizon Atlantique</h3>
            <p className="text-sm text-teal-800 mb-3">
              Crée une <strong>nouvelle équipe</strong> « Horizon Atlantique » dans le sélecteur
              Contexte (à côté de Lanester), déjà remplie pour vos supports de présentation.
            </p>
            <ul className="text-xs text-teal-700 mb-4 list-disc list-inside space-y-0.5">
              <li>Apparaît dans le menu Contexte comme une équipe séparée</li>
              <li>10 coureuses · 8 staff · 7 événements · logistique complète</li>
              <li>Scouting, matériel, notes de frais, stock, partenaires, debriefs</li>
              <li>Vos autres équipes (ex. Lanester) ne sont pas modifiées</li>
            </ul>
            {presentationDemoAlreadyInstalled && (
              <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                L’équipe démo existe déjà (ou contient des fiches <code className="mx-1">demo_pres_*</code>).
                Réinstaller met à jour son contenu et bascule dessus.
              </p>
            )}
            <ActionButton
              onClick={async () => {
                if (isInstallingDemo) return;
                const ok = window.confirm(
                  presentationDemoAlreadyInstalled
                    ? 'Mettre à jour l’équipe « Horizon Atlantique » et basculer dessus ?'
                    : 'Créer l’équipe démo « Horizon Atlantique » et basculer dessus ?\n\nElle apparaîtra dans le menu Contexte.'
                );
                if (!ok) return;
                setIsInstallingDemo(true);
                try {
                  const result = await onInstallPresentationDemo();
                  window.alert(
                    `Équipe « ${result.teamName} » prête.\n` +
                      `${result.riders} coureuses · ${result.staff} staff · ${result.events} événements\n` +
                      `${result.entityCount} éléments.\n\n` +
                      `Sélectionnez-la dans Contexte si besoin, puis parcourez Effectif, Événements, Finances, Scouting, Matériel et Espace partenaire.`
                  );
                } catch (err) {
                  console.error(err);
                  window.alert(
                    err instanceof Error
                      ? err.message
                      : 'Échec de la création de l’équipe démo.'
                  );
                } finally {
                  setIsInstallingDemo(false);
                }
              }}
              disabled={isInstallingDemo}
            >
              {isInstallingDemo
                ? 'Création…'
                : presentationDemoAlreadyInstalled
                  ? 'Mettre à jour l’équipe démo'
                  : 'Créer l’équipe démo Horizon Atlantique'}
            </ActionButton>
          </div>
        )}

        {canDeleteTeam && onDeleteTeam && team && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-red-900 mb-2">{t('gdprTeamDeleteTitle')}</h3>
            <p className="text-sm text-red-700 mb-4">{t('gdprTeamDeleteDesc')}</p>
            <p className="text-sm text-red-600 mb-4 bg-red-100 p-3 rounded-md">{t('gdprTeamDeleteWarning')}</p>
            <ActionButton
              variant="danger"
              icon={<TrashIcon className="w-4 h-4" />}
              onClick={() => {
                setShowTeamDeleteModal(true);
                setTeamDeletePassword('');
                setTeamDeleteNameConfirm('');
                setTeamDeleteError('');
              }}
            >
              {t('gdprTeamDeleteButton')}
            </ActionButton>
          </div>
        )}

      </div>

      <ConfirmationModal
        isOpen={showTeamDeleteModal}
        onClose={() => setShowTeamDeleteModal(false)}
        onConfirm={async () => {
          if (!team || teamDeleteNameConfirm.trim() !== team.name) {
            setTeamDeleteError(t('gdprTeamDeleteNameMismatch'));
            return;
          }
          if (!teamDeletePassword) {
            setTeamDeleteError(t('gdprDeletePasswordRequired'));
            return;
          }
          setIsDeletingTeam(true);
          setTeamDeleteError('');
          try {
            await onDeleteTeam?.(teamDeletePassword);
            setShowTeamDeleteModal(false);
            alert(t('gdprTeamDeleteSuccess'));
          } catch (err: unknown) {
            setTeamDeleteError(err instanceof Error ? err.message : t('gdprDeleteError'));
          } finally {
            setIsDeletingTeam(false);
          }
        }}
        title={t('gdprTeamDeleteTitle')}
        message={
          <>
            <p className="mb-3">{t('gdprTeamDeleteConfirm')}</p>
            <p className="font-semibold text-gray-800 mb-2">{team?.name}</p>
            <input
              type="text"
              value={teamDeleteNameConfirm}
              onChange={(e) => setTeamDeleteNameConfirm(e.target.value)}
              placeholder={team?.name}
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md"
            />
            <input
              type="password"
              value={teamDeletePassword}
              onChange={(e) => setTeamDeletePassword(e.target.value)}
              placeholder={t('gdprCurrentPassword')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {teamDeleteError && <p className="mt-2 text-sm text-red-600">{teamDeleteError}</p>}
            {isDeletingTeam && <p className="mt-2 text-sm text-gray-500">{t('gdprExporting')}</p>}
          </>
        }
      />

      <ConfirmationModal
        isOpen={!!levelToChange}
        onClose={() => setLevelToChange(null)}
        onConfirm={handleConfirmLevelChange}
        title={t('settingsConfirmLevelChangeTitle')}
        message={
          <>
            <p>{t('settingsConfirmLevelChangeMsg1')} <strong>{levelToChange}</strong>.</p>
            <p className="mt-2 font-semibold text-yellow-700 bg-yellow-100 p-2 rounded-md">
              {t('settingsConfirmLevelChangeMsg2')}
            </p>
            <p className="mt-2">{t('settingsConfirmLevelChangeMsg3')}</p>
            <p className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded-md">
              Le profil opérationnel (rôles checklist et fiches de poste) sera recalibré selon le nouveau secteur.
              Vous pourrez l&apos;ajuster dans « Profil opérationnel & fiches de poste ».
            </p>
          </>
        }
      />
    </>
  );

  if (embedded) return content;

  return (
    <SectionWrapper title="Paramètres de l'Application">
      {content}
    </SectionWrapper>
  );
};

export default SettingsSection;