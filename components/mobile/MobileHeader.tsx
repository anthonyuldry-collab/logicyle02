import React from 'react';
import { AppSection } from '../../types';
import { SECTIONS, INDEPENDENT_SECTIONS } from '../../constants';
import { useTranslations } from '../../hooks/useTranslations';
import ListBulletIcon from '../icons/ListBulletIcon';

interface MobileHeaderProps {
  currentSection: AppSection;
  teamLogoUrl?: string;
  onMenuClick: () => void;
  isIndependent: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentSection,
  teamLogoUrl,
  onMenuClick,
  isIndependent,
}) => {
  const { t, language } = useTranslations();

  const sectionLabel = React.useMemo(() => {
    const source = isIndependent ? INDEPENDENT_SECTIONS : SECTIONS;
    const found = source.find((s) => s.id === currentSection);
    if (found) return found.labels[language] || found.labels.en;
    if (currentSection === 'eventDetail') return t('mobileHeaderEvent');
    return 'LogiCycle';
  }, [currentSection, isIndependent, language, t]);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-800 text-white flex items-center px-3 gap-3 safe-area-top shadow-md">
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

      <h1 className="flex-1 text-base font-semibold truncate">{sectionLabel}</h1>
    </header>
  );
};

export default MobileHeader;
