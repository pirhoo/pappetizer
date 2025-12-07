import { OpenAiAdapter } from '../adapters/secondary/OpenAiAdapter.js';

describe('OpenAiAdapter', () => {
  describe('constructor', () => {
    it('should create adapter with default values', () => {
      const adapter = new OpenAiAdapter();
      expect(adapter.apiKey).toBeNull();
      expect(adapter.model).toBe('gpt-4o-mini');
    });

    it('should create adapter with API key', () => {
      const adapter = new OpenAiAdapter('sk-test-key');
      expect(adapter.apiKey).toBe('sk-test-key');
    });

    it('should create adapter with custom model', () => {
      const adapter = new OpenAiAdapter('sk-test-key', 'gpt-4o');
      expect(adapter.model).toBe('gpt-4o');
    });
  });

  describe('isAvailable', () => {
    it('should return false when no API key provided', () => {
      const adapter = new OpenAiAdapter();
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should return false when API key is null', () => {
      const adapter = new OpenAiAdapter(null);
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      const adapter = new OpenAiAdapter('');
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should return true when API key is provided', () => {
      const adapter = new OpenAiAdapter('sk-test-key');
      expect(adapter.isAvailable()).toBe(true);
    });
  });

  describe('extractReceiptData', () => {
    it('should throw error when LLM is not available', async () => {
      const adapter = new OpenAiAdapter();
      await expect(adapter.extractReceiptData('test text'))
        .rejects
        .toThrow('LLM not configured. Please provide an OpenAI API key.');
    });
  });

  describe('parseResponse', () => {
    let adapter;

    beforeEach(() => {
      adapter = new OpenAiAdapter();
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
      expect(result.amount).toBe(50.99);
      expect(result.currency).toBe('USD');
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const response = '```json\n{"vendor": "Starbucks", "date": "2024-01-20", "amount": 5.50, "currency": "USD"}\n```';

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Starbucks');
      expect(result.amount).toBe(5.50);
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

    it('should handle invalid JSON by returning all nulls', () => {
      const response = 'not valid json {{{';

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBeNull();
      expect(result.date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.currency).toBeNull();
    });

    it('should handle string amount by returning null for amount', () => {
      const response = JSON.stringify({
        vendor: 'Store',
        date: '2024-01-01',
        amount: '$50.00',
        currency: 'USD',
      });

      const result = adapter.parseResponse(response);

      expect(result.vendor).toBe('Store');
      expect(result.amount).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined API key values', () => {
      const adapter1 = new OpenAiAdapter(null);
      expect(adapter1.isAvailable()).toBe(false);

      const adapter2 = new OpenAiAdapter(undefined);
      expect(adapter2.isAvailable()).toBe(false);

      const adapter3 = new OpenAiAdapter('');
      expect(adapter3.isAvailable()).toBe(false);
    });

    it('should store model correctly', () => {
      const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];

      for (const model of models) {
        const adapter = new OpenAiAdapter('sk-test', model);
        expect(adapter.model).toBe(model);
      }
    });
  });
});
