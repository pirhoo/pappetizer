import currencyCodes from 'currency-codes';
import countries from 'i18n-iso-countries';
import { createRequire } from 'module';

// Register English locale for country names
const require = createRequire(import.meta.url);
const enLocale = require('i18n-iso-countries/langs/en.json');
countries.registerLocale(enLocale);

/**
 * Service for currency detection and mapping
 * Wraps currency-codes and i18n-iso-countries libraries
 */
export class CurrencyService {
  constructor() {
    this.symbolMap = this.buildSymbolMap();
    this.wordMap = this.buildWordMap();
    this.regionPatterns = this.buildRegionPatterns();
  }

  /**
   * Get all ISO 4217 currency codes
   * @returns {string[]}
   */
  getAllCodes() {
    return currencyCodes.codes();
  }

  /**
   * Check if a code is a valid ISO 4217 currency code
   * @param {string} code
   * @returns {boolean}
   */
  isValidCode(code) {
    return currencyCodes.code(code) !== undefined;
  }

  /**
   * Get currency info by code
   * @param {string} code
   * @returns {object|undefined}
   */
  getCurrencyInfo(code) {
    return currencyCodes.code(code);
  }

  /**
   * Get currency codes for a country name
   * @param {string} countryName
   * @returns {string|null}
   */
  getCurrencyByCountryName(countryName) {
    const currencies = currencyCodes.country(countryName);
    return currencies?.[0]?.code || null;
  }

  /**
   * Build symbol to currency mapping
   * Note: Some symbols like $ are ambiguous
   * @private
   */
  buildSymbolMap() {
    return {
      '$': ['USD', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'MXN'],
      '€': ['EUR'],
      '£': ['GBP'],
      '¥': ['JPY', 'CNY'],
      '₣': ['CHF'],
      'Fr.': ['CHF'],
      'CHF': ['CHF'],
      'SFr.': ['CHF'],
      '₹': ['INR'],
      '₽': ['RUB'],
      '₩': ['KRW'],
      '฿': ['THB'],
      '₫': ['VND'],
      'R$': ['BRL'],
      'zł': ['PLN'],
      'kr': ['SEK', 'NOK', 'DKK'],
      'Kč': ['CZK'],
      'Ft': ['HUF'],
      'lei': ['RON'],
      '₪': ['ILS'],
      '₴': ['UAH'],
      'RM': ['MYR'],
      'US$': ['USD'],
      'S$': ['SGD'],
      'HK$': ['HKD'],
      'NT$': ['TWD'],
      'A$': ['AUD'],
      'C$': ['CAD'],
      'NZ$': ['NZD'],
      'R': ['ZAR'],
    };
  }

  /**
   * Build currency word to code mapping
   * @private
   */
  buildWordMap() {
    return {
      dollar: 'USD', dollars: 'USD', buck: 'USD', bucks: 'USD',
      euro: 'EUR', euros: 'EUR',
      pound: 'GBP', pounds: 'GBP', sterling: 'GBP', quid: 'GBP',
      franc: 'CHF', francs: 'CHF', franken: 'CHF',
      yen: 'JPY',
      yuan: 'CNY', renminbi: 'CNY', rmb: 'CNY',
      rupee: 'INR', rupees: 'INR',
      real: 'BRL', reais: 'BRL',
      peso: 'MXN', pesos: 'MXN',
      krona: 'SEK', kronor: 'SEK', krone: 'NOK', kroner: 'NOK',
      zloty: 'PLN', złoty: 'PLN',
      koruna: 'CZK', korun: 'CZK',
      forint: 'HUF',
      lira: 'TRY',
      ruble: 'RUB', rubles: 'RUB', rouble: 'RUB', roubles: 'RUB',
      won: 'KRW',
      baht: 'THB',
      ringgit: 'MYR',
      rand: 'ZAR',
      shekel: 'ILS', shekels: 'ILS',
      dirham: 'AED', dirhams: 'AED',
      riyal: 'SAR', riyals: 'SAR',
    };
  }

