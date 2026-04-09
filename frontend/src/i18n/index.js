import en from './en.js';
import it from './it.js';

const translations = { en, it };

export function t(lang, key, vars = {}) {
  const dict = translations[lang] || translations.en;
  let str = dict[key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'it', label: 'IT' }
];
