/**
 * Application-wide constants
 */

/**
 * Valid date formats for filename generation
 */
export const DATE_FORMATS = [
  'YYYYMMDD',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
  'YYYY.MM.DD',
  'DD.MM.YYYY',
];

/**
 * Valid date locales for parsing ambiguous dates
 */
export const DATE_LOCALES = ['eu', 'us'];

/**
 * Valid OCR languages supported by Tesseract
 */
export const OCR_LANGUAGES = [
  'eng', // English
  'deu', // German
  'fra', // French
  'spa', // Spanish
  'ita', // Italian
  'por', // Portuguese
  'nld', // Dutch
  'jpn', // Japanese
  'chi_sim', // Chinese Simplified
  'chi_tra', // Chinese Traditional
];

/**
 * Supported file extensions for processing
 */
export const SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.tiff',
  '.tif',
  '.bmp',
  '.gif',
];

/**
 * LLM provider identifiers
 */
export const LLM_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  OLLAMA: 'ollama',
};

/**
 * Default models per LLM provider
 */
export const DEFAULT_LLM_MODELS = {
  [LLM_PROVIDERS.ANTHROPIC]: 'claude-3-haiku-20240307',
  [LLM_PROVIDERS.OPENAI]: 'gpt-4o-mini',
  [LLM_PROVIDERS.OLLAMA]: 'llama3.2',
};

/**
 * Valid models per provider (for validation)
 * Note: Ollama accepts any model name
 */
export const VALID_LLM_MODELS = {
  [LLM_PROVIDERS.ANTHROPIC]: [
    'claude-3-haiku-20240307',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
    'claude-sonnet-4-20250514',
  ],
  [LLM_PROVIDERS.OPENAI]: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  [LLM_PROVIDERS.OLLAMA]: [], // Accepts any model
};

/**
 * Currency normalization mapping
 */
export const CURRENCY_MAP = {
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

/**
 * Default configuration values
 */
export const DEFAULTS = {
  DATE_FORMAT: 'YYYYMMDD',
  NAME_SEPARATOR: ' - ',
  NAME_TEMPLATE: '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',
  CURRENCY: 'USD',
  DATE_LOCALE: 'eu',
  OCR_LANGUAGE: 'eng',
  MIN_FILE_SIZE: 1024,
  MIN_CONFIDENCE: 0.7,
  OLLAMA_HOST: 'http://localhost:11434',
};

/**
 * Confidence score weights
 */
export const CONFIDENCE_WEIGHTS = {
  VENDOR: 0.3,
  DATE: 0.3,
  AMOUNT: 0.2,
  CURRENCY: 0.1,
  LLM_BONUS: 0.1,
};

/**
 * Manifest file constants
 */
export const MANIFEST = {
  FILENAME: '.pappetizer.json',
  VERSION: '1.0',
};

/**
 * Invalid filename characters (for sanitization)
 */
export const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;
