import { BaseExtractor } from '../BaseExtractor.js';
import { parseAmount } from '../utils/parsing.js';

/**
 * Extracts amounts at end of lines (common in receipts)
 * Priority: 2
 */
export class LineEndAmountExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'LineEndAmountExtractor', priority: 20 });
    this.patterns = [
      /[\$€£¥₣₹]\s*([\d,]+\.\d{2})\s*$/,
      /([\d,]+\.\d{2})\s*[\$€£¥₣₹]?\s*$/,
      /([\d,]+\.\d{2})\s*(?:usd|eur|gbp|chf)?$/i,
    ];
  }

  extract(text, context = {}) {
    const amounts = [];
    const lines = context.lines || text.split('\n');

    for (const line of lines) {
      for (const pattern of this.patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const amount = parseAmount(match[1]);
          if (amount !== null && amount > 0) {
            amounts.push(amount);
            break;
          }
        }
      }
    }

    return amounts.length > 0 ? amounts : null;
  }
}
