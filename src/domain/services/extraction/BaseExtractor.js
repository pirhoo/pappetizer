/**
 * Base class for all extraction heuristics
 * @abstract
 */
export class BaseExtractor {
  /**
   * @param {object} options
   * @param {string} options.name - Human-readable extractor name
   * @param {number} options.priority - Lower = higher priority (default ordering)
   */
  constructor({ name, priority = 100 } = {}) {
    this.name = name || this.constructor.name;
    this.priority = priority;
  }

  /**
   * Execute the extraction logic
   * @param {string} text - The text to extract from
   * @param {object} context - Additional context (normalizedText, lines, etc.)
   * @returns {*} - Extracted value(s) or null
   * @abstract
   */
  extract(_text, _context = {}) {
    throw new Error(`${this.name}: extract() must be implemented`);
  }

  /**
   * Optional: Check if this extractor can potentially match
   * Allows early exit optimization
   * @param {string} text
   * @returns {boolean}
   */
  canHandle(_text) {
    return true;
  }
}
