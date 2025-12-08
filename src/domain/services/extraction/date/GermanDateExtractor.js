import { BaseExtractor } from '../BaseExtractor.js';
import { isValidDate } from '../utils/validation.js';
import { expandYear } from '../utils/parsing.js';

/**
 * Extracts dates in German format (DD.MM.YYYY)
 * Priority: 5
 */
export class GermanDateExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'GermanDateExtractor', priority: 50 });
  }

  extract(text, context = {}) {
    const dates = [];
    const lines = context.lines || text.split('\n');

    for (const line of lines) {
      // German format: DD. Month YYYY or DD.MM.YYYY
      const germanMatch = line.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})\b/);
      if (germanMatch) {
        let year = parseInt(germanMatch[3]);
        if (year < 100) year = expandYear(year);
        const date = new Date(year, parseInt(germanMatch[2]) - 1, parseInt(germanMatch[1]));
        if (isValidDate(date)) {
          dates.push(date);
        }
      }
    }

    return dates.length > 0 ? dates : null;
  }
}
