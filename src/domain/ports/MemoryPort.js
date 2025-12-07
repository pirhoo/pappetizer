/**
 * Port interface for memory/learning operations
 */
export class MemoryPort {
  /**
   * Record a vendor alias (user correction)
   * @param {string} _extracted - Original extracted vendor name
   * @param {string} _corrected - User-corrected vendor name
   * @returns {Promise<void>}
   */
  async recordVendorAlias(_extracted, _corrected) {
    throw new Error('Method not implemented');
  }

  /**
   * Apply vendor alias if one exists
   * @param {string} _vendor - Vendor name to check
   * @returns {string} - Corrected vendor name or original if no alias
   */
  applyVendorAlias(_vendor) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all vendor aliases for LLM context
   * @returns {object} - Map of extracted names to corrected names
   */
  getVendorAliases() {
    throw new Error('Method not implemented');
  }
}
