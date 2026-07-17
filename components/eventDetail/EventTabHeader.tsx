import React from 'react';

interface EventTabHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const EventTabHeader: React.FC<EventTabHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export default EventTabHeader;
