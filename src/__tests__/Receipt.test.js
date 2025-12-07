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
  });

  describe('normalizeCurrency', () => {
    it('should convert dollar to USD', () => {
      const receipt = new Receipt({
        currency: 'dollar',
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

    it('should handle CHF', () => {
      const receipt = new Receipt({
        currency: 'CHF',
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('CHF');
    });

    it('should default to USD when currency is missing', () => {
      const receipt = new Receipt({
        currency: null,
        originalName: 'test.pdf',
      });
      expect(receipt.normalizeCurrency()).toBe('USD');
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
  });
});
