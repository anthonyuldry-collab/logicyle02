import React from 'react';

export interface SubNavGroup {
  id: string;
  label: string;
  tabs: { id: string; label: string }[];
}

interface SubNavBarProps {
  groups: SubNavGroup[];
  activeGroupId: string;
  activeTabId: string;
  onGroupChange: (groupId: string) => void;
  onTabChange: (tabId: string) => void;
  ariaLabel: string;
}

const SubNavBar: React.FC<SubNavBarProps> = ({
  groups,
  activeGroupId,
  activeTabId,
  onGroupChange,
  onTabChange,
  ariaLabel,
}) => {
  const currentGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  return (
    <div className="sub-nav sticky top-0 z-10 -mx-1 bg-slate-950 px-1 pb-2 pt-1">
      <div className="mb-2 flex gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onGroupChange(group.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 ${
              activeGroupId === group.id
                ? 'bg-indigo-500/30 text-indigo-100 ring-1 ring-indigo-400/40'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>
      <nav
        className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5"
        role="tablist"
        aria-label={ariaLabel}
      >
        {currentGroup.tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTabId === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTabId === tab.id
                ? 'bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SubNavBar;
