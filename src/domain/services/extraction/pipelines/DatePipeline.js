import { ExtractionPipeline } from './ExtractionPipeline.js';
import { getDefaultDateExtractors, LabeledDateExtractor } from '../date/index.js';
import { isValidDate } from '../utils/validation.js';

/**
 * Pipeline for date extraction
 * Strategy: aggregate then select best (most recent valid date)
 */
export class DatePipeline extends ExtractionPipeline {
  constructor(options = {}) {
    const extractors = options.extractors || getDefaultDateExtractors();

    super({
      extractors,
      strategy: 'aggregate',
    });

    // Set up date finder for labeled extractor to use
    this.setupLabeledExtractor();
  }

  setupLabeledExtractor() {
    const labeledExtractor = this.extractors.find((e) => e instanceof LabeledDateExtractor);
    if (labeledExtractor) {
      labeledExtractor.setDateFinder((text) => this.findAllDatesFromExtractors(text));
    }
  }

  findAllDatesFromExtractors(text) {
    const dates = [];
    const context = this.buildContext(text);

    for (const extractor of this.extractors) {
      if (extractor instanceof LabeledDateExtractor) continue;
      const result = extractor.extract(text, context);
      if (result) {
        if (Array.isArray(result)) {
          dates.push(...result);
        } else {
          dates.push(result);
        }
      }
    }
    return dates;
  }

  run(text, additionalContext = {}) {
    if (!text) return null;

    const context = { ...this.buildContext(text), ...additionalContext };

    // First check labeled dates (most reliable)
    const labeledExtractor = this.extractors.find((e) => e instanceof LabeledDateExtractor);
    if (labeledExtractor) {
      const labeled = labeledExtractor.extract(text, context);
      if (labeled) return labeled;
    }

    // Aggregate all found dates from other extractors
    const allDates = [];
    for (const extractor of this.extractors) {
      if (extractor instanceof LabeledDateExtractor) continue;
      if (!extractor.canHandle(text)) continue;

      const result = extractor.extract(text, context);
      if (result) {
        if (Array.isArray(result)) {
          allDates.push(...result.filter((d) => isValidDate(d)));
        } else if (isValidDate(result)) {
          allDates.push(result);
        }
      }
    }

    if (allDates.length === 0) return null;

    // Deduplicate
    const uniqueDates = this.deduplicateDates(allDates);

    // Prefer recent dates (within last 2 years, not future)
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    const validDates = uniqueDates.filter(
      (d) => d.getTime() <= now.getTime() && d.getTime() >= twoYearsAgo.getTime(),
    );

    if (validDates.length > 0) {
      return validDates.sort((a, b) => b.getTime() - a.getTime())[0];
    }

    return uniqueDates[0];
  }

  deduplicateDates(dates) {
    const seen = new Set();
    return dates.filter((date) => {
      const key = date.toISOString().split('T')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
