import React, { useMemo } from 'react';
import { AppSection, User, Team, PermissionLevel, StaffMember, PermissionRole, UserRole, TeamRole } from '../types';
import { SECTIONS } from '../constants';
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
};


const Sidebar: React.FC<SidebarProps> = ({ 
  currentSection, onSelectSection, teamLogoUrl, onLogout, 
  currentUser, effectivePermissions, staff, permissionRoles, userTeams, currentTeamId, onTeamSwitch,
  isIndependent, onGoToLobby 
}) => {
  const { t, language } = useTranslations();
  

  
  const groupedSections = useMemo(() => {
    return SECTIONS.reduce((acc, section) => {
        const group = section.group[language] || section.group['en'];
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(section);
        return acc;
    }, {} as Record<string, typeof SECTIONS>);
  }, [language]);

  const groupOrder = [
    'Tableau de Bord',
    'Navigation Principale',
    'Performance & Santé', 
    'Logistique & Équipement',
    'Administration'
  ];
  
  const displayRole = useMemo(() => {
    if (isIndependent) {
        return currentUser.userRole || 'Indépendant';
    }
    // Protection contre currentUser.permissionRole undefined
    if (!currentUser || !currentUser.permissionRole) {
        return 'Rôle en cours de chargement...';
    }
    const role = permissionRoles.find(r => r.id === currentUser.permissionRole);
    return role?.name || 'Role inconnu';
  }, [currentUser, isIndependent, permissionRoles]);

  return (
    <div 
        className="w-72 h-screen flex flex-col fixed top-0 left-0 overflow-y-auto"
        style={{ 
          backgroundColor: 'var(--theme-primary-bg)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }}
    >
      {/* Header avec logo et sélecteur d'équipe */}
      <div className="p-6 border-b border-white/10">
        {teamLogoUrl && (
            <div className="flex justify-center mb-4">
                <img src={teamLogoUrl} alt="Team Logo" className="h-12 w-auto" />
            </div>
        )}
        
        {!isIndependent && userTeams.length > 1 && (
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
                    {userTeams.map(team => (
                        <option key={team.id} value={team.id} style={{backgroundColor: 'var(--theme-primary-bg)'}}>
                            {team.name}
                        </option>
                    ))}
                </select>
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
            
            // Si l'utilisateur est Manager/Admin, exclure les sections "Mon Espace"
            if (currentUser && (currentUser.userRole === UserRole.MANAGER || currentUser.permissionRole === TeamRole.ADMIN)) {
                visibleSections = sectionsInGroup.filter(section => {
                    // Exclure toutes les sections "Mon Espace" pour les administrateurs
                    if (section.group[language] === t('sidebarGroupMySpace')) return false;
                    
                    // Toujours afficher le Tableau de Bord pour tous les utilisateurs (sans vérification de permissions)
                    if (section.group[language] === 'Tableau de Bord') {
                        return true;
                    }
                    
                    // Pour les administrateurs, masquer adminDashboard car myDashboard affiche déjà l'admin
                    if (section.id === 'adminDashboard') return false;
                    
                    // Vérifier les permissions pour les autres sections
                    return effectivePermissions && effectivePermissions[section.id as AppSection] && Array.isArray(effectivePermissions[section.id as AppSection]) && effectivePermissions[section.id as AppSection].includes('view');
                });
            } else {
                // Pour les coureurs et autres rôles, filtrer selon les permissions
                visibleSections = sectionsInGroup.filter(section => {
                    // Toujours afficher les paramètres utilisateur
                    if (section.id === 'userSettings') return true;
                    
                    // Toujours afficher le Tableau de Bord pour tous les utilisateurs (sans vérification de permissions)
                    if (section.group[language] === 'Tableau de Bord') {
                        return true;
                    }
                    
                    // Toujours afficher les sections "Mon Espace" pour les coureurs
                    if (section.group[language] === t('sidebarGroupMySpace')) {
                        // Vérifier si c'est un coureur ou si les permissions existent
                        if (currentUser?.userRole === UserRole.COUREUR) return true;
                        return effectivePermissions && effectivePermissions[section.id as AppSection] && Array.isArray(effectivePermissions[section.id as AppSection]) && effectivePermissions[section.id as AppSection].includes('view');
                    }
                    
                    // Vérifier les permissions pour les autres sections
                    return effectivePermissions && effectivePermissions[section.id as AppSection] && Array.isArray(effectivePermissions[section.id as AppSection]) && effectivePermissions[section.id as AppSection].includes('view');
                });
            }
            
            if (visibleSections.length === 0) return null;
            
            return (
                <div key={group} className="space-y-2">
                    <h3 
                        className="px-3 text-xs font-semibold uppercase tracking-wider mb-3" 
                        style={{ color: 'var(--theme-primary-text)', opacity: 0.6 }}
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
                                displayLabel = 'Tableau de Bord';
                                Icon = ChartBarIcon; // Icône différente pour l'admin
                            }
                            
                            return (
                                <SidebarButton
                                    key={section.id}
                                    label={displayLabel}
                                    icon={Icon}
                                    isActive={currentSection === section.id}
                                    onClick={() => onSelectSection(section.id as AppSection)}
                                />
                            );
                        })}
                    </div>
                </div>
            )
        })}
      </nav>

      {/* Footer avec informations utilisateur */}
      <div className="p-4 border-t border-white/10">
        <div className="p-4 bg-white/5 rounded-xl">
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