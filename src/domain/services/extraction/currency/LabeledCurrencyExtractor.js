import { BaseExtractor } from '../BaseExtractor.js';
import { CurrencyService } from '../../CurrencyService.js';

/**
 * Extracts currency from explicit labels like "Currency: EUR"
 * Priority: 1 (highest - most reliable)
 */
export class LabeledCurrencyExtractor extends BaseExtractor {
  constructor(currencyService = null) {
    super({ name: 'LabeledCurrencyExtractor', priority: 10 });
    this.currencyService = currencyService || new CurrencyService();
    this.patterns = [
      /(?:currency|curr\.?|devise)[\s:]+([A-Z]{3})/i,
      /(?:paid\s*in|payment\s*in|amount\s*in)[\s:]+([A-Z]{3})/i,
    ];
  }

  extract(text, _context = {}) {
    for (const pattern of this.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const code = match[1].toUpperCase();
        if (this.currencyService.isValidCode(code)) {
          return code;
        }
      }
    }
    return null;
  }
}
