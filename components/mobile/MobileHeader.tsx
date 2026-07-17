import React from 'react';
import { AppSection } from '../../types';
import { SECTIONS, INDEPENDENT_SECTIONS } from '../../constants';
import { getSectionGroupLabel } from '../../constants/sidebarGroups';
import { useTranslations } from '../../hooks/useTranslations';
import ListBulletIcon from '../icons/ListBulletIcon';

interface MobileHeaderProps {
  currentSection: AppSection;
  teamLogoUrl?: string;
  onMenuClick: () => void;
  isIndependent: boolean;
  notificationBell?: React.ReactNode;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentSection,
  teamLogoUrl,
  onMenuClick,
  isIndependent,
  notificationBell,
}) => {
  const { t, language } = useTranslations();

  const { sectionLabel, groupLabel } = React.useMemo(() => {
    const source = isIndependent ? INDEPENDENT_SECTIONS : SECTIONS;
    const found = source.find((s) => s.id === currentSection);
    if (found) {
      return {
        sectionLabel: found.labels[language] || found.labels.en,
        groupLabel: getSectionGroupLabel(found.id, language),
      };
    }
    if (currentSection === 'eventDetail') {
      return { sectionLabel: t('mobileHeaderEvent'), groupLabel: undefined };
    }
    return { sectionLabel: 'LogiCycle', groupLabel: undefined };
  }, [currentSection, isIndependent, language, t]);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-950 text-white flex items-center px-3 gap-3 safe-area-top border-b border-white/10">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex items-center justify-center w-11 h-11 -ml-1 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
        aria-label={t('mobileOpenMenu')}
      >
        <ListBulletIcon className="w-6 h-6" />
      </button>

      {teamLogoUrl && (
        <img src={teamLogoUrl} alt="" className="h-8 w-auto flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {groupLabel && (
          <p className="text-[10px] uppercase tracking-wide text-white/60 truncate">{groupLabel}</p>
        )}
        <h1 className="text-sm font-semibold truncate leading-tight sm:text-base">{sectionLabel}</h1>
      </div>
      {notificationBell}
    </header>
  );
};

export default MobileHeader;
