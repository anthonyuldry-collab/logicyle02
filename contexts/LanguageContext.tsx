import React, { createContext, useCallback, useMemo, ReactNode } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => console.warn('⚠️ setLanguage function not yet initialized'),
});

interface LanguageProviderProps {
  children: ReactNode;
  language: Language;
  setLanguage: (lang?: Language) => void;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, language, setLanguage }) => {
  const handleSetLanguage = useCallback(
    (newLang: Language) => {
      setLanguage(newLang);
    },
    [setLanguage]
  );

  const value = useMemo(
    () => ({ language, setLanguage: handleSetLanguage }),
    [language, handleSetLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
