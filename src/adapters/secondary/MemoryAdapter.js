import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { MemoryPort } from '../../domain/ports/MemoryPort.js';

const APP_NAME = 'pappetizer';
const MEMORY_FILENAME = 'memory.json';

/**
 * Get the XDG state directory
 * @returns {string}
 */
function getXdgStateHome() {
  return process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
}

/**
 * Memory adapter for learning from user corrections
 * Stores vendor aliases in XDG_STATE_HOME/pappetizer/memory.json
 */
export class MemoryAdapter extends MemoryPort {
  /**
   * @param {string} stateDir - Optional custom state directory for testing
   */
  constructor(stateDir = null) {
    super();
    this.stateDir = stateDir || path.join(getXdgStateHome(), APP_NAME);
    this.vendorAliases = {};
    this.loaded = false;
  }

  /**
   * Get the full path to the memory file
   */
  getMemoryPath() {
    return path.join(this.stateDir, MEMORY_FILENAME);
  }

  /**
   * Ensure the state directory exists
   */
  async ensureStateDir() {
    await fs.mkdir(this.stateDir, { recursive: true });
  }

  /**
   * Load memory from file
   */
  async load() {
    if (this.loaded) return;

    try {
      const content = await fs.readFile(this.getMemoryPath(), 'utf-8');
      const data = JSON.parse(content);
      this.vendorAliases = data.vendorAliases || {};
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Error loading memory: ${error.message}`);
      }
      // File doesn't exist or is invalid - start with empty memory
      this.vendorAliases = {};
    }
    this.loaded = true;
  }

  /**
   * Save memory to file
   */
  async save() {
    await this.ensureStateDir();

    const data = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      vendorAliases: this.vendorAliases,
    };

    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(this.getMemoryPath(), content, 'utf-8');
  }

  /**
   * Record a vendor alias (user correction)
   * @param {string} extracted - Original extracted vendor name
   * @param {string} corrected - User-corrected vendor name
   */
  async recordVendorAlias(extracted, corrected) {
    if (!extracted || !corrected) return;
    if (extracted === corrected) return;

    await this.load();

    // Normalize key to lowercase for case-insensitive matching
    const key = extracted.toLowerCase().trim();
    const value = corrected.trim();

    // Update in-memory
    this.vendorAliases[key] = value;

    // Persist to file
    await this.save();
  }

  /**
   * Apply vendor alias if one exists (case-insensitive)
   * @param {string} vendor - Vendor name to check
   * @returns {string} - Corrected vendor name or original if no alias
   */
  applyVendorAlias(vendor) {
    if (!vendor) return vendor;

    const key = vendor.toLowerCase().trim();
    return this.vendorAliases[key] || vendor;
  }

  /**
   * Get all vendor aliases for LLM context
   * @returns {object} - Map of extracted names to corrected names
   */
  getVendorAliases() {
    return { ...this.vendorAliases };
  }

  /**
   * Check if there are any vendor aliases stored
   * @returns {boolean}
   */
  hasAliases() {
    return Object.keys(this.vendorAliases).length > 0;
  }

  /**
   * Initialize by loading memory from file
   */
  async initialize() {
    await this.load();
  }
}
