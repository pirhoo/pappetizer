import { BaseExtractor } from '../BaseExtractor.js';
import { isValidVendorName } from '../utils/validation.js';

/**
 * Extracts vendor from explicit labels like "Vendor:", "Store:", etc.
 * Priority: 2
 */
export class LabeledVendorExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'LabeledVendorExtractor', priority: 20 });
    this.patterns = [
      /(?:vendor|merchant|store|shop|restaurant|retailer|seller|sold by|purchased (?:from|at)|billed by|payee)[\s:]+([^\n\r,;]+)/i,
      /(?:from|at)[\s:]+([A-Z][A-Za-z0-9\s&'\-\.]+?)(?:\s*(?:\n|,|$))/,
      /(?:receipt from|invoice from|bill from)[\s:]+([^\n\r]+)/i,
    ];
  }

  extract(text, _context = {}) {
    for (const pattern of this.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (isValidVendorName(vendor)) {
          return vendor;
        }
      }
    }
    return null;
  }
}
