import fs from 'fs/promises';
import path from 'path';
import { ManifestPort } from '../../domain/ports/ManifestPort.js';

const MANIFEST_FILENAME = '.pappetizer.json';

/**
 * Manifest adapter for tracking renamed files
 */
export class ManifestAdapter extends ManifestPort {
  constructor() {
    super();
    this.cache = new Map();
  }

  /**
   * Get manifest file path for a directory
   * @param {string} dirPath - Directory path
   * @returns {string}
   */
  getManifestPath(dirPath) {
    return path.join(dirPath, MANIFEST_FILENAME);
  }

  /**
   * Load manifest for a directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<Map<string, object>>}
   */
  async load(dirPath) {
    if (this.cache.has(dirPath)) {
      return this.cache.get(dirPath);
    }

    const manifestPath = this.getManifestPath(dirPath);
    let entries = new Map();

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);

      if (data.renames && Array.isArray(data.renames)) {
        for (const entry of data.renames) {
          entries.set(entry.originalName, entry);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Error reading manifest: ${error.message}`);
      }
      // File doesn't exist or is invalid - start fresh
    }

    this.cache.set(dirPath, entries);
    return entries;
  }

  /**
   * Save manifest for a directory
   * @param {string} dirPath - Directory path
   * @param {Map<string, object>} entries - Manifest entries
   */
  async save(dirPath, entries) {
    const manifestPath = this.getManifestPath(dirPath);
    const data = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      renames: Array.from(entries.values()),
    };

    await fs.writeFile(manifestPath, JSON.stringify(data, null, 2), 'utf-8');
    this.cache.set(dirPath, entries);
  }

  /**
   * Check if a file has been renamed before
   * @param {string} dirPath - Directory path
   * @param {string} originalName - Original filename
   * @returns {Promise<boolean>}
   */
  async hasBeenRenamed(dirPath, originalName) {
    const entries = await this.load(dirPath);
    return entries.has(originalName);
  }

  /**
   * Get the rename entry for a file
   * @param {string} dirPath - Directory path
   * @param {string} originalName - Original filename
   * @returns {Promise<object|null>} - The rename entry or null if not found
   */
  async getRenameEntry(dirPath, originalName) {
    const entries = await this.load(dirPath);
    return entries.get(originalName) || null;
  }

  /**
   * Check if a filename is the result of a previous rename operation
   * @param {string} dirPath - Directory path
   * @param {string} filename - Filename to check
   * @returns {Promise<boolean>}
   */
  async isRenameResult(dirPath, filename) {
    const entries = await this.load(dirPath);
    for (const entry of entries.values()) {
      if (entry.newName === filename) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add a rename entry to the manifest
   * @param {string} dirPath - Directory path
   * @param {string} originalName - Original filename
   * @param {string} newName - New filename
   * @param {object} metadata - Additional metadata
   */
  async addEntry(dirPath, originalName, newName, metadata = {}) {
    const entries = await this.load(dirPath);

    entries.set(originalName, {
      originalName,
      newName,
      renamedAt: new Date().toISOString(),
      ...metadata,
    });

    await this.save(dirPath, entries);
  }

  /**
   * Initialize manifest for a directory (creates file if it doesn't exist)
   * @param {string} dirPath - Directory path
   */
  async initialize(dirPath) {
    const manifestPath = this.getManifestPath(dirPath);

    try {
      await fs.access(manifestPath);
      // File exists, just load it into cache
      await this.load(dirPath);
    } catch {
      // File doesn't exist, create it
      const entries = new Map();
      await this.save(dirPath, entries);
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Remove a rename entry from the manifest
   * @param {string} dirPath - Directory path
   * @param {string} originalName - Original filename (key)
   * @returns {Promise<boolean>} - True if entry was removed
   */
  async removeEntry(dirPath, originalName) {
    const entries = await this.load(dirPath);

    if (!entries.has(originalName)) {
      return false;
    }

    entries.delete(originalName);
    await this.save(dirPath, entries);
    return true;
  }

  /**
   * Get all rename entries for a directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<Array<object>>} - Array of rename entries
   */
  async getAllEntries(dirPath) {
    const entries = await this.load(dirPath);
    return Array.from(entries.values());
  }
}
