


import React, { useState } from 'react';

interface SidebarButtonProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, icon: IconComponent, isActive, onClick }) => {
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center text-left px-4 py-3 rounded-xl text-sm font-medium 
        transition-all duration-200 group relative
        ${isActive 
          ? 'bg-white/20 text-white shadow-lg shadow-white/10' 
          : isButtonHovered 
            ? 'bg-white/10 text-white' 
            : 'text-white/80 hover:text-white hover:bg-white/5'
        }
      `}
      onMouseEnter={() => setIsButtonHovered(true)}
      onMouseLeave={() => setIsButtonHovered(false)}
      aria-current={isActive ? "page" : undefined}
    >
      {IconComponent && (
        <IconComponent 
          className={`
            w-5 h-5 mr-3 flex-shrink-0 transition-colors duration-200
            ${isActive 
              ? 'text-white' 
              : isButtonHovered 
                ? 'text-white' 
                : 'text-white/60 group-hover:text-white/90'
            }
          `} 
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      
      {/* Indicateur de sélection */}
      {isActive && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
      )}
    </button>
  );
};

export default SidebarButton;