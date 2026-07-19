import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

/**
 * i18n plumbing (the BoxVault frontend pattern, build-time language list).
 * Strings live in public/locales/{lng}/common.json — English is the MASTER
 * file every key lands in first; other languages are whole-file translations
 * of it. The language list is scanned from public/locales/ at build time
 * (__SUPPORTED_LOCALES__, defined in vite.config.js), so adding a locale
 * folder is all it takes to add a language. useSuspense stays off so
 * untranslated screens render their keys' fallback instead of suspending.
 */

export const supportedLanguages = __SUPPORTED_LOCALES__;

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    ns: ['common'],
    defaultNS: 'common',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
  });

export default i18n;
