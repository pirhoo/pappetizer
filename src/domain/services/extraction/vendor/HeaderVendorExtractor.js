import { BaseExtractor } from '../BaseExtractor.js';
import { isValidVendorName, looksLikeBusinessName } from '../utils/validation.js';

/**
 * Extracts vendor from header/logo area (first meaningful lines)
 * Priority: 4
 */
export class HeaderVendorExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'HeaderVendorExtractor', priority: 40 });
    this.skipPatterns = [
      /^(receipt|invoice|bill|order|transaction|confirmation|payment)/i,
      /^(tax|vat|gst)\s*(receipt|invoice)/i,
      /^\*+$/,
      /^-+$/,
      /^=+$/,
      /^#{1,}/,
      /^\d+$/,
      /^(tel|phone|fax|email|web|www|http)/i,
      /^(customer|cashier|register|terminal|trans)/i,
    ];
  }

  extract(text, context = {}) {
    const lines = context.lines || text.split('\n').map(l => l.trim()).filter(l => l);

    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i];

      // Skip lines matching skip patterns
      let shouldSkip = false;
      for (const pattern of this.skipPatterns) {
        if (pattern.test(line)) {
          shouldSkip = true;
          break;
        }
      }
      if (shouldSkip) continue;

      // Skip if it looks like a date, amount, or address
      if (!isValidVendorName(line)) continue;

      // Check if it looks like a business name (capitalized, reasonable length)
      if (looksLikeBusinessName(line)) {
        return line;
      }
    }

    return null;
  }
}
