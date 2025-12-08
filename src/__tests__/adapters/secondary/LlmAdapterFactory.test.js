import { LlmAdapterFactory } from '../../../adapters/secondary/LlmAdapterFactory.js';
import { AnthropicAdapter } from '../../../adapters/secondary/LlmAdapter.js';
import { OpenAiAdapter } from '../../../adapters/secondary/OpenAiAdapter.js';
import { OllamaAdapter } from '../../../adapters/secondary/OllamaAdapter.js';
import { Configuration } from '../../../domain/entities/Configuration.js';

describe('LlmAdapterFactory', () => {
  describe('create', () => {
    it('should create AnthropicAdapter for anthropic provider', () => {
      const adapter = LlmAdapterFactory.create({
        provider: 'anthropic',
        apiKey: 'sk-ant-key',
      });

      expect(adapter).toBeInstanceOf(AnthropicAdapter);
      expect(adapter.apiKey).toBe('sk-ant-key');
    });

    it('should create OpenAiAdapter for openai provider', () => {
      const adapter = LlmAdapterFactory.create({
        provider: 'openai',
        apiKey: 'sk-openai-key',
      });

      expect(adapter).toBeInstanceOf(OpenAiAdapter);
      expect(adapter.apiKey).toBe('sk-openai-key');
    });

    it('should create OllamaAdapter for ollama provider', () => {
      const adapter = LlmAdapterFactory.create({
        provider: 'ollama',
        host: 'http://localhost:11434',
      });

      expect(adapter).toBeInstanceOf(OllamaAdapter);
      expect(adapter.host).toBe('http://localhost:11434');
    });

    it('should return null for anthropic without API key', () => {
      const adapter = LlmAdapterFactory.create({
        provider: 'anthropic',
        apiKey: null,
      });

      expect(adapter).toBeNull();
    });

    it('should return null for openai without API key', () => {
      const adapter = LlmAdapterFactory.create({
        provider: 'openai',
        apiKey: null,
      });

      expect(adapter).toBeNull();
    });

    it('should create OllamaAdapter with default host', () => {
      const adapter = LlmAdapterFactory.create({
        provider: 'ollama',
      });

      expect(adapter).toBeInstanceOf(OllamaAdapter);
      expect(adapter.host).toBe('http://localhost:11434');
    });

    it('should return null for unknown provider', () => {
      const adapter = LlmAdapterFactory.create({
        provider: 'gemini',
        apiKey: 'some-key',
      });

      expect(adapter).toBeNull();
    });

    it('should use custom model when provided', () => {
      const anthropicAdapter = LlmAdapterFactory.create({
        provider: 'anthropic',
        apiKey: 'sk-key',
        model: 'claude-3-5-sonnet-20241022',
      });
      expect(anthropicAdapter.model).toBe('claude-3-5-sonnet-20241022');

      const openaiAdapter = LlmAdapterFactory.create({
        provider: 'openai',
        apiKey: 'sk-key',
        model: 'gpt-4o',
      });
      expect(openaiAdapter.model).toBe('gpt-4o');

      const ollamaAdapter = LlmAdapterFactory.create({
        provider: 'ollama',
        model: 'mistral',
      });
      expect(ollamaAdapter.model).toBe('mistral');
    });

    it('should use default model when not provided', () => {
      const anthropicAdapter = LlmAdapterFactory.create({
        provider: 'anthropic',
        apiKey: 'sk-key',
      });
      expect(anthropicAdapter.model).toBe('claude-3-haiku-20240307');

      const openaiAdapter = LlmAdapterFactory.create({
        provider: 'openai',
        apiKey: 'sk-key',
      });
      expect(openaiAdapter.model).toBe('gpt-4o-mini');

      const ollamaAdapter = LlmAdapterFactory.create({
        provider: 'ollama',
      });
      expect(ollamaAdapter.model).toBe('llama3.2');
    });
  });

  describe('fromConfiguration', () => {
    it('should return null when useLlm is false', () => {
      const config = new Configuration({
        useLlm: false,
      });

      const adapter = LlmAdapterFactory.fromConfiguration(config);

      expect(adapter).toBeNull();
    });

    it('should create AnthropicAdapter from configuration', () => {
      const config = new Configuration({
        useLlm: true,
        llmProvider: 'anthropic',
        anthropicApiKey: 'sk-ant-key',
        llmModel: 'claude-3-5-sonnet-20241022',
      });

      const adapter = LlmAdapterFactory.fromConfiguration(config);

      expect(adapter).toBeInstanceOf(AnthropicAdapter);
      expect(adapter.apiKey).toBe('sk-ant-key');
      expect(adapter.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should create OpenAiAdapter from configuration', () => {
      const config = new Configuration({
        useLlm: true,
        llmProvider: 'openai',
        openaiApiKey: 'sk-openai-key',
        llmModel: 'gpt-4o',
      });

      const adapter = LlmAdapterFactory.fromConfiguration(config);

      expect(adapter).toBeInstanceOf(OpenAiAdapter);
      expect(adapter.apiKey).toBe('sk-openai-key');
      expect(adapter.model).toBe('gpt-4o');
    });

    it('should create OllamaAdapter from configuration', () => {
      const config = new Configuration({
        useLlm: true,
        llmProvider: 'ollama',
        ollamaHost: 'http://myhost:11434',
        llmModel: 'llama3.2',
      });

      const adapter = LlmAdapterFactory.fromConfiguration(config);

      expect(adapter).toBeInstanceOf(OllamaAdapter);
      expect(adapter.host).toBe('http://myhost:11434');
      expect(adapter.model).toBe('llama3.2');
    });

    it('should use default model from factory when llmModel is null', () => {
      const config = new Configuration({
        useLlm: true,
        llmProvider: 'anthropic',
        anthropicApiKey: 'sk-key',
        llmModel: null,
      });

      const adapter = LlmAdapterFactory.fromConfiguration(config);

      expect(adapter.model).toBe('claude-3-haiku-20240307');
    });
  });

  describe('getDefaultModel', () => {
    it('should return correct default model for each provider', () => {
      expect(LlmAdapterFactory.getDefaultModel('anthropic')).toBe('claude-3-haiku-20240307');
      expect(LlmAdapterFactory.getDefaultModel('openai')).toBe('gpt-4o-mini');
      expect(LlmAdapterFactory.getDefaultModel('ollama')).toBe('llama3.2');
    });

    it('should return anthropic default for unknown provider', () => {
      expect(LlmAdapterFactory.getDefaultModel('unknown')).toBe('claude-3-haiku-20240307');
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = LlmAdapterFactory.getSupportedProviders();

      expect(providers).toEqual(['anthropic', 'openai', 'ollama']);
    });
  });
});
