import React from 'react';
import { AppSection } from '../../types';
import { MobileTabConfig } from '../../constants/mobileSections';
import { useTranslations } from '../../hooks/useTranslations';
import HomeIcon from '../icons/HomeIcon';
import CalendarDaysIcon from '../icons/CalendarDaysIcon';
import PaperAirplaneIcon from '../icons/PaperAirplaneIcon';
import IdentificationIcon from '../icons/IdentificationIcon';
import BriefcaseIcon from '../icons/BriefcaseIcon';
import Cog6ToothIcon from '../icons/Cog6ToothIcon';
import UsersIcon from '../icons/UsersIcon';
import TrophyIcon from '../icons/TrophyIcon';
import ListBulletIcon from '../icons/ListBulletIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  HomeIcon,
  CalendarDaysIcon,
  PaperAirplaneIcon,
  IdentificationIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
  UsersIcon,
  TrophyIcon,
  DocumentTextIcon,
};

interface BottomTabBarProps {
  tabs: MobileTabConfig[];
  currentSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onMoreClick: () => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  currentSection,
  onSelectSection,
  onMoreClick,
}) => {
  const { t } = useTranslations();
  const tabSections = new Set(tabs.map((tab) => tab.section));
  const isMoreActive = !tabSections.has(currentSection);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom"
      aria-label={t('mobileTabBarLabel')}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon] ?? HomeIcon;
          const isActive = currentSection === tab.section;
          return (
            <button
              key={tab.section}
              type="button"
              onClick={() => onSelectSection(tab.section)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[56px] py-2 px-1 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-6 h-6 mb-0.5" aria-hidden="true" />
              <span className="text-[10px] font-medium leading-tight text-center truncate max-w-full">
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMoreClick}
          className={`flex flex-col items-center justify-center flex-1 min-h-[56px] py-2 px-1 transition-colors ${
            isMoreActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-label={t('mobileTabMore')}
        >
          <ListBulletIcon className="w-6 h-6 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-tight">{t('mobileTabMore')}</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomTabBar;
