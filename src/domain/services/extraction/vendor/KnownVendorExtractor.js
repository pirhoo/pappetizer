import { BaseExtractor } from '../BaseExtractor.js';
import { InventoryLoader } from '../../InventoryLoader.js';

/**
 * Extracts vendor by matching against known vendors database
 * Priority: 1 (highest - most reliable)
 */
export class KnownVendorExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'KnownVendorExtractor', priority: 10 });
    this.knownVendors = InventoryLoader.loadVendors();
  }

  extract(text, context = {}) {
    const normalizedText = context.normalizedText || text.toLowerCase();

    for (const vendor of this.knownVendors) {
      for (const pattern of vendor.patterns) {
        if (normalizedText.includes(pattern.toLowerCase())) {
          return vendor.name;
        }
      }
    }
    return null;
  }
}
