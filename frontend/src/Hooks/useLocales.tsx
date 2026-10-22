// src/hooks/useLocales.ts
'use client';
import { useTranslation } from 'react-i18next';

export const LANGS = [
  { value: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { value: 'en', label: 'English', short: 'EN' },
] as const;

export default function useLocales() {
  const { i18n, t: translate } = useTranslation();
  const currentLang = LANGS.find((l) => l.value === i18n.resolvedLanguage) ?? LANGS[0];

  const onChangeLang = (lang: string) => {
    i18n.changeLanguage(lang);           // LanguageDetector tự lưu vào localStorage
    document.documentElement.lang = lang; // cập nhật <html lang> cho trình đọc màn hình
  };

  const translateError = (code?: string) =>
  translate(`errors.${code}`, { defaultValue: translate('common.unknownError') });

  return { translate, onChangeLang, currentLang, allLang: LANGS, translateError };
}