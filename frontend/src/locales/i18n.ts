'use client';

import i18n from 'i18next';
import languageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import vi from '@/locales/vi.json';
import en from '@/locales/en.json';

if (!i18n.isInitialized) {
  i18n.use(languageDetector).use(initReactI18next).init({
    resources: {
      vi: { translation: vi },
      en: { translation: en }
    },
    supportedLngs: ['vi', 'en'],
    fallbackLng: 'vi',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    }
  });
}

export default i18n;