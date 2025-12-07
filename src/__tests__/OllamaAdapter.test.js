import { OllamaAdapter } from '../adapters/secondary/OllamaAdapter.js';

describe('OllamaAdapter', () => {
  describe('constructor', () => {
    it('should create adapter with default values', () => {
      const adapter = new OllamaAdapter();
      expect(adapter.host).toBe('http://localhost:11434');
      expect(adapter.model).toBe('llama3.2');
    });

    it('should create adapter with custom host', () => {
      const adapter = new OllamaAdapter('http://myhost:11434');
      expect(adapter.host).toBe('http://myhost:11434');
    });

    it('should create adapter with custom model', () => {
      const adapter = new OllamaAdapter('http://localhost:11434', 'mistral');
      expect(adapter.model).toBe('mistral');
    });

    it('should remove trailing slash from host', () => {
      const adapter = new OllamaAdapter('http://localhost:11434/');
      expect(adapter.host).toBe('http://localhost:11434');
    });
  });

  describe('isAvailable', () => {
    it('should return true when host is provided', () => {
      const adapter = new OllamaAdapter();
      expect(adapter.isAvailable()).toBe(true);
    });

    it('should return false when host is null', () => {
      const adapter = new OllamaAdapter(null);
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should return false when host is empty string', () => {
      const adapter = new OllamaAdapter('');
      expect(adapter.isAvailable()).toBe(false);
    });
  });

  describe('extractReceiptData', () => {
    it('should throw error when host is not configured', async () => {
      const adapter = new OllamaAdapter('');
      await expect(adapter.extractReceiptData('test text'))
        .rejects
        .toThrow('Ollama not configured. Please provide a valid host.');
    });
  });

  describe('parseResponse', () => {
    let adapter;

    beforeEach(() => {
      adapter = new OllamaAdapter();
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

    it('should extract JSON from text with extra content', () => {
      const response = 'Here is the extracted data:\n{"vendor": "Target", "date": "2024-01-15", "amount": 25.00, "currency": "USD"}\nThank you!';

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

    it('should handle invalid JSON by returning all nulls', () => {
      const response = 'I could not extract any data from this receipt.';

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
    it('should store model correctly', () => {
      const models = ['llama3.2', 'mistral', 'codellama', 'phi', 'gemma'];

      for (const model of models) {
        const adapter = new OllamaAdapter('http://localhost:11434', model);
        expect(adapter.model).toBe(model);
      }
    });

    it('should handle various host formats', () => {
      const hosts = [
        'http://localhost:11434',
        'http://192.168.1.100:11434',
        'https://ollama.example.com',
        'http://ollama:11434',
      ];

      for (const host of hosts) {
        const adapter = new OllamaAdapter(host);
        expect(adapter.host).toBe(host);
        expect(adapter.isAvailable()).toBe(true);
      }
    });
  });
});
