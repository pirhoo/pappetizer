/**
 * Receipt entity representing extracted receipt data
 */
export class Receipt {
  constructor({ filePath, vendor, date, amount, currency, originalName }) {
    this.filePath = filePath;
    this.vendor = vendor;
    this.date = date;
    this.amount = amount;
    this.currency = currency;
    this.originalName = originalName;
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
      dateFormat = 'YYYYMMDD',
      nameSeparator = ' - ',
      nameTemplate = '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',
      defaultCurrency = 'USD',
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

  sanitizeVendor() {
    if (!this.vendor) return 'UNKNOWN';
    return this.vendor
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  formatAmount() {
    if (this.amount === null || this.amount === undefined) return '0.00';
    return Number(this.amount).toFixed(2);
  }

  normalizeCurrency(defaultCurrency = 'USD') {
    if (!this.currency) return defaultCurrency;
    const currencyMap = {
      '$': 'USD',
      'dollar': 'USD',
      'dollars': 'USD',
      'usd': 'USD',
      'eur': 'EUR',
      'euro': 'EUR',
      'euros': 'EUR',
      'chf': 'CHF',
      'franc': 'CHF',
      'francs': 'CHF',
      'gbp': 'GBP',
      'pound': 'GBP',
      'pounds': 'GBP',
      'sterling': 'GBP',
      'jpy': 'JPY',
      'yen': 'JPY',
      'cad': 'CAD',
      'aud': 'AUD',
    };
    const normalized = this.currency.toLowerCase().trim();
    return currencyMap[normalized] || this.currency.toUpperCase().substring(0, 3);
  }

  getExtension() {
    const match = this.originalName?.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '';
  }

  toJSON(config = {}) {
    return {
      filePath: this.filePath,
      vendor: this.vendor,
      date: this.date,
      amount: this.amount,
      currency: this.currency,
      originalName: this.originalName,
      generatedName: this.generateFilename(config),
    };
  }
}
