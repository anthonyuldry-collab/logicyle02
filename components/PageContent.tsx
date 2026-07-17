import React from 'react';

interface PageContentProps {
  children: React.ReactNode;
  /** Pleine largeur sans fond blanc (ex. tableau de bord immersif) */
  immersive?: boolean;
}

const PageContent: React.FC<PageContentProps> = ({ children, immersive = false }) => (
  <div
    className={
      immersive
        ? 'page-content page-content--immersive mx-auto w-full max-w-none p-0'
        : 'page-content mx-auto w-full max-w-7xl'
    }
  >
    {children}
  </div>
);

export default PageContent;
