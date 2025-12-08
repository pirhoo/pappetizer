import { BaseExtractor } from '../BaseExtractor.js';
import { isValidDate } from '../utils/validation.js';

/**
 * Extracts dates in ISO format (YYYY-MM-DD)
 * Priority: 2
 */
export class IsoDateExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'IsoDateExtractor', priority: 20 });
  }

  extract(text, context = {}) {
    const dates = [];
    const lines = context.lines || text.split('\n');

    for (const line of lines) {
      // ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
      const isoMatch = line.match(/\b(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})\b/);
      if (isoMatch) {
        const date = new Date(
          parseInt(isoMatch[1]),
          parseInt(isoMatch[2]) - 1,
          parseInt(isoMatch[3]),
        );
        if (isValidDate(date)) {
          dates.push(date);
        }
      }
    }

    return dates.length > 0 ? dates : null;
  }
}
