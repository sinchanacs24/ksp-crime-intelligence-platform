import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'kn';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

/**
 * Minimal i18n dictionary for static UI chrome (nav labels, buttons).
 * Dynamic content (AI answers, case data) is translated server-side via
 * the QuickML/Zia translation pipeline in ai/voicePipeline.js and the
 * chat service's `language` parameter — this context only covers the
 * fixed shell text so switching languages doesn't require a rebuild.
 */
const DICTIONARY: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    firSearch: 'FIR Search',
    criminalSearch: 'Criminal Search',
    victimSearch: 'Victim Search',
    networkAnalysis: 'Network Analysis',
    analytics: 'Crime Analytics',
    prediction: 'Crime Prediction',
    financialCrime: 'Financial Crime',
    aiAssistant: 'AI Assistant',
    adminPanel: 'Admin Panel',
    auditLogs: 'Audit Logs',
    settings: 'Settings',
    signOut: 'Sign Out',
    search: 'Search',
    loading: 'Loading...'
  },
  kn: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    firSearch: 'ಎಫ್ಐಆರ್ ಹುಡುಕಾಟ',
    criminalSearch: 'ಅಪರಾಧಿ ಹುಡುಕಾಟ',
    victimSearch: 'ಸಂತ್ರಸ್ತ ಹುಡುಕಾಟ',
    networkAnalysis: 'ಜಾಲ ವಿಶ್ಲೇಷಣೆ',
    analytics: 'ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆ',
    prediction: 'ಅಪರಾಧ ಮುನ್ಸೂಚನೆ',
    financialCrime: 'ಆರ್ಥಿಕ ಅಪರಾಧ',
    aiAssistant: 'ಎಐ ಸಹಾಯಕ',
    adminPanel: 'ನಿರ್ವಾಹಕ ಫಲಕ',
    auditLogs: 'ಲೆಕ್ಕಪರಿಶೋಧನೆ ದಾಖಲೆಗಳು',
    settings: 'ಸಂಯೋಜನೆಗಳು',
    signOut: 'ಸೈನ್ ಔಟ್',
    search: 'ಹುಡುಕಿ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...'
  }
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const t = (key: string) => DICTIONARY[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
