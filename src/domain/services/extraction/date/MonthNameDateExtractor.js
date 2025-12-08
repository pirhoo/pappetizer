import { BaseExtractor } from '../BaseExtractor.js';
import { MonthService } from '../../MonthService.js';
import { expandYear } from '../utils/parsing.js';

/**
 * Extracts dates with month names (March 15, 2024, 15 March 2024, etc.)
 * Priority: 4
 */
export class MonthNameDateExtractor extends BaseExtractor {
  constructor(monthService = null) {
    super({ name: 'MonthNameDateExtractor', priority: 40 });
    this.monthService = monthService || new MonthService();
  }

  extract(text, _context = {}) {
    const dates = [];
    const monthNames = this.monthService.getAllMonthNames();
    const monthPattern = monthNames.join('|');

    // Month DD, YYYY or Month DD YYYY
    const mdyRegex = new RegExp(
      `\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]+(\\d{4})\\b`,
      'gi',
    );
    let match;
    while ((match = mdyRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[1]);
      if (month !== null) {
        const date = new Date(parseInt(match[3]), month, parseInt(match[2]));
        dates.push(date);
      }
    }

    // DD Month YYYY
    const dmyRegex = new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${monthPattern})\\.?[,\\s]+(\\d{4})\\b`,
      'gi',
    );
    while ((match = dmyRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[2]);
      if (month !== null) {
        const date = new Date(parseInt(match[3]), month, parseInt(match[1]));
        dates.push(date);
      }
    }

    // DD Month YY (short year)
    const dmyShortRegex = new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${monthPattern})\\.?[,\\s]+(\\d{2})\\b`,
      'gi',
    );
    while ((match = dmyShortRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[2]);
      if (month !== null) {
        const year = expandYear(parseInt(match[3]));
        const date = new Date(year, month, parseInt(match[1]));
        dates.push(date);
      }
    }

    // Month YYYY (no day, assume 1st)
    const myRegex = new RegExp(`\\b(${monthPattern})\\.?[,\\s]+(\\d{4})\\b`, 'gi');
    while ((match = myRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[1]);
      if (month !== null) {
        const date = new Date(parseInt(match[2]), month, 1);
        dates.push(date);
      }
    }

    return dates.length > 0 ? dates : null;
  }
}
