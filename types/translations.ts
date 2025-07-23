import en from '../lang/en';

export type TranslationKeys = keyof typeof en;

export interface LanguageStrings {
  [key: string]: string;
}

export interface Languages {
  en: typeof en;
  it: LanguageStrings;
  es: LanguageStrings;
  fr: LanguageStrings;
  sv: LanguageStrings;
  fi: LanguageStrings;
}

// Función de traducción con mejor tipado
export const translate = (key: TranslationKeys, locale: keyof Languages, translations: Languages): string => {
  return translations[locale]?.[key] || translations.en[key] || key;
};