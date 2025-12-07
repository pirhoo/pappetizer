/**
 * Port interface for configuration operations
 */
export class ConfigurationPort {
  /**
   * Load configuration from storage
   * @returns {Promise<Configuration|null>}
   */
  async load() {
    throw new Error('Method not implemented');
  }

  /**
   * Save configuration to storage
   * @param {Configuration} _config - Configuration to save
   * @returns {Promise<void>}
   */
  async save(_config) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if configuration exists
   * @returns {Promise<boolean>}
   */
  async exists() {
    throw new Error('Method not implemented');
  }

  /**
   * Get configuration file path
   * @returns {string}
   */
  getConfigPath() {
    throw new Error('Method not implemented');
  }
}
