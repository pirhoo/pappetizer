import { enUS, de, fr, es, it, pt, nl, pl, cs, hu, ru, ja, zhCN, ko, sv, nb, da, fi, el, tr, uk, ro, bg, hr } from 'date-fns/locale';

/**
 * Service for month name detection in multiple languages
 * Wraps date-fns locales
 */
export class MonthService {
  constructor() {
    this.locales = this.getLocales();
    this.monthMap = this.buildMonthMap();
  }

  /**
   * Get supported locales from date-fns
   * @private
   */
  getLocales() {
    return {
      en: enUS,
      de: de,
      fr: fr,
      es: es,
      it: it,
      pt: pt,
      nl: nl,
      pl: pl,
      cs: cs,
      hu: hu,
      ru: ru,
      ja: ja,
      zh: zhCN,
      ko: ko,
      sv: sv,
      nb: nb,    // Norwegian Bokmål
      da: da,
      fi: fi,
      el: el,    // Greek
      tr: tr,
      uk: uk,    // Ukrainian
      ro: ro,
      bg: bg,
      hr: hr,    // Croatian
    };
  }

  /**
   * Build month name to index (0-11) map from all locales
   * @private
   */
  buildMonthMap() {
    const map = {};

    for (const [, locale] of Object.entries(this.locales)) {
      if (!locale?.localize?.month) continue;

      for (let i = 0; i < 12; i++) {
        // Try different width options
        const widths = ['wide', 'abbreviated', 'narrow'];

        for (const width of widths) {
          try {
            const monthName = locale.localize.month(i, { width });
            if (monthName) {
              // Store lowercase, remove dots from abbreviations
              const normalized = monthName.toLowerCase().replace(/\./g, '');
              if (normalized.length >= 3) {
                map[normalized] = i;
              }
            }
          } catch {
            // Some locales may not support all widths
          }
        }
      }
    }

    // Add manual entries for edge cases and alternative spellings
    this.addManualEntries(map);

    return map;
  }

  /**
   * Add manual month name entries for edge cases
   * @private
   */
  addManualEntries(map) {
    // German alternative spellings
    map['maerz'] = 2;  // März alternative

    // English abbreviations with periods
    map['jan'] = 0;
    map['feb'] = 1;
    map['mar'] = 2;
    map['apr'] = 3;
    map['jun'] = 5;
    map['jul'] = 6;
    map['aug'] = 7;
    map['sep'] = 8;
    map['sept'] = 8;
    map['oct'] = 9;
    map['nov'] = 10;
    map['dec'] = 11;

    // French accented alternatives
    map['fevrier'] = 1;   // février without accent
    map['aout'] = 7;      // août without accent
    map['decembre'] = 11; // décembre without accent

    // Portuguese
    map['março'] = 2;
    map['marco'] = 2;

    // Spanish
    map['septiembre'] = 8;

    // Dutch
    map['mei'] = 4;

    // Common OCR errors
    map['januaty'] = 0;   // January with OCR error
    map['febuary'] = 1;   // February common misspelling
  }

  /**
   * Get month index (0-11) from month name
   * @param {string} monthName
   * @returns {number|null}
   */
  getMonthIndex(monthName) {
    if (!monthName) return null;

    const normalized = monthName.toLowerCase().replace(/\./g, '').trim();
    return this.monthMap[normalized] ?? null;
  }

  /**
   * Check if a string is a month name
   * @param {string} text
   * @returns {boolean}
   */
  isMonthName(text) {
    return this.getMonthIndex(text) !== null;
  }

  /**
   * Get all recognized month names
   * @returns {string[]}
   */
  getAllMonthNames() {
    return Object.keys(this.monthMap);
  }

  /**
   * Get month name in a specific locale
   * @param {number} monthIndex - 0-11
   * @param {string} localeCode - e.g., 'en', 'de', 'fr'
   * @param {string} width - 'wide', 'abbreviated', 'narrow'
   * @returns {string|null}
   */
  getMonthName(monthIndex, localeCode = 'en', width = 'wide') {
    const locale = this.locales[localeCode];
    if (!locale?.localize?.month) return null;

    try {
      return locale.localize.month(monthIndex, { width });
    } catch {
      return null;
    }
  }

  /**
   * Get supported locale codes
   * @returns {string[]}
   */
  getSupportedLocales() {
    return Object.keys(this.locales);
  }
}
