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

    // Directories to skip
    skipDirectories = ['node_modules', '.git', '__pycache__', '.DS_Store'],

    // Whether to process subdirectories (default: false for safety)
    recursive = false,

    // Dry run by default (safety)
    dryRun = false,

    // LLM settings for enhanced extraction
    useLlm = false,
    llmProvider = 'anthropic', // 'anthropic', 'openai', 'ollama'
    anthropicApiKey = null,
    openaiApiKey = null,
    ollamaHost = 'http://localhost:11434',
    llmModel = null, // null means use provider default

    // Minimum confidence score (0-1) required for auto-rename with --yes flag
    minConfidence = 0.7,
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
    this.skipDirectories = skipDirectories;
    this.recursive = recursive;
    this.dryRun = dryRun;
    this.useLlm = useLlm;
    this.llmProvider = llmProvider;
    this.anthropicApiKey = anthropicApiKey;
    this.openaiApiKey = openaiApiKey;
    this.ollamaHost = ollamaHost;
    this.llmModel = llmModel;
    this.minConfidence = minConfidence;
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
    const validLlmProviders = ['anthropic', 'openai', 'ollama'];
    if (!validLlmProviders.includes(this.llmProvider)) {
      errors.push(`Invalid LLM provider: ${this.llmProvider}. Valid providers: ${validLlmProviders.join(', ')}`);
    }

    if (this.useLlm) {
      if (this.llmProvider === 'anthropic' && !this.anthropicApiKey) {
        errors.push('Anthropic API key is required when using Anthropic provider');
      }
      if (this.llmProvider === 'openai' && !this.openaiApiKey) {
        errors.push('OpenAI API key is required when using OpenAI provider');
      }
      if (this.llmProvider === 'ollama' && !this.ollamaHost) {
        errors.push('Ollama host is required when using Ollama provider');
      }
    }

    // Validate model if specified (provider-specific validation)
    if (this.llmModel) {
      const validModels = {
        anthropic: [
          'claude-3-haiku-20240307',
          'claude-3-5-haiku-20241022',
          'claude-3-5-sonnet-20241022',
          'claude-sonnet-4-20250514',
        ],
        openai: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo',
        ],
        ollama: [], // Ollama accepts any model name
      };

      const providerModels = validModels[this.llmProvider] || [];
      if (providerModels.length > 0 && !providerModels.includes(this.llmModel)) {
        errors.push(`Invalid LLM model for ${this.llmProvider}: ${this.llmModel}. Valid models: ${providerModels.join(', ')}`);
      }
    }

    // Validate minConfidence
    if (typeof this.minConfidence !== 'number' || this.minConfidence < 0 || this.minConfidence > 1) {
      errors.push(`Invalid minimum confidence: ${this.minConfidence}. Must be a number between 0 and 1.`);
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
      skipDirectories: this.skipDirectories,
      recursive: this.recursive,
      dryRun: this.dryRun,
      useLlm: this.useLlm,
      llmProvider: this.llmProvider,
      anthropicApiKey: this.anthropicApiKey,
      openaiApiKey: this.openaiApiKey,
      ollamaHost: this.ollamaHost,
      llmModel: this.llmModel,
      minConfidence: this.minConfidence,
    };
  }

  /**
   * Get default configuration
   */
  static getDefaults() {
    return new Configuration();
  }
}
