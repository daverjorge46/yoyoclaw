/**
 * Internationalization (i18n) module for ui-zh-CN config panel
 * 
 * Provides simple translation support with automatic locale detection.
 * Falls back to English if locale is not supported.
 */

import { en } from './en';
import { zhCN } from './zh-CN';
import { es } from './es';

export type Locale = 'en' | 'zh-CN' | 'es';

export type TranslationKeys = keyof typeof en;

const translations: Record<Locale, Record<string, string>> = {
  'en': en,
  'zh-CN': zhCN,
  'es': es,
};

let currentLocale: Locale = 'en';

/**
 * Detect user's preferred locale from browser settings
 */
function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  const lang = browserLang.toLowerCase();
  
  if (lang.startsWith('zh')) return 'zh-CN';
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

/**
 * Initialize locale (call once on app start)
 */
export function initLocale(locale?: Locale): void {
  currentLocale = locale ?? detectLocale();
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set locale manually
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Translate a key to the current locale
 * Falls back to English, then to the key itself if not found
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[currentLocale]?.[key] 
    ?? translations['en']?.[key] 
    ?? key;
  
  // Simple parameter substitution: {{param}}
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  
  return text;
}

// Auto-initialize on module load
initLocale();