  /**
   * Build region patterns for currency inference
   * @private
   */
  buildRegionPatterns() {
    return [
      { patterns: ['switzerland', 'swiss', 'zürich', 'zurich', 'geneva', 'bern', 'basel'], currency: 'CHF' },
      { patterns: ['germany', 'german', 'deutschland', 'berlin', 'munich', 'frankfurt', 'münchen'], currency: 'EUR' },
      { patterns: ['france', 'french', 'paris', 'lyon', 'marseille'], currency: 'EUR' },
      { patterns: ['italy', 'italian', 'italia', 'rome', 'roma', 'milan', 'milano'], currency: 'EUR' },
      { patterns: ['spain', 'spanish', 'españa', 'madrid', 'barcelona'], currency: 'EUR' },
      { patterns: ['netherlands', 'dutch', 'amsterdam', 'rotterdam'], currency: 'EUR' },
      { patterns: ['belgium', 'belgian', 'brussels', 'bruxelles'], currency: 'EUR' },
      { patterns: ['austria', 'austrian', 'wien', 'vienna'], currency: 'EUR' },
      { patterns: ['ireland', 'irish', 'dublin'], currency: 'EUR' },
      { patterns: ['portugal', 'portuguese', 'lisbon', 'lisboa'], currency: 'EUR' },
      { patterns: ['greece', 'greek', 'athens'], currency: 'EUR' },
      { patterns: ['finland', 'finnish', 'helsinki'], currency: 'EUR' },
      { patterns: ['united kingdom', 'uk', 'britain', 'british', 'england', 'london', 'manchester', 'scotland', 'wales'], currency: 'GBP' },
      { patterns: ['japan', 'japanese', 'tokyo', 'osaka'], currency: 'JPY' },
      { patterns: ['china', 'chinese', 'beijing', 'shanghai', 'guangzhou'], currency: 'CNY' },
      { patterns: ['india', 'indian', 'mumbai', 'delhi', 'bangalore'], currency: 'INR' },
      { patterns: ['australia', 'australian', 'sydney', 'melbourne', 'brisbane'], currency: 'AUD' },
      { patterns: ['canada', 'canadian', 'toronto', 'vancouver', 'montreal'], currency: 'CAD' },
      { patterns: ['sweden', 'swedish', 'stockholm'], currency: 'SEK' },
      { patterns: ['norway', 'norwegian', 'oslo'], currency: 'NOK' },
      { patterns: ['denmark', 'danish', 'copenhagen'], currency: 'DKK' },
      { patterns: ['poland', 'polish', 'warsaw', 'krakow'], currency: 'PLN' },
      { patterns: ['czech', 'prague', 'praha'], currency: 'CZK' },
      { patterns: ['hungary', 'hungarian', 'budapest'], currency: 'HUF' },
      { patterns: ['russia', 'russian', 'moscow', 'moskva'], currency: 'RUB' },
      { patterns: ['brazil', 'brazilian', 'são paulo', 'rio'], currency: 'BRL' },
      { patterns: ['mexico', 'mexican', 'mexico city', 'ciudad de mexico'], currency: 'MXN' },
      { patterns: ['south korea', 'korean', 'seoul'], currency: 'KRW' },
      { patterns: ['singapore', 'singaporean'], currency: 'SGD' },
      { patterns: ['hong kong'], currency: 'HKD' },
      { patterns: ['taiwan', 'taiwanese', 'taipei'], currency: 'TWD' },
      { patterns: ['thailand', 'thai', 'bangkok'], currency: 'THB' },
      { patterns: ['malaysia', 'malaysian', 'kuala lumpur'], currency: 'MYR' },
      { patterns: ['israel', 'israeli', 'tel aviv', 'jerusalem'], currency: 'ILS' },
      { patterns: ['uae', 'emirates', 'dubai', 'abu dhabi'], currency: 'AED' },
      { patterns: ['saudi', 'riyadh'], currency: 'SAR' },
      { patterns: ['south africa', 'johannesburg', 'cape town'], currency: 'ZAR' },
    ];
  }

  /**
   * Get symbol map for currency detection
   * @returns {Object<string, string[]>}
   */
  getSymbolMap() {
    return this.symbolMap;
  }

  /**
   * Get word map for currency detection
   * @returns {Object<string, string>}
   */
  getWordMap() {
    return this.wordMap;
  }

  /**
   * Get region patterns for currency inference
   * @returns {Array<{patterns: string[], currency: string}>}
   */
  getRegionPatterns() {
    return this.regionPatterns;
  }

  /**
   * Get currencies by symbol
   * @param {string} symbol
   * @returns {string[]|null}
   */
  getCurrenciesBySymbol(symbol) {
    return this.symbolMap[symbol] || null;
  }

  /**
   * Get currency by word
   * @param {string} word
   * @returns {string|null}
   */
  getCurrencyByWord(word) {
    return this.wordMap[word.toLowerCase()] || null;
  }

  /**
   * Infer currency from region/location text
   * @param {string} text
   * @returns {string|null}
   */
  inferCurrencyFromRegion(text) {
    const lowerText = text.toLowerCase();

    for (const region of this.regionPatterns) {
      for (const pattern of region.patterns) {
        if (lowerText.includes(pattern)) {
          return region.currency;
        }
      }
    }

    return null;
  }

  /**
   * Disambiguate dollar symbol based on context
   * @param {string} text
   * @returns {string}
   */
  disambiguateDollar(text) {
    // Check for specific dollar variants
    if (/\b(cad|canadian|canada|toronto|vancouver|montreal)\b/i.test(text)) return 'CAD';
    if (/\b(aud|australian|australia|sydney|melbourne|brisbane)\b/i.test(text)) return 'AUD';
    if (/\b(nzd|new zealand|auckland|wellington)\b/i.test(text)) return 'NZD';
    if (/\b(sgd|singapore)\b/i.test(text)) return 'SGD';
    if (/\b(hkd|hong kong)\b/i.test(text)) return 'HKD';
    if (/\b(twd|taiwan|taiwanese|taipei)\b/i.test(text)) return 'TWD';
    if (/\b(mxn|mexican|mexico)\b/i.test(text)) return 'MXN';

    // Check for US-specific indicators
    if (/\b(usa|united states|american|us\$)\b/i.test(text)) return 'USD';

    // Default to USD for $ symbol
    return 'USD';
  }

  /**
   * Get country name by alpha-2 code
   * @param {string} code - ISO 3166-1 alpha-2 country code
   * @returns {string|undefined}
   */
  getCountryName(code) {
    return countries.getName(code, 'en');
  }

  /**
   * Get alpha-2 country code by name
   * @param {string} name - Country name
   * @returns {string|undefined}
   */
  getCountryCode(name) {
    return countries.getAlpha2Code(name, 'en');
  }
}
