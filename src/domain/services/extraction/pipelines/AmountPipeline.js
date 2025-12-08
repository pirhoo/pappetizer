import { ExtractionPipeline } from './ExtractionPipeline.js';
import { getDefaultAmountExtractors, LabeledAmountExtractor } from '../amount/index.js';

/**
 * Pipeline for amount extraction
 * Strategy: labeled first, then aggregate and select max reasonable
 */
export class AmountPipeline extends ExtractionPipeline {
  constructor(options = {}) {
    super({
      extractors: options.extractors || getDefaultAmountExtractors(),
      strategy: 'aggregate',
    });
  }

  run(text, additionalContext = {}) {
    if (!text) return null;

    const context = { ...this.buildContext(text), ...additionalContext };

    // First check labeled amounts (most reliable)
    const labeledExtractor = this.extractors.find((e) => e instanceof LabeledAmountExtractor);
    if (labeledExtractor) {
      const labeled = labeledExtractor.extract(text, context);
      if (labeled !== null) return labeled;
    }

    // Aggregate amounts from other extractors
    const allAmounts = [];
    for (const extractor of this.extractors) {
      if (extractor instanceof LabeledAmountExtractor) continue;
      if (!extractor.canHandle(text)) continue;

      const result = extractor.extract(text, context);
      if (result !== null) {
        if (Array.isArray(result)) {
          allAmounts.push(...result);
        } else {
          allAmounts.push(result);
        }
      }
    }

    if (allAmounts.length === 0) return null;

    // Filter out very small amounts (likely per-item prices) if we have larger ones
    const maxAmount = Math.max(...allAmounts);
    const minReasonableTotal = maxAmount * 0.3; // Total should be at least 30% of max

    const reasonableAmounts = allAmounts.filter((a) => a >= minReasonableTotal);

    // The total is often the largest amount
    return reasonableAmounts.length > 0 ? Math.max(...reasonableAmounts) : maxAmount;
  }
}
