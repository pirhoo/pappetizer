import { LabeledCurrencyExtractor } from './LabeledCurrencyExtractor.js';
import { CurrencyCodeExtractor } from './CurrencyCodeExtractor.js';
import { CurrencySymbolExtractor } from './CurrencySymbolExtractor.js';
import { CurrencyWordExtractor } from './CurrencyWordExtractor.js';
import { RegionCurrencyExtractor } from './RegionCurrencyExtractor.js';

export {
  LabeledCurrencyExtractor,
  CurrencyCodeExtractor,
  CurrencySymbolExtractor,
  CurrencyWordExtractor,
  RegionCurrencyExtractor,
};

/**
 * Default currency extractors in priority order
 */
export function getDefaultCurrencyExtractors() {
  return [
    new LabeledCurrencyExtractor(),
    new CurrencyCodeExtractor(),
    new CurrencySymbolExtractor(),
    new CurrencyWordExtractor(),
    new RegionCurrencyExtractor(),
  ];
}
