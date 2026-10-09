import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import te from './locales/te.json';

const STORAGE_KEY = 'cattlefeed_lang';

export const SUPPORTED_LANGS = [
  { code: 'en', labelKey: 'app.english' },
  { code: 'te', labelKey: 'app.telugu' },
];

const saved = typeof window !== 'undefined'
  ? localStorage.getItem(STORAGE_KEY)
  : null;

const initialLng = saved === 'te' || saved === 'en' ? saved : 'en';

const applyDocumentLang = (lng) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dataset.lang = lng;
  document.body.classList.toggle('lang-te', lng === 'te');
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      te: { translation: te },
    },
    lng: initialLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

applyDocumentLang(i18n.language);

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  applyDocumentLang(lng);
});

export default i18n;
