import { AnthropicAdapter } from './LlmAdapter.js';
import { OpenAiAdapter } from './OpenAiAdapter.js';
import { OllamaAdapter } from './OllamaAdapter.js';

/**
 * Default models for each provider
 */
const DEFAULT_MODELS = {
  anthropic: 'claude-3-haiku-20240307',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2',
};

/**
 * Factory for creating LLM adapters based on configuration
 */
export class LlmAdapterFactory {
  /**
   * Create an LLM adapter based on the provider configuration
   * @param {object} config - Configuration object
   * @param {string} config.provider - Provider name ('anthropic', 'openai', 'ollama')
   * @param {string} config.apiKey - API key (for anthropic/openai)
   * @param {string} config.host - Host URL (for ollama)
   * @param {string} config.model - Model name (optional, uses provider default)
   * @returns {import('../../domain/ports/LlmPort.js').LlmPort|null}
   */
  static create({ provider, apiKey, host, model }) {
    const effectiveModel = model || DEFAULT_MODELS[provider];

    switch (provider) {
    case 'anthropic':
      if (!apiKey) return null;
      return new AnthropicAdapter(apiKey, effectiveModel);

    case 'openai':
      if (!apiKey) return null;
      return new OpenAiAdapter(apiKey, effectiveModel);

    case 'ollama':
      return new OllamaAdapter(host || 'http://localhost:11434', effectiveModel);

    default:
      return null;
    }
  }

  /**
   * Create an LLM adapter from a Configuration entity
   * @param {import('../../domain/entities/Configuration.js').Configuration} configuration
   * @returns {import('../../domain/ports/LlmPort.js').LlmPort|null}
   */
  static fromConfiguration(configuration) {
    if (!configuration.useLlm) {
      return null;
    }

    const provider = configuration.llmProvider;

    let apiKey = null;
    if (provider === 'anthropic') {
      apiKey = configuration.anthropicApiKey;
    } else if (provider === 'openai') {
      apiKey = configuration.openaiApiKey;
    }

    return LlmAdapterFactory.create({
      provider,
      apiKey,
      host: configuration.ollamaHost,
      model: configuration.llmModel,
    });
  }

  /**
   * Get the default model for a provider
   * @param {string} provider
   * @returns {string}
   */
  static getDefaultModel(provider) {
    return DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;
  }

  /**
   * Get list of supported providers
   * @returns {string[]}
   */
  static getSupportedProviders() {
    return ['anthropic', 'openai', 'ollama'];
  }
}
