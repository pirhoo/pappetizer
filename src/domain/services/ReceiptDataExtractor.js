import { VendorPipeline } from './extraction/pipelines/VendorPipeline.js';
import { DatePipeline } from './extraction/pipelines/DatePipeline.js';
import { AmountPipeline } from './extraction/pipelines/AmountPipeline.js';
import { CurrencyPipeline } from './extraction/pipelines/CurrencyPipeline.js';
import {
  isValidVendorName,
  looksLikeBusinessName,
  isValidDate,
  parseAmount,
  expandYear,
  cleanVendorName,
} from './extraction/utils/index.js';

/**
 * Facade for receipt data extraction
 * Delegates to specialized extraction pipelines while maintaining backward compatibility
 */
export class ReceiptDataExtractor {
  constructor(options = {}) {
    // Initialize pipelines with defaults or custom extractors
    this.vendorPipeline = options.vendorPipeline || new VendorPipeline();
    this.datePipeline = options.datePipeline || new DatePipeline();
    this.amountPipeline = options.amountPipeline || new AmountPipeline();
    this.currencyPipeline = options.currencyPipeline || new CurrencyPipeline();
  }

  /**
   * Extract receipt data from OCR text
   * @param {string} text
   * @returns {{ vendor: string|null, date: Date|null, amount: number|null, currency: string|null }}
   */
  extract(text) {
    const currency = this.extractCurrency(text);
    return {
      vendor: this.extractVendor(text),
      date: this.extractDate(text),
      amount: this.extractAmount(text),
      currency: currency,
    };
  }

  /**
   * Extract vendor name
   * @param {string} text
   * @returns {string|null}
   */
  extractVendor(text) {
    if (!text) return null;
    return this.vendorPipeline.run(text);
  }

  /**
   * Extract date
   * @param {string} text
   * @returns {Date|null}
   */
  extractDate(text) {
    if (!text) return null;
    return this.datePipeline.run(text);
  }

  /**
   * Extract amount
   * @param {string} text
   * @returns {number|null}
   */
  extractAmount(text) {
    if (!text) return null;
    return this.amountPipeline.run(text);
  }

  /**
   * Extract currency
   * @param {string} text
   * @returns {string|null}
   */
  extractCurrency(text) {
    if (!text) return null;
    return this.currencyPipeline.run(text);
  }

  // ============================================================
  // BACKWARD COMPATIBILITY: Helper methods as pass-through
  // These are used by tests and potentially by external code
  // ============================================================

  /**
   * Check if a string is a valid vendor name
   * @param {string} name
   * @returns {boolean}
   */
  isValidVendorName(name) {
    return isValidVendorName(name);
  }

  /**
   * Check if a line looks like a business name
   * @param {string} line
   * @returns {boolean}
   */
  looksLikeBusinessName(line) {
    return looksLikeBusinessName(line);
  }

  /**
   * Clean a vendor name for use in filenames
   * @param {string} name
   * @returns {string|null}
   */
  cleanVendorName(name) {
    return cleanVendorName(name);
  }

  /**
   * Parse an amount string into a number
   * @param {string} amountStr
   * @returns {number|null}
   */
  parseAmount(amountStr) {
    return parseAmount(amountStr);
  }

  /**
   * Expand a 2-digit year to 4 digits
   * @param {number} shortYear
   * @returns {number}
   */
  expandYear(shortYear) {
    return expandYear(shortYear);
  }

  /**
   * Check if a date object is valid
   * @param {Date} date
   * @returns {boolean}
   */
  isValidDate(date) {
    return isValidDate(date);
  }

  // ============================================================
  // EXTENSIBILITY: Pipeline access for customization
  // ============================================================

  /**
   * Get the vendor pipeline for customization
   * @returns {VendorPipeline}
   */
  getVendorPipeline() {
    return this.vendorPipeline;
  }

  /**
   * Get the date pipeline for customization
   * @returns {DatePipeline}
   */
  getDatePipeline() {
    return this.datePipeline;
  }

  /**
   * Get the amount pipeline for customization
   * @returns {AmountPipeline}
   */
  getAmountPipeline() {
    return this.amountPipeline;
  }

  /**
   * Get the currency pipeline for customization
   * @returns {CurrencyPipeline}
   */
  getCurrencyPipeline() {
    return this.currencyPipeline;
  }

  /**
   * Add a custom vendor extractor
   * @param {BaseExtractor} extractor
   * @param {number} [priority]
   */
  addVendorExtractor(extractor, priority) {
    this.vendorPipeline.addExtractor(extractor, priority);
  }

  /**
   * Add a custom date extractor
   * @param {BaseExtractor} extractor
   * @param {number} [priority]
   */
  addDateExtractor(extractor, priority) {
    this.datePipeline.addExtractor(extractor, priority);
  }

  /**
   * Add a custom amount extractor
   * @param {BaseExtractor} extractor
   * @param {number} [priority]
   */
  addAmountExtractor(extractor, priority) {
    this.amountPipeline.addExtractor(extractor, priority);
  }

  /**
   * Add a custom currency extractor
   * @param {BaseExtractor} extractor
   * @param {number} [priority]
   */
  addCurrencyExtractor(extractor, priority) {
    this.currencyPipeline.addExtractor(extractor, priority);
  }
}
