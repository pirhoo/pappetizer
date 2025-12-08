import { BaseExtractor } from '../BaseExtractor.js';
import { isValidVendorName } from '../utils/validation.js';

/**
 * Extracts vendor from "Store #123" patterns with preceding name
 * Priority: 7
 */
export class StoreNumberVendorExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'StoreNumberVendorExtractor', priority: 70 });
    this.patterns = [
      /([A-Z][A-Za-z0-9\s&'\-]+?)\s+(?:store|location|branch|outlet)?\s*#\s*\d+/i,
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
