import { ar, type Translations } from './ar';
import { en } from './en';

export type Locale = 'ar' | 'en';

export const translations: Record<Locale, Translations> = { ar, en };

export const isRTL = (locale: Locale): boolean => locale === 'ar';

/** Resolve a dot-path key like "auth.login" against a locale. */
export function t(locale: Locale, key: string): string {
  const parts = key.split('.');
  let node: unknown = translations[locale] ?? translations.ar;

  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  return typeof node === 'string' ? node : key;
}

export { ar, en };
export type { Translations };
