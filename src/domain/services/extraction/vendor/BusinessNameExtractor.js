import { BaseExtractor } from '../BaseExtractor.js';
import { isValidVendorName } from '../utils/validation.js';

/**
 * Extracts vendor from business name patterns (LLC, Inc, Ltd, etc.)
 * Priority: 3
 */
export class BusinessNameExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'BusinessNameExtractor', priority: 30 });
    this.patterns = [
      // Business suffixes
      /([A-Z][A-Za-z0-9\s&'\-\.]+?)\s*(?:LLC|L\.L\.C\.|Inc\.?|INC|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|GmbH|AG|SA|SAS|SARL|BV|NV|PLC|Pty|Co\.?|Company)\b/i,
      // "DBA" (Doing Business As)
      /(?:d\.?b\.?a\.?|doing business as)[\s:]+([^\n\r,]+)/i,
      // Registered trademark or service mark
      /([A-Z][A-Za-z0-9\s&'\-]+?)[\s]*[®™©]/,
    ];
  }

  extract(text, _context = {}) {
    for (const pattern of this.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (isValidVendorName(name)) {
          return name;
        }
      }
    }
    return null;
  }
}
