import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Service to load inventory data from JSON files
 */
export class InventoryLoader {
  static #vendorsCache = null;

  /**
   * Load vendors from the inventory JSON file
   * @returns {Array<{patterns: string[], name: string, category: string}>}
   */
  static loadVendors() {
    if (this.#vendorsCache) {
      return this.#vendorsCache;
    }

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const vendorsPath = join(__dirname, '../inventories/vendors.json');

    try {
      const data = JSON.parse(readFileSync(vendorsPath, 'utf-8'));
      this.#vendorsCache = data.vendors || [];
      return this.#vendorsCache;
    } catch (error) {
      console.error(`Error loading vendors inventory: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear the vendors cache (useful for testing)
   */
  static clearCache() {
    this.#vendorsCache = null;
  }

  /**
   * Get vendors filtered by category
   * @param {string} category - Category to filter by
   * @returns {Array<{patterns: string[], name: string, category: string}>}
   */
  static getVendorsByCategory(category) {
    const vendors = this.loadVendors();
    return vendors.filter(v => v.category === category);
  }
}
