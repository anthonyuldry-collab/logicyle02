import React from 'react';
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand';

type BrandMarkVariant = 'mark' | 'wordmark' | 'lockup';
type BrandMarkSize = 'sm' | 'md' | 'lg' | 'hero';

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  size?: BrandMarkSize;
  className?: string;
  align?: 'left' | 'center';
  /** Affiche le sous-titre « Cycling Performance Systems » (lockup uniquement). */
  showTagline?: boolean;
}

const MARK_PX: Record<BrandMarkSize, number> = {
  sm: 28,
  md: 44,
  lg: 72,
  hero: 96,
};

const WORD_CLASS: Record<BrandMarkSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  hero: 'text-5xl sm:text-6xl md:text-7xl',
};

const TAG_CLASS: Record<BrandMarkSize, string> = {
  sm: 'text-[8px] tracking-[0.14em]',
  md: 'text-[10px] tracking-[0.16em]',
  lg: 'text-xs tracking-[0.18em]',
  hero: 'text-[11px] sm:text-sm tracking-[0.2em]',
};

/** Monogramme R officiel (raster extrait du lockup). */
export const RovikMark: React.FC<{ className?: string; alt?: string }> = ({
  className = '',
  alt = BRAND_NAME,
}) => (
  <img
    src="/icons/rovik-mark.png"
    alt={alt}
    className={`object-contain ${className}`}
    draggable={false}
  />
);

const BrandMark: React.FC<BrandMarkProps> = ({
  variant = 'lockup',
  size = 'md',
  className = '',
  align = 'left',
  showTagline = true,
}) => {
  const markPx = MARK_PX[size];
  const mark = (
    <RovikMark
      alt={variant === 'mark' ? BRAND_NAME : ''}
      className="h-full w-full"
    />
  );

  if (variant === 'mark') {
    return (
      <span className={`inline-flex ${className}`} style={{ width: markPx, height: markPx }}>
        {mark}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-3 sm:gap-4 ${
        align === 'center' ? 'justify-center' : ''
      } ${className}`}
    >
      <span className="shrink-0" style={{ width: markPx, height: markPx }}>
        {mark}
      </span>
      <span className="flex flex-col items-start min-w-0 leading-none text-left">
        <span
          className={`font-semibold lowercase text-white ${WORD_CLASS[size]}`}
          style={{
            fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
            letterSpacing: size === 'hero' ? '-0.045em' : '-0.03em',
          }}
        >
          {BRAND_NAME}
        </span>
        {variant === 'lockup' && showTagline && (
          <span
            className={`mt-1.5 uppercase text-slate-400 ${TAG_CLASS[size]}`}
            style={{ fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" }}
          >
            {BRAND_TAGLINE}
          </span>
        )}
      </span>
    </span>
  );
};

export default BrandMark;
