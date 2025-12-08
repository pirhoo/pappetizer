import { ExtractionPipeline } from './ExtractionPipeline.js';
import { getDefaultCurrencyExtractors } from '../currency/index.js';

/**
 * Pipeline for currency extraction
 * Strategy: first-match with fallback chain
 */
export class CurrencyPipeline extends ExtractionPipeline {
  constructor(options = {}) {
    super({
      extractors: options.extractors || getDefaultCurrencyExtractors(),
      strategy: 'first-match',
    });
  }
}
