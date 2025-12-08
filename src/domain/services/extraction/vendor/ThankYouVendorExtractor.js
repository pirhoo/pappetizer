import { BaseExtractor } from '../BaseExtractor.js';
import { isValidVendorName } from '../utils/validation.js';

/**
 * Extracts vendor from "Thank you for shopping at..." patterns
 * Priority: 6
 */
export class ThankYouVendorExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'ThankYouVendorExtractor', priority: 60 });
    this.patterns = [
      /thank(?:s|\s*you)?(?:\s+for)?(?:\s+(?:shopping|visiting|dining|choosing|your (?:purchase|order|business)))?\s+(?:at|with)\s+([^\n\r!.]+)/i,
      /welcome\s+to\s+([A-Z][A-Za-z0-9\s&'\-]+)/i,
      /(?:visit|see)\s+(?:us|again)\s+(?:at|soon)\s+([A-Z][A-Za-z0-9\s&'\-]+)/i,
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
