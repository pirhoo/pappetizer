/**
 * Configuration entity for Pappetizer settings
 */
export class Configuration {
  constructor({
    // File naming format
    dateFormat = 'YYYYMMDD',
    nameSeparator = ' - ',
    nameTemplate = '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',

    // Default currency when not detected
    defaultCurrency = 'USD',

    // Locale preference for date parsing (affects ambiguous dates like 01/02/2024)
    dateLocale = 'eu', // 'eu' for DD/MM/YYYY, 'us' for MM/DD/YYYY

    // Auto-accept behavior
    autoAcceptAll = false,

    // File types to process
    supportedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.gif'],

    // OCR language
    ocrLanguage = 'eng',

    // Skip files smaller than (bytes) - helps skip thumbnails
    minFileSize = 1024,

    // Custom vendor aliases (user-defined mappings)
    vendorAliases = {},

    // Directories to skip
    skipDirectories = ['node_modules', '.git', '__pycache__', '.DS_Store'],

    // Whether to process subdirectories
    recursive = true,

    // Dry run by default (safety)
    dryRun = false,

    // LLM settings for enhanced extraction
    useLlm = false,
    anthropicApiKey = null,
    llmModel = 'claude-3-haiku-20240307',
  } = {}) {
    this.dateFormat = dateFormat;
    this.nameSeparator = nameSeparator;
    this.nameTemplate = nameTemplate;
    this.defaultCurrency = defaultCurrency;
    this.dateLocale = dateLocale;
    this.autoAcceptAll = autoAcceptAll;
    this.supportedExtensions = supportedExtensions;
    this.ocrLanguage = ocrLanguage;
    this.minFileSize = minFileSize;
    this.vendorAliases = vendorAliases;
    this.skipDirectories = skipDirectories;
    this.recursive = recursive;
    this.dryRun = dryRun;
    this.useLlm = useLlm;
    this.anthropicApiKey = anthropicApiKey;
    this.llmModel = llmModel;
  }

  /**
   * Validate configuration values
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];

    // Validate date format
    const validDateFormats = ['YYYYMMDD', 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY.MM.DD', 'DD.MM.YYYY'];
    if (!validDateFormats.includes(this.dateFormat)) {
      errors.push(`Invalid date format: ${this.dateFormat}. Valid formats: ${validDateFormats.join(', ')}`);
    }

    // Validate date locale
    const validLocales = ['eu', 'us'];
    if (!validLocales.includes(this.dateLocale)) {
      errors.push(`Invalid date locale: ${this.dateLocale}. Valid locales: ${validLocales.join(', ')}`);
    }

    // Validate currency code (3 uppercase letters)
    if (!/^[A-Z]{3}$/.test(this.defaultCurrency)) {
      errors.push(`Invalid default currency: ${this.defaultCurrency}. Must be 3 uppercase letters (e.g., USD, EUR, CHF)`);
    }

    // Validate OCR language
    const validOcrLanguages = ['eng', 'deu', 'fra', 'spa', 'ita', 'por', 'nld', 'jpn', 'chi_sim', 'chi_tra'];
    if (!validOcrLanguages.includes(this.ocrLanguage)) {
      errors.push(`Invalid OCR language: ${this.ocrLanguage}. Common languages: ${validOcrLanguages.join(', ')}`);
    }

    // Validate min file size
    if (typeof this.minFileSize !== 'number' || this.minFileSize < 0) {
      errors.push(`Invalid minimum file size: ${this.minFileSize}. Must be a non-negative number.`);
    }

    // Validate name template has required placeholders
    const requiredPlaceholders = ['{date}', '{vendor}', '{amount}'];
    for (const placeholder of requiredPlaceholders) {
      if (!this.nameTemplate.includes(placeholder)) {
        errors.push(`Name template must include ${placeholder}`);
      }
    }

    // Validate LLM settings
    if (this.useLlm && !this.anthropicApiKey) {
      errors.push('Anthropic API key is required when LLM extraction is enabled');
    }

    const validLlmModels = [
      'claude-3-haiku-20240307',
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022',
      'claude-sonnet-4-20250514',
    ];
    if (this.llmModel && !validLlmModels.includes(this.llmModel)) {
      errors.push(`Invalid LLM model: ${this.llmModel}. Valid models: ${validLlmModels.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create configuration from plain object
   */
  static fromJSON(json) {
    return new Configuration(json);
  }

  /**
   * Convert to plain object for serialization
   * Note: API key is stored but should be handled securely
   */
  toJSON() {
    return {
      dateFormat: this.dateFormat,
      nameSeparator: this.nameSeparator,
      nameTemplate: this.nameTemplate,
      defaultCurrency: this.defaultCurrency,
      dateLocale: this.dateLocale,
      autoAcceptAll: this.autoAcceptAll,
      supportedExtensions: this.supportedExtensions,
      ocrLanguage: this.ocrLanguage,
      minFileSize: this.minFileSize,
      vendorAliases: this.vendorAliases,
      skipDirectories: this.skipDirectories,
      recursive: this.recursive,
      dryRun: this.dryRun,
      useLlm: this.useLlm,
      anthropicApiKey: this.anthropicApiKey,
      llmModel: this.llmModel,
    };
  }

  /**
   * Get default configuration
   */
  static getDefaults() {
    return new Configuration();
  }
}
