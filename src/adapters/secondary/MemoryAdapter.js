import { MemoryPort } from '../../domain/ports/MemoryPort.js';

/**
 * Memory adapter for learning from user corrections
 * Stores vendor aliases in the global configuration
 */
export class MemoryAdapter extends MemoryPort {
  /**
   * @param {ConfigurationAdapter} configAdapter - Configuration adapter for persistence
   * @param {Configuration} configuration - Current configuration instance
   */
  constructor(configAdapter, configuration) {
    super();
    this.configAdapter = configAdapter;
    this.configuration = configuration;
  }

  /**
   * Record a vendor alias (user correction)
   * @param {string} extracted - Original extracted vendor name
   * @param {string} corrected - User-corrected vendor name
   */
  async recordVendorAlias(extracted, corrected) {
    if (!extracted || !corrected) return;
    if (extracted === corrected) return;

    // Normalize key to lowercase for case-insensitive matching
    const key = extracted.toLowerCase().trim();
    const value = corrected.trim();

    // Update in-memory configuration
    this.configuration.vendorAliases[key] = value;

    // Persist to file
    await this.configAdapter.save(this.configuration);
  }

  /**
   * Apply vendor alias if one exists (case-insensitive)
   * @param {string} vendor - Vendor name to check
   * @returns {string} - Corrected vendor name or original if no alias
   */
  applyVendorAlias(vendor) {
    if (!vendor) return vendor;

    const key = vendor.toLowerCase().trim();
    return this.configuration.vendorAliases[key] || vendor;
  }

  /**
   * Get all vendor aliases for LLM context
   * @returns {object} - Map of extracted names to corrected names
   */
  getVendorAliases() {
    return { ...this.configuration.vendorAliases };
  }

  /**
   * Check if there are any vendor aliases stored
   * @returns {boolean}
   */
  hasAliases() {
    return Object.keys(this.configuration.vendorAliases).length > 0;
  }
}
