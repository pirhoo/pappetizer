import { Receipt } from '../domain/entities/Receipt.js';

describe('Receipt', () => {
  describe('generateFilename', () => {
    it('should generate filename with all fields', () => {
      const receipt = new Receipt({
        filePath: '/path/to/file.pdf',
        vendor: 'Amazon',
        date: new Date('2024-03-15'),
        amount: 42.99,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename()).toBe('20240315 - AMAZON - 42.99 USD.pdf');
    });

    it('should handle missing vendor', () => {
      const receipt = new Receipt({
        filePath: '/path/to/file.pdf',
        vendor: null,
        date: new Date('2024-01-01'),
        amount: 10.00,
        currency: 'EUR',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename()).toBe('20240101 - UNKNOWN - 10.00 EUR.pdf');
    });

    it('should handle missing date', () => {
      const receipt = new Receipt({
        filePath: '/path/to/file.pdf',
        vendor: 'Store',
        date: null,
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.png',
      });

      expect(receipt.generateFilename()).toBe('UNKNOWN - STORE - 10.00 USD.png');
    });

    it('should handle missing amount', () => {
      const receipt = new Receipt({
        filePath: '/path/to/file.pdf',
        vendor: 'Store',
        date: new Date('2024-06-20'),
        amount: null,
        currency: 'USD',
        originalName: 'receipt.jpg',
      });

      expect(receipt.generateFilename()).toBe('20240620 - STORE - 0.00 USD.jpg');
    });

    it('should handle all fields missing', () => {
      const receipt = new Receipt({
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename()).toBe('UNKNOWN - UNKNOWN - 0.00 USD.pdf');
    });

    it('should handle zero amount', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-01-01'),
        amount: 0,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename()).toBe('20240101 - STORE - 0.00 USD.pdf');
    });

    it('should handle very large amounts', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-01-01'),
        amount: 999999.99,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename()).toBe('20240101 - STORE - 999999.99 USD.pdf');
    });

    it('should handle amounts with many decimal places', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-01-01'),
        amount: 10.999,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename()).toBe('20240101 - STORE - 11.00 USD.pdf');
    });

    it('should use custom date format YYYY-MM-DD', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename({ dateFormat: 'YYYY-MM-DD' }))
        .toBe('2024-03-15 - STORE - 10.00 USD.pdf');
    });

    it('should use custom date format DD-MM-YYYY', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename({ dateFormat: 'DD-MM-YYYY' }))
        .toBe('15-03-2024 - STORE - 10.00 USD.pdf');
    });

    it('should use custom date format MM-DD-YYYY', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename({ dateFormat: 'MM-DD-YYYY' }))
        .toBe('03-15-2024 - STORE - 10.00 USD.pdf');
    });

    it('should use custom date format DD.MM.YYYY', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename({ dateFormat: 'DD.MM.YYYY' }))
        .toBe('15.03.2024 - STORE - 10.00 USD.pdf');
    });

    it('should use custom separator', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename({ nameSeparator: '_' }))
        .toBe('20240315_STORE_10.00 USD.pdf');
    });

    it('should use custom template', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename({
        nameTemplate: '{vendor}{sep}{date}{sep}{amount}{currency}{ext}'
      })).toBe('STORE - 20240315 - 10.00USD.pdf');
    });

    it('should use custom default currency when currency is missing', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: null,
        originalName: 'receipt.pdf',
      });

      expect(receipt.generateFilename({ defaultCurrency: 'EUR' }))
        .toBe('20240315 - STORE - 10.00 EUR.pdf');
    });

    it('should preserve original file extension case', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.PDF',
      });

      expect(receipt.generateFilename()).toBe('20240315 - STORE - 10.00 USD.pdf');
    });

    it('should handle jpeg extension', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.jpeg',
      });

      expect(receipt.generateFilename()).toBe('20240315 - STORE - 10.00 USD.jpeg');
    });

    it('should handle tiff extension', () => {
      const receipt = new Receipt({
        vendor: 'Store',
        date: new Date('2024-03-15'),
        amount: 10.00,
        currency: 'USD',
        originalName: 'receipt.tiff',
      });

      expect(receipt.generateFilename()).toBe('20240315 - STORE - 10.00 USD.tiff');
    });
  });

  describe('normalizeCurrency', () => {
    it('should convert dollar to USD', () => {
      const receipt = new Receipt({
        currency: 'dollar',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('USD');
    });

    it('should convert dollars (plural) to USD', () => {
      const receipt = new Receipt({
        currency: 'dollars',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('USD');
    });

    it('should convert euro to EUR', () => {
      const receipt = new Receipt({
        currency: 'euro',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('EUR');
    });

    it('should convert euros (plural) to EUR', () => {
      const receipt = new Receipt({
        currency: 'euros',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('EUR');
    });

    it('should handle CHF', () => {
      const receipt = new Receipt({
        currency: 'CHF',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('CHF');
    });

    it('should convert franc to CHF', () => {
      const receipt = new Receipt({
        currency: 'franc',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('CHF');
    });

    it('should convert francs to CHF', () => {
      const receipt = new Receipt({
        currency: 'francs',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('CHF');
    });

    it('should convert pound to GBP', () => {
      const receipt = new Receipt({
        currency: 'pound',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('GBP');
    });

    it('should convert sterling to GBP', () => {
      const receipt = new Receipt({
        currency: 'sterling',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('GBP');
    });

    it('should convert yen to JPY', () => {
      const receipt = new Receipt({
        currency: 'yen',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('JPY');
    });

    it('should handle $ symbol', () => {
      const receipt = new Receipt({
        currency: '$',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('USD');
    });

    it('should default to USD when currency is missing', () => {
      const receipt = new Receipt({
        currency: null,
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('USD');
    });

    it('should default to USD when currency is empty string', () => {
      const receipt = new Receipt({
        currency: '',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('USD');
    });

    it('should handle lowercase currency codes', () => {
      const receipt = new Receipt({
        currency: 'eur',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('EUR');
    });

    it('should handle mixed case currency codes', () => {
      const receipt = new Receipt({
        currency: 'Usd',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('USD');
    });

    it('should handle currency with whitespace', () => {
      const receipt = new Receipt({
        currency: '  CHF  ',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('CHF');
    });

    it('should truncate unknown currency to 3 chars', () => {
      const receipt = new Receipt({
        currency: 'UNKNOWN_CURRENCY',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('UNK');
    });

    it('should use custom default currency', () => {
      const receipt = new Receipt({
        currency: null,
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency('EUR')).toBe('EUR');
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYYMMDD', () => {
      const receipt = new Receipt({
        date: new Date('2024-12-25'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('20241225');
    });

    it('should handle string dates', () => {
      const receipt = new Receipt({
        date: '2024-07-04',
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('20240704');
    });

    it('should return UNKNOWN for invalid dates', () => {
      const receipt = new Receipt({
        date: 'invalid',
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for null date', () => {
      const receipt = new Receipt({
        date: null,
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for undefined date', () => {
      const receipt = new Receipt({
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('UNKNOWN');
    });

    it('should pad single digit month', () => {
      const receipt = new Receipt({
        date: new Date('2024-01-15'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('20240115');
    });

    it('should pad single digit day', () => {
      const receipt = new Receipt({
        date: new Date('2024-12-05'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('20241205');
    });

    it('should handle year boundary dates', () => {
      const receipt = new Receipt({
        date: new Date('2024-01-01'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('20240101');
    });

    it('should handle end of year dates', () => {
      const receipt = new Receipt({
        date: new Date('2024-12-31'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('20241231');
    });

    it('should handle leap year date', () => {
      const receipt = new Receipt({
        date: new Date('2024-02-29'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate()).toBe('20240229');
    });

    it('should format with YYYY-MM-DD format', () => {
      const receipt = new Receipt({
        date: new Date('2024-03-15'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate('YYYY-MM-DD')).toBe('2024-03-15');
    });

    it('should format with DD-MM-YYYY format', () => {
      const receipt = new Receipt({
        date: new Date('2024-03-15'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate('DD-MM-YYYY')).toBe('15-03-2024');
    });

    it('should format with MM-DD-YYYY format', () => {
      const receipt = new Receipt({
        date: new Date('2024-03-15'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate('MM-DD-YYYY')).toBe('03-15-2024');
    });

    it('should format with YYYY.MM.DD format', () => {
      const receipt = new Receipt({
        date: new Date('2024-03-15'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate('YYYY.MM.DD')).toBe('2024.03.15');
    });

    it('should format with DD.MM.YYYY format', () => {
      const receipt = new Receipt({
        date: new Date('2024-03-15'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate('DD.MM.YYYY')).toBe('15.03.2024');
    });

    it('should default to YYYYMMDD for unknown format', () => {
      const receipt = new Receipt({
        date: new Date('2024-03-15'),
        originalName: 'test.pdf',
      });
      expect(receipt.formatDate('INVALID')).toBe('20240315');
    });
  });

  describe('sanitizeVendor', () => {
    it('should remove invalid characters', () => {
      const receipt = new Receipt({
        vendor: 'Store/Name:Test',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('STORENAMETEST');
    });

    it('should convert to uppercase', () => {
      const receipt = new Receipt({
        vendor: 'amazon',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('AMAZON');
    });

    it('should normalize whitespace', () => {
      const receipt = new Receipt({
        vendor: '  Store   Name  ',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('STORE NAME');
    });

    it('should return UNKNOWN for null vendor', () => {
      const receipt = new Receipt({
        vendor: null,
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for undefined vendor', () => {
      const receipt = new Receipt({
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for empty vendor', () => {
      const receipt = new Receipt({
        vendor: '',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('UNKNOWN');
    });

    it('should remove all invalid filename characters', () => {
      const receipt = new Receipt({
        vendor: 'Store<>:"/\\|?*Name',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('STORENAME');
    });

    it('should handle vendor with only invalid characters', () => {
      const receipt = new Receipt({
        vendor: '<>:"/\\|?*',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('');
    });

    it('should preserve apostrophes in names', () => {
      const receipt = new Receipt({
        vendor: "McDonald's",
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe("MCDONALD'S");
    });

    it('should preserve ampersand', () => {
      const receipt = new Receipt({
        vendor: 'H&M',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('H&M');
    });

    it('should preserve hyphens', () => {
      const receipt = new Receipt({
        vendor: 'Chick-fil-A',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('CHICK-FIL-A');
    });

    it('should handle very long vendor names', () => {
      const receipt = new Receipt({
        vendor: 'A'.repeat(100),
        originalName: 'test.pdf',
      });
      // Should not throw, result may be truncated by other parts
      expect(receipt.sanitizeVendor().length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const receipt = new Receipt({
        vendor: 'Café Müller',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('CAFÉ MÜLLER');
    });

    it('should handle numbers in vendor name', () => {
      const receipt = new Receipt({
        vendor: '7-Eleven',
        originalName: 'test.pdf',
      });
      expect(receipt.sanitizeVendor()).toBe('7-ELEVEN');
    });
  });

  describe('getExtension', () => {
    it('should extract pdf extension', () => {
      const receipt = new Receipt({
        originalName: 'receipt.pdf',
      });
      expect(receipt.getExtension()).toBe('.pdf');
    });

    it('should extract png extension', () => {
      const receipt = new Receipt({
        originalName: 'receipt.png',
      });
      expect(receipt.getExtension()).toBe('.png');
    });

    it('should extract jpg extension', () => {
      const receipt = new Receipt({
        originalName: 'receipt.jpg',
      });
      expect(receipt.getExtension()).toBe('.jpg');
    });

    it('should handle uppercase extension', () => {
      const receipt = new Receipt({
        originalName: 'receipt.PDF',
      });
      expect(receipt.getExtension()).toBe('.pdf');
    });

    it('should handle mixed case extension', () => {
      const receipt = new Receipt({
        originalName: 'receipt.JpG',
      });
      expect(receipt.getExtension()).toBe('.jpg');
    });

    it('should return empty string for no extension', () => {
      const receipt = new Receipt({
        originalName: 'receipt',
      });
      expect(receipt.getExtension()).toBe('');
    });

    it('should handle multiple dots in filename', () => {
      const receipt = new Receipt({
        originalName: 'receipt.2024.03.15.pdf',
      });
      expect(receipt.getExtension()).toBe('.pdf');
    });

    it('should handle null originalName', () => {
      const receipt = new Receipt({
        originalName: null,
      });
      expect(receipt.getExtension()).toBe('');
    });

    it('should handle undefined originalName', () => {
      const receipt = new Receipt({});
      expect(receipt.getExtension()).toBe('');
    });
  });

  describe('formatAmount', () => {
    it('should format amount with 2 decimal places', () => {
      const receipt = new Receipt({
        amount: 10,
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('10.00');
    });

    it('should format amount with existing decimals', () => {
      const receipt = new Receipt({
        amount: 10.5,
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('10.50');
    });

    it('should round to 2 decimal places', () => {
      const receipt = new Receipt({
        amount: 10.999,
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('11.00');
    });

    it('should return 0.00 for null amount', () => {
      const receipt = new Receipt({
        amount: null,
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('0.00');
    });

    it('should return 0.00 for undefined amount', () => {
      const receipt = new Receipt({
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('0.00');
    });

    it('should handle zero amount', () => {
      const receipt = new Receipt({
        amount: 0,
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('0.00');
    });

    it('should handle string amount', () => {
      const receipt = new Receipt({
        amount: '42.99',
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('42.99');
    });

    it('should handle very small amounts', () => {
      const receipt = new Receipt({
        amount: 0.01,
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('0.01');
    });

    it('should handle very large amounts', () => {
      const receipt = new Receipt({
        amount: 1000000.99,
        originalName: 'test.pdf',
      });
      expect(receipt.formatAmount()).toBe('1000000.99');
    });
  });

  describe('toJSON', () => {
    it('should serialize all fields', () => {
      const receipt = new Receipt({
        filePath: '/path/to/file.pdf',
        vendor: 'Amazon',
        date: new Date('2024-03-15'),
        amount: 42.99,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      const json = receipt.toJSON();

      expect(json).toHaveProperty('filePath', '/path/to/file.pdf');
      expect(json).toHaveProperty('vendor', 'Amazon');
      expect(json).toHaveProperty('amount', 42.99);
      expect(json).toHaveProperty('currency', 'USD');
      expect(json).toHaveProperty('originalName', 'receipt.pdf');
      expect(json).toHaveProperty('generatedName', '20240315 - AMAZON - 42.99 USD.pdf');
    });

    it('should serialize with config options', () => {
      const receipt = new Receipt({
        filePath: '/path/to/file.pdf',
        vendor: 'Amazon',
        date: new Date('2024-03-15'),
        amount: 42.99,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      const json = receipt.toJSON({ dateFormat: 'YYYY-MM-DD' });

      expect(json.generatedName).toBe('2024-03-15 - AMAZON - 42.99 USD.pdf');
    });

    it('should serialize with null fields', () => {
      const receipt = new Receipt({
        originalName: 'receipt.pdf',
      });

      const json = receipt.toJSON();

      expect(json.vendor).toBeUndefined();
      expect(json.date).toBeUndefined();
      expect(json.amount).toBeUndefined();
      expect(json).toHaveProperty('originalName', 'receipt.pdf');
    });

    it('should include date object in serialization', () => {
      const date = new Date('2024-03-15');
      const receipt = new Receipt({
        date,
        originalName: 'receipt.pdf',
      });

      const json = receipt.toJSON();

      expect(json.date).toBe(date);
    });
  });

  describe('constructor', () => {
    it('should create receipt with all properties', () => {
      const receipt = new Receipt({
        filePath: '/path/to/file.pdf',
        vendor: 'Amazon',
        date: new Date('2024-03-15'),
        amount: 42.99,
        currency: 'USD',
        originalName: 'receipt.pdf',
      });

      expect(receipt.filePath).toBe('/path/to/file.pdf');
      expect(receipt.vendor).toBe('Amazon');
      expect(receipt.date).toEqual(new Date('2024-03-15'));
      expect(receipt.amount).toBe(42.99);
      expect(receipt.currency).toBe('USD');
      expect(receipt.originalName).toBe('receipt.pdf');
    });

    it('should create receipt with empty object', () => {
      const receipt = new Receipt({});

      expect(receipt.filePath).toBeUndefined();
      expect(receipt.vendor).toBeUndefined();
      expect(receipt.date).toBeUndefined();
      expect(receipt.amount).toBeUndefined();
      expect(receipt.currency).toBeUndefined();
      expect(receipt.originalName).toBeUndefined();
    });

    it('should throw on undefined input', () => {
      expect(() => new Receipt()).toThrow();
    });
  });
});
