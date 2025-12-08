import { KnownVendorExtractor } from './KnownVendorExtractor.js';
import { LabeledVendorExtractor } from './LabeledVendorExtractor.js';
import { BusinessNameExtractor } from './BusinessNameExtractor.js';
import { HeaderVendorExtractor } from './HeaderVendorExtractor.js';
import { DomainVendorExtractor } from './DomainVendorExtractor.js';
import { ThankYouVendorExtractor } from './ThankYouVendorExtractor.js';
import { StoreNumberVendorExtractor } from './StoreNumberVendorExtractor.js';

export {
  KnownVendorExtractor,
  LabeledVendorExtractor,
  BusinessNameExtractor,
  HeaderVendorExtractor,
  DomainVendorExtractor,
  ThankYouVendorExtractor,
  StoreNumberVendorExtractor,
};

/**
 * Default vendor extractors in priority order
 */
export function getDefaultVendorExtractors() {
  return [
    new KnownVendorExtractor(),
    new LabeledVendorExtractor(),
    new BusinessNameExtractor(),
    new HeaderVendorExtractor(),
    new DomainVendorExtractor(),
    new ThankYouVendorExtractor(),
    new StoreNumberVendorExtractor(),
  ];
}
