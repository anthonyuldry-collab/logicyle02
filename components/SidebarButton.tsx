

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
          ? 'bg-indigo-500/25 text-white shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-400/30' 
          : isButtonHovered 
            ? 'bg-white/8 text-white' 
            : 'text-slate-300 hover:text-white hover:bg-white/5'
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
              ? 'text-indigo-200' 
              : isButtonHovered 
                ? 'text-white' 
                : 'text-slate-400 group-hover:text-slate-200'
            }
          `} 
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      
      {isActive && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-indigo-300 rounded-l-full" />
      )}
    </button>
  );
};

export default SidebarButton;
