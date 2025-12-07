/**
 * Port interface for manifest file operations
 */
export class ManifestPort {
  /**
   * Load manifest for a directory
   * @param {string} _dirPath - Directory path
   * @returns {Promise<Map<string, object>>} - Map of original filename to rename info
   */
  async load(_dirPath) {
    throw new Error('Method not implemented');
  }

  /**
   * Save manifest for a directory
   * @param {string} _dirPath - Directory path
   * @param {Map<string, object>} _entries - Manifest entries
   * @returns {Promise<void>}
   */
  async save(_dirPath, _entries) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if a file has already been renamed
   * @param {string} _dirPath - Directory path
   * @param {string} _originalName - Original filename
   * @returns {Promise<boolean>}
   */
  async hasBeenRenamed(_dirPath, _originalName) {
    throw new Error('Method not implemented');
  }

  /**
   * Get the rename entry for a file
   * @param {string} _dirPath - Directory path
   * @param {string} _originalName - Original filename
   * @returns {Promise<object|null>} - The rename entry or null if not found
   */
  async getRenameEntry(_dirPath, _originalName) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if a filename is the result of a previous rename operation
   * @param {string} _dirPath - Directory path
   * @param {string} _filename - Filename to check
   * @returns {Promise<boolean>}
   */
  async isRenameResult(_dirPath, _filename) {
    throw new Error('Method not implemented');
  }

  /**
   * Add a rename entry to the manifest
   * @param {string} _dirPath - Directory path
   * @param {string} _originalName - Original filename
   * @param {string} _newName - New filename
   * @param {object} _metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async addEntry(_dirPath, _originalName, _newName, _metadata) {
    throw new Error('Method not implemented');
  }

  /**
   * Initialize manifest for a directory (creates file if it doesn't exist)
   * @param {string} _dirPath - Directory path
   * @returns {Promise<void>}
   */
  async initialize(_dirPath) {
    throw new Error('Method not implemented');
  }
}
