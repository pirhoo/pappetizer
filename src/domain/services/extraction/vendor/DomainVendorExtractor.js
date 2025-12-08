import { BaseExtractor } from '../BaseExtractor.js';
import { InventoryLoader } from '../../InventoryLoader.js';

/**
 * Extracts vendor from website URLs or email domains
 * Priority: 5
 */
export class DomainVendorExtractor extends BaseExtractor {
  constructor() {
    super({ name: 'DomainVendorExtractor', priority: 50 });
    this.knownVendors = InventoryLoader.loadVendors();
    this.patterns = [
      /(?:www\.)?([a-z0-9\-]+)\.(?:com|org|net|co|io|shop|store|biz)/i,
      /(?:@)([a-z0-9\-]+)\.(?:com|org|net|co)/i,
    ];
  }

  extract(text, _context = {}) {
    for (const pattern of this.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const domain = match[1];
        // Check if it's a known vendor
        const known = this.matchKnownVendor(domain.toLowerCase());
        if (known) return known;

        // Otherwise return capitalized domain
        if (domain.length > 2 && domain.length < 30) {
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }
    }
    return null;
  }

  matchKnownVendor(normalizedText) {
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
