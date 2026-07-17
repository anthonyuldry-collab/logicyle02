import React, { useMemo } from 'react';
import { AppSection, User, Team, PermissionLevel, StaffMember, PermissionRole, UserRole, TeamRole, Rider, IncomeItem } from '../types';
import { SECTIONS, INDEPENDENT_SECTIONS, INDEPENDENT_RIDER_ONLY_SECTIONS, INDEPENDENT_STAFF_ONLY_SECTIONS, SectionConfig } from '../constants';
import { SIDEBAR_GROUP_ORDER, getSidebarGroupLabel, SidebarGroupKey } from '../constants/sidebarGroups';
import { isSuperAdminUser } from '../utils/superAdminUtils';
import {
  SuperAdminPreviewConfig,
  canAccessHoldingDashboard,
  getSuperAdminPreviewLabel,
  getSponsorshipIncomeItems,
} from '../utils/superAdminPreview';
import {
  isCoureurUser,
  isSectionAllowedForCoureur,
} from '../utils/riderAccessUtils';
import {
  isPartnerUser,
  isSectionAllowedForPartner,
} from '../utils/partnerAccessUtils';
import HomeIcon from './icons/HomeIcon';
import UsersIcon from './icons/UsersIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import TruckIcon from './icons/TruckIcon';
import BuildingOfficeIcon from './icons/BuildingOfficeIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CurrencyDollarIcon from './icons/CurrencyDollarIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import ChartBarIcon from './icons/ChartBarIcon'; 
import LungsIcon from './icons/LungsIcon';
import CyclingIcon from './icons/CyclingIcon';
import BrainIcon from './icons/BrainIcon';
import MountainIcon from './icons/MountainIcon';
import TacticsIcon from './icons/TacticsIcon';
import Cog6ToothIcon from './icons/Cog6ToothIcon';
import WrenchScrewdriverIcon from './icons/WrenchScrewdriverIcon'; // Added for Matériel
import BanknotesIcon from './icons/BanknotesIcon';
import SidebarButton from './SidebarButton'; // Import the new component
import EyeIcon from './icons/EyeIcon';
import SearchIcon from './icons/SearchIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';
import UserPlusIcon from './icons/UserPlusIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import BeakerIcon from './icons/BeakerIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import PencilIcon from './icons/PencilIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import CircleStackIcon from './icons/CircleStackIcon';
import KeyIcon from './icons/KeyIcon';
import TrophyIcon from './icons/TrophyIcon';
import { useTranslations } from '../hooks/useTranslations';
import ActionButton from './ActionButton';

interface SidebarProps {
  currentSection: AppSection;
  onSelectSection: (section: AppSection, eventId?: string) => void; 
  teamLogoUrl?: string;
  onLogout: () => void;
  currentUser: User; 
  effectivePermissions: Partial<Record<AppSection, PermissionLevel[]>>;
  staff: StaffMember[];
  permissionRoles: PermissionRole[];
  userTeams: Team[];
  currentTeamId: string | null;
  onTeamSwitch: (teamId: string) => void;
  isIndependent: boolean;
  onGoToLobby: () => void;
  isMobile?: boolean;
  isDrawerOpen?: boolean;
  onDrawerClose?: () => void;
  lockedSections?: AppSection[];
  realUser?: User;
  superAdminPreview?: SuperAdminPreviewConfig;
  onSuperAdminPreviewChange?: (config: SuperAdminPreviewConfig) => void;
  riders?: Rider[];
  incomeItems?: IncomeItem[];
}

const iconMap: Record<string, React.ComponentType<any>> = {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  TruckIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClipboardCheckIcon,
  CalendarDaysIcon,
  ChartBarIcon, 
  LungsIcon,      
  CyclingIcon,    
  BrainIcon,      
  MountainIcon,   
  TacticsIcon,    
  Cog6ToothIcon, 
  WrenchScrewdriverIcon,
  BanknotesIcon,
  EyeIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  BriefcaseIcon,
  BeakerIcon,
  IdentificationIcon,
  PencilIcon,
  ClipboardListIcon,
  PaperAirplaneIcon,
  CircleStackIcon,
  KeyIcon,
  TrophyIcon,
};


