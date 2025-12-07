import {
  CURRENCY_MAP,
  CONFIDENCE_WEIGHTS,
  INVALID_FILENAME_CHARS,
  DEFAULTS,
} from '../constants.js';

/**
 * Receipt entity representing extracted receipt data
 */
export class Receipt {
  constructor({ filePath, vendor, date, amount, currency, originalName, confidence = null }) {
    this.filePath = filePath;
    this.vendor = vendor;
    this.date = date;
    this.amount = amount;
    this.currency = currency;
    this.originalName = originalName;
    this.confidence = confidence;
  }

  /**
   * Calculate confidence score based on extracted fields
   * @param {object} options - Options for confidence calculation
   * @param {boolean} options.usedLlm - Whether LLM was used for extraction
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence({ usedLlm = false } = {}) {
    let score = 0;

    // Vendor: high priority
    if (this.vendor && this.vendor.trim() !== '' && this.vendor !== 'UNKNOWN') {
      score += CONFIDENCE_WEIGHTS.VENDOR;
    }

    // Date: high priority
    if (this.date && !isNaN(new Date(this.date).getTime())) {
      score += CONFIDENCE_WEIGHTS.DATE;
    }

    // Amount: medium priority
    if (this.amount !== null && this.amount !== undefined && this.amount > 0) {
      score += CONFIDENCE_WEIGHTS.AMOUNT;
    }

    // Currency: low priority
    if (this.currency && this.currency.trim() !== '') {
      score += CONFIDENCE_WEIGHTS.CURRENCY;
    }

    // LLM bonus (when LLM was used, data is typically more reliable)
    if (usedLlm) {
      score += CONFIDENCE_WEIGHTS.LLM_BONUS;
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Generate new filename based on receipt data and configuration
   * @param {object} config - Configuration options
   * @param {string} config.dateFormat - Date format (YYYYMMDD, YYYY-MM-DD, etc.)
   * @param {string} config.nameSeparator - Separator between parts
   * @param {string} config.nameTemplate - Template string
   * @param {string} config.defaultCurrency - Default currency if not detected
   * @returns {string} Generated filename
   */
  generateFilename(config = {}) {
    const {
      dateFormat = DEFAULTS.DATE_FORMAT,
      nameSeparator = DEFAULTS.NAME_SEPARATOR,
      nameTemplate = DEFAULTS.NAME_TEMPLATE,
      defaultCurrency = DEFAULTS.CURRENCY,
    } = config;

    const ext = this.getExtension();
    const dateStr = this.formatDate(dateFormat);
    const vendorStr = this.sanitizeVendor();
    const amountStr = this.formatAmount();
    const currencyStr = this.normalizeCurrency(defaultCurrency);

    // Replace template placeholders
    return nameTemplate
      .replace(/\{date\}/g, dateStr)
      .replace(/\{vendor\}/g, vendorStr)
      .replace(/\{amount\}/g, amountStr)
      .replace(/\{currency\}/g, currencyStr)
      .replace(/\{sep\}/g, nameSeparator)
      .replace(/\{ext\}/g, ext);
  }

  /**
   * Format date according to specified format
   * @param {string} format - Date format string
   */
  formatDate(format = 'YYYYMMDD') {
    if (!this.date) return 'UNKNOWN';
    const d = this.date instanceof Date ? this.date : new Date(this.date);
    if (isNaN(d.getTime())) return 'UNKNOWN';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (format) {
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    case 'YYYY.MM.DD':
      return `${year}.${month}.${day}`;
    case 'DD.MM.YYYY':
      return `${day}.${month}.${year}`;
    default:
      return `${year}${month}${day}`;
    }
  }

  /**
   * Sanitize vendor name for use in filename
   * Removes invalid filename characters: < > : " / \ | ? *
   * Normalizes whitespace and converts to uppercase
   * @returns {string} Sanitized vendor name
   */
  sanitizeVendor() {
    if (!this.vendor) return 'UNKNOWN';
    return this.vendor
      .replace(INVALID_FILENAME_CHARS, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  /**
   * Format amount with 2 decimal places
   * @returns {string} Formatted amount (e.g., "50.00")
   */
  formatAmount() {
    if (this.amount === null || this.amount === undefined) return '0.00';
    return Number(this.amount).toFixed(2);
  }

  /**
   * Normalize currency code to standard 3-letter format
   * Handles common currency names and symbols
   * @param {string} defaultCurrency - Fallback currency if not detected
   * @returns {string} Normalized 3-letter currency code
   */
  normalizeCurrency(defaultCurrency = DEFAULTS.CURRENCY) {
    if (!this.currency) return defaultCurrency;
    const normalized = this.currency.toLowerCase().trim();
    return CURRENCY_MAP[normalized] || this.currency.toUpperCase().substring(0, 3);
  }

  /**
   * Get file extension from original filename
   * @returns {string} Lowercase extension with dot (e.g., ".pdf")
   */
  getExtension() {
    const match = this.originalName?.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '';
  }

  /**
   * Convert receipt to JSON object for serialization
   * @param {object} config - Configuration for filename generation
   * @returns {object} JSON representation of receipt
   */
  toJSON(config = {}) {
    return {
      filePath: this.filePath,
      vendor: this.vendor,
      date: this.date,
      amount: this.amount,
      currency: this.currency,
      originalName: this.originalName,
      generatedName: this.generateFilename(config),
      confidence: this.confidence,
    };
  }
}
