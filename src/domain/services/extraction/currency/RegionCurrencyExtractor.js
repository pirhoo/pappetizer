import { BaseExtractor } from '../BaseExtractor.js';
import { CurrencyService } from '../../CurrencyService.js';

/**
 * Infers currency from country/region hints in text
 * Priority: 5 (lowest - fallback)
 */
export class RegionCurrencyExtractor extends BaseExtractor {
  constructor(currencyService = null) {
    super({ name: 'RegionCurrencyExtractor', priority: 50 });
    this.currencyService = currencyService || new CurrencyService();
  }

  extract(text, _context = {}) {
    return this.currencyService.inferCurrencyFromRegion(text);
  }
}