const Sidebar: React.FC<SidebarProps> = ({ 
  currentSection, onSelectSection, teamLogoUrl, onLogout, 
  currentUser, effectivePermissions, staff, permissionRoles, userTeams, currentTeamId, onTeamSwitch,
  isIndependent, onGoToLobby,
  isMobile = false, isDrawerOpen = false, onDrawerClose,
  lockedSections = [],
  realUser,
  superAdminPreview,
  onSuperAdminPreviewChange,
  riders = [],
  incomeItems = [],
}) => {
  const { t, language } = useTranslations();
  

  
  const groupedSections = useMemo(() => {
    const source = isIndependent ? INDEPENDENT_SECTIONS : SECTIONS;
    return source.reduce((acc, section) => {
        const groupKey = 'groupKey' in section ? (section as SectionConfig).groupKey : undefined;
        const group = groupKey
          ? getSidebarGroupLabel(groupKey, language)
          : (section.group[language] || section.group['en']);
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(section);
        return acc;
    }, {} as Record<string, SectionConfig[]>);
  }, [language, isIndependent]);

  const groupOrder = useMemo(() => {
    if (isIndependent) {
      const isRiderNav =
        currentUser?.userRole === UserRole.COUREUR ||
        String(currentUser?.userRole || '').toLowerCase() === 'coureur';
      const isStaffNav =
        currentUser?.userRole === UserRole.STAFF ||
        String(currentUser?.userRole || '').toLowerCase() === 'staff';
      if (isRiderNav) {
        return language === 'fr'
          ? ['Mon Parcours', 'Performance', 'Planning', 'Opportunités', 'Compte']
          : ['My Journey', 'Performance', 'Planning', 'Opportunities', 'Account'];
      }
      if (isStaffNav) {
        return language === 'fr'
          ? ['Mon Parcours', 'Planning', 'Logistique', 'Opportunités', 'Compte']
          : ['My Journey', 'Planning', 'Logistics', 'Opportunities', 'Account'];
      }
      return language === 'fr'
        ? ['Mon Parcours', 'Opportunités', 'Compte']
        : ['My Journey', 'Opportunities', 'Account'];
    }
    return SIDEBAR_GROUP_ORDER.map((key) => getSidebarGroupLabel(key, language));
  }, [isIndependent, language, currentUser?.userRole]);

  const previewMode = superAdminPreview?.mode ?? 'full';

  const canShowHoldingView = canAccessHoldingDashboard(realUser || currentUser, {
    realUser,
    previewMode,
  });

  const isCoureurView =
    isCoureurUser(currentUser) &&
    !(isSuperAdminUser(realUser || currentUser) && previewMode === 'full');

  const isPartnerView =
    isPartnerUser(currentUser) &&
    !(isSuperAdminUser(realUser || currentUser) && previewMode === 'full');

  const sponsorshipIncomeItems = useMemo(
    () => getSponsorshipIncomeItems(incomeItems),
    [incomeItems],
  );

  const hasViewPermission = (sectionId: AppSection) =>
    !!effectivePermissions?.[sectionId]?.includes('view');

  const filterCoureurSections = (sections: typeof SECTIONS) =>
    sections.filter((section) => {
      const id = section.id as AppSection;
      if (id === 'eventDetail') return false;
      if (id === 'missionSearch') return false;
      if (lockedSections.includes(id)) return false;
      return isSectionAllowedForCoureur(id) && hasViewPermission(id);
    });

  const filterPartnerSections = (sections: typeof SECTIONS) =>
    sections.filter((section) => {
      const id = section.id as AppSection;
      if (lockedSections.includes(id)) return false;
      return isSectionAllowedForPartner(id) && hasViewPermission(id);
    });

  const isMySpaceSection = (section: { groupKey?: SidebarGroupKey }) =>
    section.groupKey === 'mySpace';

  const isDashboardSection = (section: { groupKey?: SidebarGroupKey }) =>
    section.groupKey === 'dashboard';
  
  const displayRole = useMemo(() => {
    if (
      realUser &&
      isSuperAdminUser(realUser) &&
      superAdminPreview &&
      superAdminPreview.mode !== 'full'
    ) {
      return getSuperAdminPreviewLabel(superAdminPreview, riders, staff, incomeItems);
    }
    if (isSuperAdminUser(realUser || currentUser) && !currentTeamId && previewMode === 'full') {
      return language === 'fr' ? 'Super Administrateur' : 'Super Administrator';
    }
    if (isIndependent) {
        return currentUser.userRole || 'Indépendant';
    }
    // Protection contre currentUser.permissionRole undefined
    if (!currentUser || !currentUser.permissionRole) {
        return 'Rôle en cours de chargement...';
    }
    const role = permissionRoles.find(r => r.id === currentUser.permissionRole);
    return role?.name || 'Role inconnu';
  }, [currentUser, currentTeamId, isIndependent, language, permissionRoles, previewMode, realUser, superAdminPreview, riders, staff, incomeItems]);

  const showSuperAdminPreviewControls =
    !!realUser &&
    isSuperAdminUser(realUser) &&
    !!onSuperAdminPreviewChange &&
    !!currentTeamId;

  const sidebarClasses = isMobile
    ? `lc-sidebar w-72 h-screen flex flex-col fixed top-0 left-0 overflow-y-auto z-50 bg-slate-950 transition-transform duration-300 ease-in-out ${
        isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'lc-sidebar w-72 h-screen flex flex-col fixed top-0 left-0 overflow-y-auto z-20 bg-slate-950';

  return (
    <div 
        className={sidebarClasses}
        aria-hidden={isMobile && !isDrawerOpen ? true : undefined}
    >
      {/* Header avec logo et sélecteur d'équipe */}
      <div className="p-6 border-b border-white/5">
        {teamLogoUrl && (
            <div className="flex justify-center mb-4">
                <img src={teamLogoUrl} alt="Team Logo" className="h-12 w-auto" />
            </div>
        )}
        
        {!isIndependent && (userTeams.length > 0 || (isSuperAdminUser(realUser || currentUser) && previewMode === 'full')) && (
            <div>
                <label htmlFor="team-switcher" className="block text-xs font-medium mb-2" style={{ color: 'var(--theme-primary-text)', opacity: 0.8 }}>
                    {t('sidebarContext')}
                </label>
                <select
                    id="team-switcher"
                    value={currentTeamId || ''}
                    onChange={(e) => onTeamSwitch(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border-0 bg-white/10 text-white placeholder-white/70 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                    {isSuperAdminUser(realUser || currentUser) && previewMode === 'full' && (
                      <option value="" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                        Super Administrateur
                      </option>
                    )}
                    {userTeams.map(team => (
                        <option key={team.id} value={team.id} style={{backgroundColor: 'var(--theme-primary-bg)'}}>
                            {team.name}
                        </option>
                    ))}
                </select>
            </div>
        )}

        {isSuperAdminUser(realUser || currentUser) && previewMode === 'full' && !currentTeamId && (
            <p className="mt-3 text-[11px] uppercase tracking-wide text-emerald-400/90">
              Super Administrateur · plateforme
            </p>
        )}

        {showSuperAdminPreviewControls && (
            <div className="mt-4 space-y-2">
                <label htmlFor="preview-mode" className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-primary-text)', opacity: 0.8 }}>
                    Vue en tant que
                </label>
                <select
                    id="preview-mode"
                    value={previewMode}
                    onChange={(e) => {
                        const mode = e.target.value as SuperAdminPreviewConfig['mode'];
                        if (mode === 'coureur') {
                            onSuperAdminPreviewChange!({ mode, subjectId: riders[0]?.id ?? null });
                        } else if (mode === 'staff') {
                            onSuperAdminPreviewChange!({ mode, subjectId: staff[0]?.id ?? null });
                        } else if (mode === 'partenaire') {
                            onSuperAdminPreviewChange!({
                              mode,
                              subjectId: sponsorshipIncomeItems[0]?.id ?? null,
                            });
                        } else if (mode === 'coureur_independant') {
                            onSuperAdminPreviewChange!({ mode, subjectId: riders[0]?.id ?? null });
                        } else if (mode === 'staff_independant') {
                            onSuperAdminPreviewChange!({ mode, subjectId: staff[0]?.id ?? null });
                        } else {
                            onSuperAdminPreviewChange!({ mode });
                        }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border-0 bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                    <option value="full" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>Super Admin (complet)</option>
                    <option value="manager" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>Manager</option>
                    <option value="coureur" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>Coureur</option>
                    <option value="coureur_independant" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>Athlète indépendant</option>
                    <option value="staff" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>Staff</option>
                    <option value="staff_independant" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>Staff indépendant</option>
                    <option value="partenaire" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>Partenaire</option>
                </select>

                {previewMode === 'coureur' && (
                    <select
                        id="preview-rider"
                        value={superAdminPreview?.subjectId ?? ''}
                        onChange={(e) =>
                            onSuperAdminPreviewChange!({ mode: 'coureur', subjectId: e.target.value || null })
                        }
                        disabled={riders.length === 0}
                        className="w-full px-3 py-2 text-sm rounded-lg border-0 bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                    >
                        {riders.length === 0 ? (
                            <option value="">Aucun coureur dans l&apos;équipe</option>
                        ) : (
                            riders.map((rider) => (
                                <option key={rider.id} value={rider.id} style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                    {rider.firstName} {rider.lastName}
                                </option>
                            ))
                        )}
                    </select>
                )}

                {previewMode === 'coureur_independant' && (
                    <select
                        id="preview-independent-rider"
                        value={superAdminPreview?.subjectId ?? ''}
                        onChange={(e) =>
                            onSuperAdminPreviewChange!({ mode: 'coureur_independant', subjectId: e.target.value || null })
                        }
                        disabled={riders.length === 0}
                        className="w-full px-3 py-2 text-sm rounded-lg border-0 bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                    >
                        {riders.length === 0 ? (
                            <option value="">Profil démo (aucun coureur)</option>
                        ) : (
                            riders.map((rider) => (
                                <option key={rider.id} value={rider.id} style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                    {rider.firstName} {rider.lastName}
                                </option>
                            ))
                        )}
                    </select>
                )}

                {previewMode === 'staff' && (
                    <select
                        id="preview-staff"
                        value={superAdminPreview?.subjectId ?? ''}
                        onChange={(e) =>
                            onSuperAdminPreviewChange!({ mode: 'staff', subjectId: e.target.value || null })
                        }
                        disabled={staff.length === 0}
                        className="w-full px-3 py-2 text-sm rounded-lg border-0 bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                    >
                        {staff.length === 0 ? (
                            <option value="">Aucun staff dans l&apos;équipe</option>
                        ) : (
                            staff.map((member) => (
                                <option key={member.id} value={member.id} style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                    {member.firstName} {member.lastName}
                                    {member.role ? ` (${member.role})` : ''}
                                </option>
                            ))
                        )}
                    </select>
                )}

                {previewMode === 'staff_independant' && (
                    <select
                        id="preview-independent-staff"
                        value={superAdminPreview?.subjectId ?? ''}
                        onChange={(e) =>
                            onSuperAdminPreviewChange!({ mode: 'staff_independant', subjectId: e.target.value || null })
                        }
                        disabled={staff.length === 0}
                        className="w-full px-3 py-2 text-sm rounded-lg border-0 bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                    >
                        {staff.length === 0 ? (
                            <option value="">Profil démo (aucun staff)</option>
                        ) : (
                            staff.map((member) => (
                                <option key={member.id} value={member.id} style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                    {member.firstName} {member.lastName}
                                    {member.role ? ` (${member.role})` : ''}
                                </option>
                            ))
                        )}
                    </select>
                )}

                {previewMode === 'partenaire' && (
                    <select
                        id="preview-partner"
                        value={superAdminPreview?.subjectId ?? ''}
                        onChange={(e) =>
                            onSuperAdminPreviewChange!({ mode: 'partenaire', subjectId: e.target.value || null })
                        }
                        disabled={sponsorshipIncomeItems.length === 0}
                        className="w-full px-3 py-2 text-sm rounded-lg border-0 bg-white/10 text-white focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                    >
                        {sponsorshipIncomeItems.length === 0 ? (
                            <option value="">Aucun partenariat sponsor</option>
                        ) : (
                            sponsorshipIncomeItems.map((income) => (
                                <option key={income.id} value={income.id} style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                    {income.sponsorCompanyName || income.description}
                                </option>
                            ))
                        )}
                    </select>
                )}
            </div>
        )}
      </div>

      {/* Navigation principale */}
      <nav className="flex-grow p-4 space-y-6">
        {groupOrder.map(group => {
            const sectionsInGroup = groupedSections[group];
            if (!sectionsInGroup) return null;

            // Filtrer les sections selon le rôle de l'utilisateur
            let visibleSections = sectionsInGroup;

            if (isIndependent) {
                visibleSections = sectionsInGroup.filter((section) => {
                    if (section.id === 'userSettings' || section.id === 'pricing') return true;
                    const isRiderNav =
                      currentUser?.userRole === UserRole.COUREUR ||
                      String(currentUser?.userRole || '').toLowerCase() === 'coureur';
                    const isStaffNav =
                      currentUser?.userRole === UserRole.STAFF ||
                      String(currentUser?.userRole || '').toLowerCase() === 'staff';
                    if (section.id === 'missionSearch' && !isStaffNav) return false;
                    if (section.id === 'teamSearch' && !isRiderNav) return false;
                    if (
                      INDEPENDENT_RIDER_ONLY_SECTIONS.includes(section.id as AppSection) &&
                      !isRiderNav
                    ) {
                      return false;
                    }
                    if (
                      INDEPENDENT_STAFF_ONLY_SECTIONS.includes(section.id as AppSection) &&
                      !isStaffNav
                    ) {
                      return false;
                    }
                    if (lockedSections.includes(section.id as AppSection)) return false;
                    return hasViewPermission(section.id as AppSection);
                });
            } else if (isCoureurView) {
                visibleSections = filterCoureurSections(sectionsInGroup);
            } else if (isPartnerView) {
                visibleSections = filterPartnerSections(sectionsInGroup);
            } else if (isSuperAdminUser(realUser || currentUser) && previewMode === 'full') {
                const platformOnly = !currentTeamId;
                visibleSections = sectionsInGroup.filter((section) => {
                    if (section.id === 'eventDetail') return false;
                    if (section.id === 'adminDossier') return false;
                    // Pilotage PDG + Super Admin : uniquement dans le contexte « Super Administrateur ».
                    if (section.id === 'superAdmin' || section.id === 'organizationDashboard') {
                        return platformOnly;
                    }
                    if (platformOnly) {
                        return (
                          section.id === 'organizationDashboard' ||
                          section.id === 'superAdmin' ||
                          section.id === 'userSettings' ||
                          section.id === 'pricing'
                        );
                    }
                    // Avec une équipe (ex. Horizon Atlantique) : menu équipe, sans onglets plateforme.
                    if (section.id === 'partnerPortal') {
                        return !lockedSections.includes('partnerPortal');
                    }
                    return true;
                });
            } else if (
              currentUser &&
              currentUser.userRole !== UserRole.COUREUR &&
              (currentUser.userRole === UserRole.MANAGER || currentUser.permissionRole === TeamRole.ADMIN)
            ) {
                visibleSections = sectionsInGroup.filter(section => {
                    if (isMySpaceSection(section)) {
                      // Staff : dossier admin fusionné dans « Mon Profil »
                      if (section.id === 'adminDossier') return false;
                      return hasViewPermission(section.id as AppSection);
                    }
                    if (isDashboardSection(section)) return true;
                    if (section.id === 'accommodationHistory') return true;
                    if (section.id === 'pricing') {
                        return false;
                    }
                    // Onglet Super Admin réservé au contexte plateforme (sélecteur Contexte).
                    if (section.id === 'superAdmin') {
                        return false;
                    }
                    if (section.id === 'organizationDashboard') {
                        return canShowHoldingView && !currentTeamId;
                    }
                    if (section.id === 'partnerPortal') {
                        return !lockedSections.includes('partnerPortal');
                    }
                    if (section.id === 'userSettings') {
                        return true;
                    }
                    return effectivePermissions && effectivePermissions[section.id as AppSection] && Array.isArray(effectivePermissions[section.id as AppSection]) && effectivePermissions[section.id as AppSection].includes('view');
                });
            } else {
                // Pour les coureurs et autres rôles, filtrer selon les permissions
                visibleSections = sectionsInGroup.filter(section => {
                    if (section.id === 'userSettings') return true;
                    if (isDashboardSection(section)) return true;
                    if (isMySpaceSection(section)) {
                        if (currentUser?.userRole === UserRole.COUREUR) return true;
                        // Staff : pas de « Mon Dossier Admin » séparé (fusionné dans Mon Profil)
                        if (section.id === 'adminDossier') return false;
                        return effectivePermissions && effectivePermissions[section.id as AppSection] && Array.isArray(effectivePermissions[section.id as AppSection]) && effectivePermissions[section.id as AppSection].includes('view');
                    }
                    if (lockedSections.includes(section.id as AppSection)) return false;
                    if (section.id === 'superAdmin') {
                        return false;
                    }
                    if (section.id === 'organizationDashboard') {
                        return canShowHoldingView && !currentTeamId;
                    }
                    return hasViewPermission(section.id as AppSection);
                });
            }
            
            if (visibleSections.length === 0) return null;
            
            return (
                <div key={group} className="space-y-2">
                    <h3 
                        className="px-3 text-xs font-semibold uppercase tracking-[0.2em] mb-3 text-slate-500"
                    >
                        {group}
                    </h3>
                    <div className="space-y-1">
                        {visibleSections.map(section => {
                            let Icon = iconMap[section.icon];
                            let displayLabel = section.labels[language] || section.labels['en'];
                            
                            // Afficher le bon libellé et icône pour le tableau de bord selon le rôle
                            if (section.id === 'myDashboard' && currentUser && 
                                (currentUser.permissionRole === TeamRole.ADMIN || currentUser.userRole === UserRole.MANAGER)) {
                                displayLabel = 'Tableau de bord';
                                Icon = ChartBarIcon; // Icône différente pour l'admin
                            }
                            
                            const isLocked =
                              !isCoureurView && lockedSections.includes(section.id as AppSection);
                            
                            return (
                                <SidebarButton
                                    key={section.id}
                                    label={isLocked ? `${displayLabel} 🔒` : displayLabel}
                                    icon={Icon}
                                    isActive={currentSection === section.id}
                                    onClick={() => {
                                      if (isLocked) return;
                                      onSelectSection(section.id as AppSection);
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )
        })}
      </nav>

      {/* Footer avec informations utilisateur */}
      <div className="p-4 border-t border-white/5">
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.06]">
            <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold" style={{ color: 'var(--theme-primary-text)' }}>
                        {currentUser.firstName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-primary-text)' }}>
                        {currentUser.firstName && currentUser.lastName 
                            ? `${currentUser.firstName} ${currentUser.lastName}`
                            : currentUser.firstName 
                            ? currentUser.firstName
                            : currentUser.email || 'Utilisateur'
                        }
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--theme-primary-text)', opacity: 0.7 }}>
                        {displayRole}
                    </p>
                </div>
            </div>
            
            {isIndependent && (
                <ActionButton onClick={onGoToLobby} className="w-full mb-2 text-xs py-2">
                    {t('sidebarJoinCreateTeam')}
                </ActionButton>
            )}
            <ActionButton onClick={onLogout} variant="secondary" className="w-full text-xs py-2">
                {t('sidebarLogout')}
            </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;