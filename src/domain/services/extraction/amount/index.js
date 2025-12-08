import { LabeledAmountExtractor } from './LabeledAmountExtractor.js';
import { LineEndAmountExtractor } from './LineEndAmountExtractor.js';
import { PatternAmountExtractor } from './PatternAmountExtractor.js';

export {
  LabeledAmountExtractor,
  LineEndAmountExtractor,
  PatternAmountExtractor,
};

/**
 * Default amount extractors in priority order
 */
export function getDefaultAmountExtractors() {
  return [
    new LabeledAmountExtractor(),
    new LineEndAmountExtractor(),
    new PatternAmountExtractor(),
  ];
}
