import React from 'react';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  /** Lecture seule */
  readOnly?: boolean;
}

const SIZE = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
} as const;

/** Étoile pleine / vide — fill explicite (le StarIcon outline ne se remplit pas). */
const StarGlyph: React.FC<{
  filled: boolean;
  className?: string;
}> = ({ filled, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
  >
    <path
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
);

const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  size = 'md',
  readOnly = false,
}) => {
  const cls = SIZE[size];
  const rounded = Math.round(value);

  return (
    <div
      className="inline-flex items-center gap-1"
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`${rounded} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rounded;
        if (readOnly || !onChange) {
          return (
            <StarGlyph
              key={n}
              filled={filled}
              className={`${cls} ${filled ? 'text-amber-400' : 'text-gray-300'}`}
            />
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === rounded}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            className={`rounded p-0.5 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              filled ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'
            }`}
          >
            <StarGlyph filled={filled} className={cls} />
          </button>
        );
      })}
    </div>
  );
};

export default RatingStars;
