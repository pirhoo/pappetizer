import { BaseExtractor } from '../BaseExtractor.js';
import { CurrencyService } from '../../CurrencyService.js';

/**
 * Extracts currency from words (dollar, euro, franc, etc.)
 * Priority: 4
 */
export class CurrencyWordExtractor extends BaseExtractor {
  constructor(currencyService = null) {
    super({ name: 'CurrencyWordExtractor', priority: 40 });
    this.currencyService = currencyService || new CurrencyService();
  }

  extract(text, _context = {}) {
    const lowerText = text.toLowerCase();
    const wordMap = this.currencyService.getWordMap();

    for (const [word, currency] of Object.entries(wordMap)) {
      const pattern = new RegExp(`\\b${word}s?\\b`, 'i');
      if (pattern.test(lowerText)) {
        return currency;
      }
    }
    return null;
  }
}
