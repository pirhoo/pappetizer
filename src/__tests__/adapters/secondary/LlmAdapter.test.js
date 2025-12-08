import { LlmAdapter } from '../../../adapters/secondary/LlmAdapter.js';

describe('LlmAdapter', () => {
  describe('constructor', () => {
    it('should create adapter with default values', () => {
      const adapter = new LlmAdapter();
      expect(adapter.apiKey).toBeNull();
      expect(adapter.model).toBe('claude-3-haiku-20240307');
      expect(adapter.client).toBeNull();
    });

    it('should create adapter with API key', () => {
      const adapter = new LlmAdapter('sk-test-key');
      expect(adapter.apiKey).toBe('sk-test-key');
      expect(adapter.client).not.toBeNull();
    });

    it('should create adapter with custom model', () => {
      const adapter = new LlmAdapter('sk-test-key', 'claude-3-5-sonnet-20241022');
      expect(adapter.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should not create client when API key is null', () => {
      const adapter = new LlmAdapter(null);
      expect(adapter.client).toBeNull();
    });

    it('should not create client when API key is empty string', () => {
      const adapter = new LlmAdapter('');
      expect(adapter.client).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return false when no API key provided', () => {
      const adapter = new LlmAdapter();
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should return false when API key is null', () => {
      const adapter = new LlmAdapter(null);
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should return true when API key is provided', () => {
      const adapter = new LlmAdapter('sk-test-key');
      expect(adapter.isAvailable()).toBe(true);
    });
  });

  describe('extractReceiptData', () => {
    it('should throw error when LLM is not available', async () => {
      const adapter = new LlmAdapter();
      await expect(adapter.extractReceiptData('test text'))
        .rejects
        .toThrow('LLM not configured. Please provide an Anthropic API key.');
    });

    // Note: Integration tests with actual API calls would go in a separate test file
    // and would require a valid API key. These tests focus on the adapter logic.
  });

  describe('parseResponse', () => {
    let adapter;

    beforeEach(() => {
      adapter = new LlmAdapter();
    });

    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        vendor: 'Walmart',
        date: '2024-03-15',
        amount: 50.99,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Walmart');
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getFullYear()).toBe(2024);
      expect(result.date.getMonth()).toBe(2);
      expect(result.date.getDate()).toBe(15);
      expect(result.amount).toBe(50.99);
      expect(result.currency).toBe('USD');
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const response = '```json\n{"vendor": "Starbucks", "date": "2024-01-20", "amount": 5.50, "currency": "USD"}\n```';

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Starbucks');
      expect(result.amount).toBe(5.50);
    });

    it('should handle JSON in code blocks without json specifier', () => {
      const response = '```\n{"vendor": "Target", "date": null, "amount": 25.00, "currency": "USD"}\n```';

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Target');
      expect(result.amount).toBe(25.00);
    });

    it('should handle null values in response', () => {
      const response = JSON.stringify({
        vendor: null,
        date: null,
        amount: null,
        currency: null,
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBeNull();
      expect(result.date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.currency).toBeNull();
    });

    it('should handle partial data in response', () => {
      const response = JSON.stringify({
        vendor: 'Costco',
        date: null,
        amount: 150.00,
        currency: null,
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Costco');
      expect(result.date).toBeNull();
      expect(result.amount).toBe(150.00);
      expect(result.currency).toBeNull();
    });

    it('should handle missing fields in response', () => {
      const response = JSON.stringify({
        vendor: 'Amazon',
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Amazon');
      expect(result.date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.currency).toBeNull();
    });

    it('should handle invalid JSON by returning all nulls', () => {
      const response = 'not valid json {{{';

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBeNull();
      expect(result.date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.currency).toBeNull();
    });

    it('should handle empty string response', () => {
      const result = adapter.parseResponse('');

      expect(result.vendor).toBeNull();
      expect(result.date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.currency).toBeNull();
    });

    it('should handle response with extra whitespace', () => {
      const response = '  \n  {"vendor": "Nike", "date": "2024-05-01", "amount": 120.00, "currency": "USD"}  \n  ';

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Nike');
      expect(result.amount).toBe(120.00);
    });

    it('should handle string amount by returning null for amount', () => {
      const response = JSON.stringify({
        vendor: 'Store',
        date: '2024-01-01',
        amount: '$50.00', // String instead of number
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Store');
      expect(result.amount).toBeNull();
    });

    it('should handle zero amount', () => {
      const response = JSON.stringify({
        vendor: 'Free Store',
        date: '2024-01-01',
        amount: 0,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.amount).toBe(0);
    });

    it('should handle negative amount', () => {
      const response = JSON.stringify({
        vendor: 'Refund Store',
        date: '2024-01-01',
        amount: -25.00,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.amount).toBe(-25.00);
    });

    it('should handle empty string vendor as null', () => {
      const response = JSON.stringify({
        vendor: '',
        date: '2024-01-01',
        amount: 50.00,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBeNull();
    });

    it('should handle empty string currency as null', () => {
      const response = JSON.stringify({
        vendor: 'Store',
        date: '2024-01-01',
        amount: 50.00,
        currency: '',
      });

      const result = adapter.parseResponse(response);

      expect(result.currency).toBeNull();
    });

    it('should handle various date formats', () => {
      // ISO format
      const result1 = adapter.parseResponse(JSON.stringify({ date: '2024-03-15' }));
      expect(result1.date).toBeInstanceOf(Date);

      // Full ISO with time
      const result2 = adapter.parseResponse(JSON.stringify({ date: '2024-03-15T10:00:00Z' }));
      expect(result2.date).toBeInstanceOf(Date);
    });

    it('should handle invalid date as invalid Date object', () => {
      const response = JSON.stringify({
        vendor: 'Store',
        date: 'not-a-date',
        amount: 50.00,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      // Invalid date string will create an Invalid Date object
      expect(result.date).toBeInstanceOf(Date);
      expect(isNaN(result.date.getTime())).toBe(true);
    });

    it('should handle large amounts', () => {
      const response = JSON.stringify({
        vendor: 'Luxury Store',
        date: '2024-01-01',
        amount: 999999.99,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.amount).toBe(999999.99);
    });

    it('should handle decimal amounts', () => {
      const response = JSON.stringify({
        vendor: 'Precise Store',
        date: '2024-01-01',
        amount: 10.01,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.amount).toBe(10.01);
    });

    it('should handle Unicode vendor names', () => {
      const response = JSON.stringify({
        vendor: 'Café Müller 日本',
        date: '2024-01-01',
        amount: 15.00,
        currency: 'EUR',
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Café Müller 日本');
    });

    it('should handle vendor names with special characters', () => {
      const response = JSON.stringify({
        vendor: "McDonald's & Co.",
        date: '2024-01-01',
        amount: 10.00,
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe("McDonald's & Co.");
    });

    it('should handle response with extra fields', () => {
      const response = JSON.stringify({
        vendor: 'Store',
        date: '2024-01-01',
        amount: 50.00,
        currency: 'USD',
        confidence: 0.95, // Extra field
        source: 'receipt', // Extra field
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Store');
      expect(result.amount).toBe(50.00);
      // Extra fields should be ignored
      expect(result.confidence).toBeUndefined();
      expect(result.source).toBeUndefined();
    });

    it('should handle multiline JSON in code blocks', () => {
      const response = `\`\`\`json
{
  "vendor": "Best Buy",
  "date": "2024-02-20",
  "amount": 299.99,
  "currency": "USD"
}
\`\`\``;

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Best Buy');
      expect(result.amount).toBe(299.99);
    });

    it('should handle text before JSON in code blocks', () => {
      const response = 'Here is the extracted data:\n```json\n{"vendor": "Store", "date": "2024-01-01", "amount": 50.00, "currency": "USD"}\n```';

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Store');
    });

    it('should handle different currency codes', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'CNY', 'INR', 'BRL'];

      for (const currency of currencies) {
        const response = JSON.stringify({
          vendor: 'Store',
          date: '2024-01-01',
          amount: 100,
          currency,
        });

        const result = adapter.parseResponse(response);
        expect(result.currency).toBe(currency);
      }
    });

    it('should handle boolean amount as null', () => {
      const response = JSON.stringify({
        vendor: 'Store',
        date: '2024-01-01',
        amount: true, // Boolean instead of number
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.amount).toBeNull();
    });

    it('should handle array as response by returning nulls', () => {
      const response = JSON.stringify([
        { vendor: 'Store1' },
        { vendor: 'Store2' },
      ]);

      const result = adapter.parseResponse(response);

      // Arrays don't have vendor/date/amount/currency properties
      expect(result.vendor).toBeNull();
      expect(result.date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.currency).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle falsy API key values', () => {
      const adapter1 = new LlmAdapter(0);
      expect(adapter1.isAvailable()).toBe(false);

      const adapter2 = new LlmAdapter(false);
      expect(adapter2.isAvailable()).toBe(false);

      const adapter3 = new LlmAdapter(undefined);
      expect(adapter3.isAvailable()).toBe(false);
    });

    it('should store model correctly', () => {
      const models = [
        'claude-3-haiku-20240307',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20241022',
        'claude-sonnet-4-20250514',
      ];

      for (const model of models) {
        const adapter = new LlmAdapter('sk-test', model);
        expect(adapter.model).toBe(model);
      }
    });
  });
});
