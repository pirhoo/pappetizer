import { BaseExtractor } from '../BaseExtractor.js';
import { isValidDate } from '../utils/validation.js';
import { expandYear, parseAmbiguousDate } from '../utils/parsing.js';

/**
 * Extracts dates in slash format (DD/MM/YYYY or MM/DD/YYYY)
 * Priority: 3
 */
export class SlashDateExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'SlashDateExtractor', priority: 30 });
  }

  extract(text, context = {}) {
    const dates = [];
    const lines = context.lines || text.split('\n');

    for (const line of lines) {
      // European/US format: DD/MM/YYYY or MM/DD/YYYY
      const slashMatch = line.match(/\b(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})\b/);
      if (slashMatch) {
        const parsedDates = parseAmbiguousDate(
          parseInt(slashMatch[1]),
          parseInt(slashMatch[2]),
          parseInt(slashMatch[3]),
        );
        dates.push(...parsedDates.filter(d => isValidDate(d)));
      }

      // Short year: DD/MM/YY or MM/DD/YY
      const shortYearMatch = line.match(/\b(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2})\b/);
      if (shortYearMatch) {
        const year = expandYear(parseInt(shortYearMatch[3]));
        const parsedDates = parseAmbiguousDate(
          parseInt(shortYearMatch[1]),
          parseInt(shortYearMatch[2]),
          year,
        );
        dates.push(...parsedDates.filter(d => isValidDate(d)));
      }
    }

    return dates.length > 0 ? dates : null;
  }
}
