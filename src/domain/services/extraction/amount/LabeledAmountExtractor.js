import { BaseExtractor } from '../BaseExtractor.js';
import { parseAmount } from '../utils/parsing.js';

/**
 * Extracts amounts from explicit labels like "Total:", "Grand Total:", etc.
 * Priority: 1 (highest - most reliable)
 */
export class LabeledAmountExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'LabeledAmountExtractor', priority: 10 });
    // Patterns ordered by specificity
    this.patterns = [
      // Grand total (highest priority)
      /(?:grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*amount|net\s*total|final\s*total)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Regular total
      /(?:^|\n)\s*total[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/im,
      // Total with currency after
      /(?:^|\n)\s*total[\s:]*\s*([\d,]+\.?\d*)\s*(?:usd|eur|gbp|chf|cad|aud)/im,
      // "To pay" / "You pay"
      /(?:to\s*pay|you\s*pay|amount\s*paid|paid\s*amount)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Card/payment amount
      /(?:card|visa|mastercard|amex|debit|credit)\s*(?:amount|payment)?[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Sum
      /(?:sum|summe|somme|suma|totale)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
    ];
  }

  extract(text, _context = {}) {
    for (const pattern of this.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseAmount(match[1]);
        if (amount !== null && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }
}
