import React, { useState } from 'react';
import { isDisplayableImageUrl } from '../utils/mediaUrlUtils';

interface MediaThumbProps {
  src?: string | null;
  alt?: string;
  className?: string;
  /** Classes du conteneur quand pas d’image / erreur de chargement */
  fallbackClassName?: string;
  href?: string;
}

/**
 * Miniature image qui n’affiche jamais d’icône « cassée » du navigateur :
 * URL vide / invalide / erreur réseau → fallback discret.
 */
const MediaThumb: React.FC<MediaThumbProps> = ({
  src,
  alt = '',
  className = 'h-20 w-20 rounded-md border object-cover',
  fallbackClassName = 'h-20 w-20 rounded-md border border-dashed border-gray-300 bg-gray-100 flex items-center justify-center text-gray-400',
  href,
}) => {
  const [failed, setFailed] = useState(false);
  const usable = isDisplayableImageUrl(src) && !failed;

  const fallback = (
    <div className={fallbackClassName} aria-hidden>
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zm6-12.75a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
        />
      </svg>
    </div>
  );

  if (!usable) {
    return fallback;
  }

  const img = (
    <img
      src={src!}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );

  if (href && isDisplayableImageUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0">
        {img}
      </a>
    );
  }

  return <div className="shrink-0">{img}</div>;
};

export default MediaThumb;
