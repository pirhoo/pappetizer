import { BaseExtractor } from '../BaseExtractor.js';
import { CurrencyService } from '../../CurrencyService.js';

/**
 * Extracts currency from symbols ($, €, £, etc.)
 * Priority: 3
 */
export class CurrencySymbolExtractor extends BaseExtractor {
  constructor(currencyService = null) {
    super({ name: 'CurrencySymbolExtractor', priority: 30 });
    this.currencyService = currencyService || new CurrencyService();
    // Check compound symbols FIRST (before $ which would match NT$, HK$, etc.)
    // US$ must come before S$ to avoid matching S$ in US$
    this.compoundSymbols = ['CHF', 'Fr.', 'SFr.', 'HK$', 'US$', 'S$', 'A$', 'C$', 'NZ$', 'NT$', 'RM'];
    // Then check unique symbols and ambiguous $ last
    this.symbolOrder = ['€', '£', '¥', '₣', '₹', '₽', '₩', '฿', '₫', '₪', '₴', 'R$', 'zł', 'Kč', 'Ft', '$'];
  }

  extract(text, _context = {}) {
    const symbolMap = this.currencyService.getSymbolMap();

    // Check compound symbols first
    for (const symbol of this.compoundSymbols) {
      if (text.includes(symbol)) {
        const currencies = symbolMap[symbol];
        if (currencies) {
          return currencies[0];
        }
      }
    }

    // Then check unique symbols and ambiguous $ last
    for (const symbol of this.symbolOrder) {
      if (text.includes(symbol)) {
        const currencies = symbolMap[symbol];
        if (currencies && currencies.length === 1) {
          return currencies[0];
        }

        // For ambiguous symbols like $, try to determine from context
        if (symbol === '$') {
          return this.currencyService.disambiguateDollar(text);
        }
      }
    }

    return null;
  }
}
