/**
 * Locale (i18n) context — English + French. Keys from en.json / fr.json.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';

const messages = { en, fr };
const STORAGE_KEY = 'viewesta_locale';

const LocaleContext = createContext();

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

function getNested(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    current = current?.[key];
    if (current === undefined) return undefined;
  }
  return current;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  const setLocale = useCallback((lang) => {
    const next = lang === 'fr' ? 'fr' : 'en';
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const t = useCallback(
    (key, fallback = key) => {
      const dict = messages[locale] || messages.en;
      const value = getNested(dict, key);
      return value !== undefined ? value : (getNested(messages.en, key) || fallback);
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
