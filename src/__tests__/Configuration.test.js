import { Configuration } from '../domain/entities/Configuration.js';

describe('Configuration', () => {
  describe('constructor', () => {
    it('should create configuration with default values', () => {
      const config = new Configuration();

      expect(config.dateFormat).toBe('YYYYMMDD');
      expect(config.nameSeparator).toBe(' - ');
      expect(config.nameTemplate).toBe('{date}{sep}{vendor}{sep}{amount} {currency}{ext}');
      expect(config.defaultCurrency).toBe('USD');
      expect(config.dateLocale).toBe('eu');
      expect(config.autoAcceptAll).toBe(false);
      expect(config.supportedExtensions).toEqual(['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.gif']);
      expect(config.ocrLanguage).toBe('eng');
      expect(config.minFileSize).toBe(1024);
      expect(config.vendorAliases).toEqual({});
      expect(config.skipDirectories).toEqual(['node_modules', '.git', '__pycache__', '.DS_Store']);
      expect(config.recursive).toBe(true);
      expect(config.dryRun).toBe(false);
      expect(config.useLlm).toBe(false);
      expect(config.anthropicApiKey).toBeNull();
      expect(config.llmModel).toBe('claude-3-haiku-20240307');
    });

    it('should create configuration with custom values', () => {
      const config = new Configuration({
        dateFormat: 'YYYY-MM-DD',
        nameSeparator: '_',
        nameTemplate: '{date}_{vendor}_{amount}{ext}',
        defaultCurrency: 'EUR',
        dateLocale: 'us',
        autoAcceptAll: true,
        supportedExtensions: ['.pdf', '.png'],
        ocrLanguage: 'deu',
        minFileSize: 2048,
        vendorAliases: { 'wm': 'Walmart' },
        skipDirectories: ['dist'],
        recursive: false,
        dryRun: true,
        useLlm: true,
        anthropicApiKey: 'sk-test-key',
        llmModel: 'claude-3-5-sonnet-20241022',
      });

      expect(config.dateFormat).toBe('YYYY-MM-DD');
      expect(config.nameSeparator).toBe('_');
      expect(config.nameTemplate).toBe('{date}_{vendor}_{amount}{ext}');
      expect(config.defaultCurrency).toBe('EUR');
      expect(config.dateLocale).toBe('us');
      expect(config.autoAcceptAll).toBe(true);
      expect(config.supportedExtensions).toEqual(['.pdf', '.png']);
      expect(config.ocrLanguage).toBe('deu');
      expect(config.minFileSize).toBe(2048);
      expect(config.vendorAliases).toEqual({ 'wm': 'Walmart' });
      expect(config.skipDirectories).toEqual(['dist']);
      expect(config.recursive).toBe(false);
      expect(config.dryRun).toBe(true);
      expect(config.useLlm).toBe(true);
      expect(config.anthropicApiKey).toBe('sk-test-key');
      expect(config.llmModel).toBe('claude-3-5-sonnet-20241022');
    });

    it('should allow partial custom values with defaults for rest', () => {
      const config = new Configuration({
        defaultCurrency: 'CHF',
        dryRun: true,
      });

      expect(config.defaultCurrency).toBe('CHF');
      expect(config.dryRun).toBe(true);
      // Other values should be defaults
      expect(config.dateFormat).toBe('YYYYMMDD');
      expect(config.nameSeparator).toBe(' - ');
    });

    it('should handle empty object input', () => {
      const config = new Configuration({});
      expect(config.dateFormat).toBe('YYYYMMDD');
      expect(config.defaultCurrency).toBe('USD');
    });

    it('should handle undefined input', () => {
      const config = new Configuration(undefined);
      expect(config.dateFormat).toBe('YYYYMMDD');
      expect(config.defaultCurrency).toBe('USD');
    });
  });

  describe('validate', () => {
    it('should validate default configuration as valid', () => {
      const config = new Configuration();
      const result = config.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    describe('dateFormat validation', () => {
      it('should accept all valid date formats', () => {
        const validFormats = ['YYYYMMDD', 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY.MM.DD', 'DD.MM.YYYY'];

        for (const format of validFormats) {
          const config = new Configuration({ dateFormat: format });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('date format'))).toBe(false);
        }
      });

      it('should reject invalid date formats', () => {
        const invalidFormats = ['DDMMYYYY', 'DD/MM/YYYY', 'invalid', '', 'YYYY_MM_DD'];

        for (const format of invalidFormats) {
          const config = new Configuration({ dateFormat: format });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('Invalid date format'))).toBe(true);
        }
      });
    });

    describe('dateLocale validation', () => {
      it('should accept valid locales', () => {
        const config1 = new Configuration({ dateLocale: 'eu' });
        expect(config1.validate().errors.some(e => e.includes('locale'))).toBe(false);

        const config2 = new Configuration({ dateLocale: 'us' });
        expect(config2.validate().errors.some(e => e.includes('locale'))).toBe(false);
      });

      it('should reject invalid locales', () => {
        const invalidLocales = ['uk', 'de', 'fr', 'european', 'american', ''];

        for (const locale of invalidLocales) {
          const config = new Configuration({ dateLocale: locale });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('Invalid date locale'))).toBe(true);
        }
      });
    });

    describe('defaultCurrency validation', () => {
      it('should accept valid currency codes', () => {
        const validCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'CNY', 'INR', 'BRL'];

        for (const currency of validCurrencies) {
          const config = new Configuration({ defaultCurrency: currency });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('currency'))).toBe(false);
        }
      });

      it('should reject invalid currency codes', () => {
        const invalidCurrencies = ['usd', 'US', 'USDX', '123', '', 'dollar', 'Euro'];

        for (const currency of invalidCurrencies) {
          const config = new Configuration({ defaultCurrency: currency });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('Invalid default currency'))).toBe(true);
        }
      });
    });

    describe('ocrLanguage validation', () => {
      it('should accept valid OCR languages', () => {
        const validLanguages = ['eng', 'deu', 'fra', 'spa', 'ita', 'por', 'nld', 'jpn', 'chi_sim', 'chi_tra'];

        for (const lang of validLanguages) {
          const config = new Configuration({ ocrLanguage: lang });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('OCR language'))).toBe(false);
        }
      });

      it('should reject invalid OCR languages', () => {
        const invalidLanguages = ['english', 'german', 'ENG', 'de', 'fr', 'xyz'];

        for (const lang of invalidLanguages) {
          const config = new Configuration({ ocrLanguage: lang });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('Invalid OCR language'))).toBe(true);
        }
      });
    });

    describe('minFileSize validation', () => {
      it('should accept valid file sizes', () => {
        const validSizes = [0, 1, 1024, 1024 * 1024, 100000000];

        for (const size of validSizes) {
          const config = new Configuration({ minFileSize: size });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('file size'))).toBe(false);
        }
      });

      it('should reject negative file sizes', () => {
        const config = new Configuration({ minFileSize: -1 });
        const result = config.validate();
        expect(result.errors.some(e => e.includes('Invalid minimum file size'))).toBe(true);
      });

      it('should reject non-numeric file sizes', () => {
        const config = new Configuration({ minFileSize: '1024' });
        const result = config.validate();
        expect(result.errors.some(e => e.includes('Invalid minimum file size'))).toBe(true);
      });

      it('should reject null file size', () => {
        const config = new Configuration({ minFileSize: null });
        const result = config.validate();
        expect(result.errors.some(e => e.includes('Invalid minimum file size'))).toBe(true);
      });
    });

    describe('nameTemplate validation', () => {
      it('should accept templates with all required placeholders', () => {
        const validTemplates = [
          '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',
          '{vendor} - {date} - {amount}{ext}',
          '{date}_{vendor}_{amount}',
          'Receipt_{date}_{vendor}_{amount}.pdf',
        ];

        for (const template of validTemplates) {
          const config = new Configuration({ nameTemplate: template });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('Name template'))).toBe(false);
        }
      });

      it('should reject templates missing required placeholders', () => {
        // Missing {date}
        const config1 = new Configuration({ nameTemplate: '{vendor}_{amount}{ext}' });
        expect(config1.validate().errors).toContainEqual(expect.stringContaining('{date}'));

        // Missing {vendor}
        const config2 = new Configuration({ nameTemplate: '{date}_{amount}{ext}' });
        expect(config2.validate().errors).toContainEqual(expect.stringContaining('{vendor}'));

        // Missing {amount}
        const config3 = new Configuration({ nameTemplate: '{date}_{vendor}{ext}' });
        expect(config3.validate().errors).toContainEqual(expect.stringContaining('{amount}'));

        // Missing all
        const config4 = new Configuration({ nameTemplate: 'receipt.pdf' });
        expect(config4.validate().errors.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('LLM settings validation', () => {
      it('should require API key when LLM is enabled', () => {
        const config = new Configuration({
          useLlm: true,
          anthropicApiKey: null,
        });
        const result = config.validate();
        expect(result.errors).toContainEqual(expect.stringContaining('API key is required'));
      });

      it('should accept valid configuration when LLM is enabled with API key', () => {
        const config = new Configuration({
          useLlm: true,
          anthropicApiKey: 'sk-ant-test-key',
        });
        const result = config.validate();
        expect(result.errors.some(e => e.includes('API key'))).toBe(false);
      });

      it('should not require API key when LLM is disabled', () => {
        const config = new Configuration({
          useLlm: false,
          anthropicApiKey: null,
        });
        const result = config.validate();
        expect(result.errors.some(e => e.includes('API key'))).toBe(false);
      });

      it('should accept all valid LLM models', () => {
        const validModels = [
          'claude-3-haiku-20240307',
          'claude-3-5-haiku-20241022',
          'claude-3-5-sonnet-20241022',
          'claude-sonnet-4-20250514',
        ];

        for (const model of validModels) {
          const config = new Configuration({ llmModel: model });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('Invalid LLM model'))).toBe(false);
        }
      });

      it('should reject invalid LLM models', () => {
        const invalidModels = [
          'gpt-4',
          'claude-2',
          'claude-instant',
          'invalid-model',
          'claude-3-opus-20240229', // Not in valid list
        ];

        for (const model of invalidModels) {
          const config = new Configuration({ llmModel: model });
          const result = config.validate();
          expect(result.errors.some(e => e.includes('Invalid LLM model'))).toBe(true);
        }
      });

      it('should allow null LLM model', () => {
        const config = new Configuration({ llmModel: null });
        const result = config.validate();
        expect(result.errors.some(e => e.includes('Invalid LLM model'))).toBe(false);
      });
    });

    it('should return multiple errors for multiple invalid values', () => {
      const config = new Configuration({
        dateFormat: 'invalid',
        dateLocale: 'invalid',
        defaultCurrency: 'invalid',
        ocrLanguage: 'invalid',
        minFileSize: -1,
        nameTemplate: 'no-placeholders',
        useLlm: true,
        anthropicApiKey: null,
        llmModel: 'invalid-model',
      });

      const result = config.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('fromJSON', () => {
    it('should create configuration from JSON object', () => {
      const json = {
        dateFormat: 'DD-MM-YYYY',
        nameSeparator: '_',
        defaultCurrency: 'GBP',
        dryRun: true,
      };

      const config = Configuration.fromJSON(json);

      expect(config).toBeInstanceOf(Configuration);
      expect(config.dateFormat).toBe('DD-MM-YYYY');
      expect(config.nameSeparator).toBe('_');
      expect(config.defaultCurrency).toBe('GBP');
      expect(config.dryRun).toBe(true);
      // Defaults for unspecified
      expect(config.dateLocale).toBe('eu');
    });

    it('should handle empty JSON', () => {
      const config = Configuration.fromJSON({});
      expect(config).toBeInstanceOf(Configuration);
      expect(config.dateFormat).toBe('YYYYMMDD');
    });

    it('should handle full JSON object', () => {
      const json = {
        dateFormat: 'YYYY-MM-DD',
        nameSeparator: ' - ',
        nameTemplate: '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',
        defaultCurrency: 'EUR',
        dateLocale: 'us',
        autoAcceptAll: true,
        supportedExtensions: ['.pdf'],
        ocrLanguage: 'fra',
        minFileSize: 500,
        vendorAliases: { test: 'Test Corp' },
        skipDirectories: ['build'],
        recursive: false,
        dryRun: false,
        useLlm: true,
        anthropicApiKey: 'test-key',
        llmModel: 'claude-3-5-sonnet-20241022',
      };

      const config = Configuration.fromJSON(json);

      expect(config.dateFormat).toBe('YYYY-MM-DD');
      expect(config.defaultCurrency).toBe('EUR');
      expect(config.dateLocale).toBe('us');
      expect(config.autoAcceptAll).toBe(true);
      expect(config.supportedExtensions).toEqual(['.pdf']);
      expect(config.ocrLanguage).toBe('fra');
      expect(config.minFileSize).toBe(500);
      expect(config.vendorAliases).toEqual({ test: 'Test Corp' });
      expect(config.skipDirectories).toEqual(['build']);
      expect(config.recursive).toBe(false);
      expect(config.useLlm).toBe(true);
      expect(config.anthropicApiKey).toBe('test-key');
      expect(config.llmModel).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('toJSON', () => {
    it('should convert configuration to JSON object', () => {
      const config = new Configuration({
        dateFormat: 'DD-MM-YYYY',
        defaultCurrency: 'CHF',
        useLlm: true,
        anthropicApiKey: 'secret-key',
      });

      const json = config.toJSON();

      expect(json).toEqual({
        dateFormat: 'DD-MM-YYYY',
        nameSeparator: ' - ',
        nameTemplate: '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',
        defaultCurrency: 'CHF',
        dateLocale: 'eu',
        autoAcceptAll: false,
        supportedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.gif'],
        ocrLanguage: 'eng',
        minFileSize: 1024,
        vendorAliases: {},
        skipDirectories: ['node_modules', '.git', '__pycache__', '.DS_Store'],
        recursive: true,
        dryRun: false,
        useLlm: true,
        anthropicApiKey: 'secret-key',
        llmModel: 'claude-3-haiku-20240307',
      });
    });

    it('should include all default values in JSON output', () => {
      const config = new Configuration();
      const json = config.toJSON();

      expect(Object.keys(json)).toEqual([
        'dateFormat',
        'nameSeparator',
        'nameTemplate',
        'defaultCurrency',
        'dateLocale',
        'autoAcceptAll',
        'supportedExtensions',
        'ocrLanguage',
        'minFileSize',
        'vendorAliases',
        'skipDirectories',
        'recursive',
        'dryRun',
        'useLlm',
        'anthropicApiKey',
        'llmModel',
      ]);
    });

    it('should preserve array values correctly', () => {
      const config = new Configuration({
        supportedExtensions: ['.pdf', '.png'],
        skipDirectories: ['dist', 'build'],
      });

      const json = config.toJSON();

      expect(json.supportedExtensions).toEqual(['.pdf', '.png']);
      expect(json.skipDirectories).toEqual(['dist', 'build']);
    });

    it('should preserve object values correctly', () => {
      const config = new Configuration({
        vendorAliases: {
          'wmt': 'Walmart',
          'sbux': 'Starbucks',
        },
      });

      const json = config.toJSON();

      expect(json.vendorAliases).toEqual({
        'wmt': 'Walmart',
        'sbux': 'Starbucks',
      });
    });
  });

  describe('getDefaults', () => {
    it('should return a Configuration instance with default values', () => {
      const defaults = Configuration.getDefaults();

      expect(defaults).toBeInstanceOf(Configuration);
      expect(defaults.dateFormat).toBe('YYYYMMDD');
      expect(defaults.defaultCurrency).toBe('USD');
      expect(defaults.validate().valid).toBe(true);
    });

    it('should return a new instance each time', () => {
      const defaults1 = Configuration.getDefaults();
      const defaults2 = Configuration.getDefaults();

      expect(defaults1).not.toBe(defaults2);
    });
  });

  describe('roundtrip serialization', () => {
    it('should preserve values through JSON roundtrip', () => {
      const original = new Configuration({
        dateFormat: 'DD-MM-YYYY',
        nameSeparator: '_',
        nameTemplate: '{vendor}_{date}_{amount}{ext}',
        defaultCurrency: 'GBP',
        dateLocale: 'us',
        autoAcceptAll: true,
        supportedExtensions: ['.pdf'],
        ocrLanguage: 'deu',
        minFileSize: 512,
        vendorAliases: { 'test': 'Test Corp' },
        skipDirectories: ['build'],
        recursive: false,
        dryRun: true,
        useLlm: true,
        anthropicApiKey: 'api-key-123',
        llmModel: 'claude-3-5-haiku-20241022',
      });

      const json = original.toJSON();
      const restored = Configuration.fromJSON(json);

      expect(restored.dateFormat).toBe(original.dateFormat);
      expect(restored.nameSeparator).toBe(original.nameSeparator);
      expect(restored.nameTemplate).toBe(original.nameTemplate);
      expect(restored.defaultCurrency).toBe(original.defaultCurrency);
      expect(restored.dateLocale).toBe(original.dateLocale);
      expect(restored.autoAcceptAll).toBe(original.autoAcceptAll);
      expect(restored.supportedExtensions).toEqual(original.supportedExtensions);
      expect(restored.ocrLanguage).toBe(original.ocrLanguage);
      expect(restored.minFileSize).toBe(original.minFileSize);
      expect(restored.vendorAliases).toEqual(original.vendorAliases);
      expect(restored.skipDirectories).toEqual(original.skipDirectories);
      expect(restored.recursive).toBe(original.recursive);
      expect(restored.dryRun).toBe(original.dryRun);
      expect(restored.useLlm).toBe(original.useLlm);
      expect(restored.anthropicApiKey).toBe(original.anthropicApiKey);
      expect(restored.llmModel).toBe(original.llmModel);
    });

    it('should preserve default values through JSON roundtrip', () => {
      const original = Configuration.getDefaults();
      const json = original.toJSON();
      const restored = Configuration.fromJSON(json);

      expect(restored.toJSON()).toEqual(original.toJSON());
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in nameSeparator', () => {
      const config = new Configuration({ nameSeparator: ' | ' });
      expect(config.nameSeparator).toBe(' | ');
    });

    it('should handle empty nameSeparator', () => {
      const config = new Configuration({ nameSeparator: '' });
      expect(config.nameSeparator).toBe('');
    });

    it('should handle very large minFileSize', () => {
      const config = new Configuration({ minFileSize: Number.MAX_SAFE_INTEGER });
      const result = config.validate();
      expect(result.errors.some(e => e.includes('file size'))).toBe(false);
    });

    it('should handle empty arrays', () => {
      const config = new Configuration({
        supportedExtensions: [],
        skipDirectories: [],
      });

      expect(config.supportedExtensions).toEqual([]);
      expect(config.skipDirectories).toEqual([]);
    });

    it('should handle complex vendor aliases', () => {
      const config = new Configuration({
        vendorAliases: {
          'mc': "McDonald's",
          'bk': 'Burger King',
          'wm-super': 'Walmart Supercenter',
        },
      });

      expect(config.vendorAliases['mc']).toBe("McDonald's");
      expect(config.vendorAliases['wm-super']).toBe('Walmart Supercenter');
    });

    it('should handle boolean-like values', () => {
      // Test that actual booleans are used, not truthy values
      const configTrue = new Configuration({
        autoAcceptAll: true,
        recursive: true,
        dryRun: true,
        useLlm: true,
      });

      expect(configTrue.autoAcceptAll).toBe(true);
      expect(configTrue.recursive).toBe(true);
      expect(configTrue.dryRun).toBe(true);
      expect(configTrue.useLlm).toBe(true);

      const configFalse = new Configuration({
        autoAcceptAll: false,
        recursive: false,
        dryRun: false,
        useLlm: false,
      });

      expect(configFalse.autoAcceptAll).toBe(false);
      expect(configFalse.recursive).toBe(false);
      expect(configFalse.dryRun).toBe(false);
      expect(configFalse.useLlm).toBe(false);
    });
  });
});
