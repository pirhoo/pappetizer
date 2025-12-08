import { BaseExtractor } from '../BaseExtractor.js';
import { parseAmount } from '../utils/parsing.js';

/**
 * Extracts all monetary amounts from text using various patterns
 * Priority: 3
 */
export class PatternAmountExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'PatternAmountExtractor', priority: 30 });
    this.patterns = [
      /[\$€£¥₣₹]\s*([\d,]+\.\d{2})/g,
      /[\$€£¥₣₹]\s*([\d,]+)/g,
      /([\d,]+\.\d{2})\s*(?:usd|eur|gbp|chf|cad|aud|jpy|cny)/gi,
      // European format (comma as decimal)
      /([\d.]+,\d{2})\s*[€£]/g,
    ];
  }

  extract(text, _context = {}) {
    const amounts = [];

    for (const pattern of this.patterns) {
      // Reset regex state
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = parseAmount(match[1]);
        if (amount !== null && amount > 0) {
          amounts.push(amount);
        }
      }
    }

    // Remove duplicates
    const uniqueAmounts = [...new Set(amounts)];
    return uniqueAmounts.length > 0 ? uniqueAmounts : null;
  }
}
