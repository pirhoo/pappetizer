import { BaseExtractor } from '../BaseExtractor.js';
import { CurrencyService } from '../../CurrencyService.js';

/**
 * Extracts ISO 4217 currency codes (USD, EUR, etc.)
 * Priority: 2
 */
export class CurrencyCodeExtractor extends BaseExtractor {
  constructor(currencyService = null) {
    super({ name: 'CurrencyCodeExtractor', priority: 20 });
    this.currencyService = currencyService || new CurrencyService();
  }

  extract(text, _context = {}) {
    // Get all valid currency codes from the service
    const codes = this.currencyService.getAllCodes();
    const codePattern = new RegExp(`\\b(${codes.join('|')})\\b`, 'i');
    const match = text.match(codePattern);
    if (match) {
      return match[1].toUpperCase();
    }
    return null;
  }
}
