import { BaseExtractor } from '../BaseExtractor.js';
import { isValidDate } from '../utils/validation.js';

/**
 * Extracts dates from explicit labels like "Date:", "Invoice Date:", etc.
 * Priority: 1 (highest - most reliable)
 */
export class LabeledDateExtractor extends BaseExtractor {
  constructor(options = {}) {
    super({ name: 'LabeledDateExtractor', priority: 10 });
    this.findAllDates = options.findAllDates || null;
  }

  setDateFinder(findAllDates) {
    this.findAllDates = findAllDates;
  }

  extract(text, _context = {}) {
    const labelPatterns = [
      /(?:date|dated|issued|invoice\s*date|receipt\s*date|order\s*date|purchase\s*date|transaction\s*date|trans\.?\s*date|payment\s*date|bill\s*date|sale\s*date)[\s:]+([^\n\r]{5,30})/i,
      /(?:date\s*of\s*(?:purchase|sale|transaction|issue|invoice|receipt))[\s:]+([^\n\r]{5,30})/i,
    ];

    for (const pattern of labelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = this.parseFlexibleDate(match[1].trim());
        if (parsed) return parsed;
      }
    }

    return null;
  }

  parseFlexibleDate(dateStr) {
    if (!dateStr) return null;

    // Clean up the string
    dateStr = dateStr.trim().replace(/\s+/g, ' ');

    // Try native parsing first
    const nativeParsed = new Date(dateStr);
    if (isValidDate(nativeParsed)) {
      return nativeParsed;
    }

    // Try pattern matching if we have a date finder
    if (this.findAllDates) {
      const dates = this.findAllDates(dateStr);
      return dates.length > 0 ? dates[0] : null;
    }

    return null;
  }
}
