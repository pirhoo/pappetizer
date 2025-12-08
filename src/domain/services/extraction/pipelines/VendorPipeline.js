import { ExtractionPipeline } from './ExtractionPipeline.js';
import { getDefaultVendorExtractors } from '../vendor/index.js';
import { cleanVendorName } from '../utils/cleaning.js';
import { KnownVendorExtractor } from '../vendor/KnownVendorExtractor.js';

/**
 * Pipeline for vendor extraction
 * Strategy: first-match (returns first successful extraction)
 */
export class VendorPipeline extends ExtractionPipeline {
  constructor(options = {}) {
    super({
      extractors: options.extractors || getDefaultVendorExtractors(),
      strategy: 'first-match',
    });
  }

  run(text, additionalContext = {}) {
    if (!text) return null;

    const context = { ...this.buildContext(text), ...additionalContext };

    // Known vendor matches are already clean - check first
    for (const extractor of this.extractors) {
      if (extractor instanceof KnownVendorExtractor) {
        const result = extractor.extract(text, context);
        if (result) return result;
        break;
      }
    }

    // For other extractors, clean the result
    for (const extractor of this.extractors) {
      if (extractor instanceof KnownVendorExtractor) continue;
      if (!extractor.canHandle(text)) continue;

      const result = extractor.extract(text, context);
      if (result !== null && result !== undefined) {
        return cleanVendorName(result);
      }
    }

    return null;
  }
}
