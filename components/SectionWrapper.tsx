import React from 'react';

interface SectionWrapperProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'dashboard' | 'hub' | 'immersive';
  hideTitleOnMobile?: boolean;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  title,
  subtitle,
  actionButton,
  children,
  variant = 'default',
  hideTitleOnMobile = false,
}) => {
  const isCompact = variant === 'dashboard' || variant === 'hub';
  const isImmersive = variant === 'immersive';

  return (
    <section
      className={`section-card relative mx-auto mb-6 w-full max-w-7xl sm:mb-8 ${
        isImmersive
          ? 'min-h-[calc(100vh-2rem)] rounded-none border-0 bg-transparent p-0 shadow-none'
          : 'rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-xl shadow-black/30 sm:p-6'
      }`}
    >
      <div
        className={`relative z-10 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left ${
          isCompact ? 'mb-4 sm:mb-5' : 'mb-4 sm:mb-6'
        } ${hideTitleOnMobile ? 'hidden sm:flex' : ''} ${isImmersive ? 'px-5 pt-5 sm:px-8 sm:pt-8' : ''}`}
      >
        <div className="min-w-0 w-full sm:w-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-300/90">
            LogiCycle
          </p>
          <h2
            className={
              isImmersive
                ? 'mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl'
                : isCompact
                  ? 'mt-1.5 text-lg font-semibold tracking-tight text-white sm:text-xl lg:text-2xl'
                  : 'mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl lg:text-3xl'
            }
            style={isImmersive ? { letterSpacing: '-0.03em' } : undefined}
          >
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {actionButton && <div className="shrink-0">{actionButton}</div>}
      </div>
      <div className={`relative z-10 ${isImmersive ? 'px-5 pb-8 sm:px-8' : ''}`}>{children}</div>
    </section>
  );
};

export default SectionWrapper;
