import { jest } from '@jest/globals';
import { ConfigureUseCase } from '../../application/ConfigureUseCase.js';
import { Configuration } from '../../domain/entities/Configuration.js';

describe('ConfigureUseCase', () => {
  let useCase;
  let mockConfigAdapter;
  let mockPromptAdapter;

  beforeEach(() => {
    mockConfigAdapter = {
      loadOrDefault: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      getConfigPath: jest.fn().mockReturnValue('/home/user/.config/pappetizer/config.json'),
    };

    mockPromptAdapter = {
      log: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      promptConfiguration: jest.fn(),
    };

    useCase = new ConfigureUseCase({
      configAdapter: mockConfigAdapter,
      promptAdapter: mockPromptAdapter,
    });
  });

  describe('execute', () => {
    const defaultAnswers = {
      dateFormat: 'YYYYMMDD',
      nameSeparator: ' - ',
      nameTemplate: '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',
      defaultCurrency: 'USD',
      dateLocale: 'us',
      autoAcceptAll: false,
      supportedExtensions: '.pdf,.jpg,.jpeg,.png',
      ocrLanguage: 'eng',
      minFileSize: '1000',
      recursive: false,
      dryRun: false,
      useLlm: false,
      llmProvider: 'anthropic',
    };

    it('should create configuration from user answers', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue(defaultAnswers);
      mockConfigAdapter.save.mockResolvedValue();

      const result = await useCase.execute();

      expect(result).toBeInstanceOf(Configuration);
      expect(result.dateFormat).toBe('YYYYMMDD');
      expect(result.nameSeparator).toBe(' - ');
    });

    it('should show message when existing config is found', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(true);
      mockPromptAdapter.promptConfiguration.mockResolvedValue(defaultAnswers);
      mockConfigAdapter.save.mockResolvedValue();

      await useCase.execute();

      expect(mockPromptAdapter.log).toHaveBeenCalledWith(
        expect.stringContaining('Existing configuration found'),
      );
    });

    it('should show message when no config exists', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue(defaultAnswers);
      mockConfigAdapter.save.mockResolvedValue();

      await useCase.execute();

      expect(mockPromptAdapter.log).toHaveBeenCalledWith(
        expect.stringContaining('No existing configuration'),
      );
    });

    it('should preserve existing API keys when not provided', async () => {
      const existingConfig = new Configuration({
        ...Configuration.getDefaults(),
        anthropicApiKey: 'existing-key',
        openaiApiKey: 'existing-openai-key',
        ollamaHost: 'http://custom:11434',
      });
      mockConfigAdapter.loadOrDefault.mockResolvedValue(existingConfig);
      mockConfigAdapter.exists.mockResolvedValue(true);
      mockPromptAdapter.promptConfiguration.mockResolvedValue({
        ...defaultAnswers,
        anthropicApiKey: '', // Empty = keep existing
        openaiApiKey: '',
        ollamaHost: '',
      });
      mockConfigAdapter.save.mockResolvedValue();

      const result = await useCase.execute();

      expect(result.anthropicApiKey).toBe('existing-key');
      expect(result.openaiApiKey).toBe('existing-openai-key');
      expect(result.ollamaHost).toBe('http://custom:11434');
    });

    it('should update API keys when provided', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue({
        ...defaultAnswers,
        anthropicApiKey: 'new-anthropic-key',
        openaiApiKey: 'new-openai-key',
        ollamaHost: 'http://newhost:11434',
      });
      mockConfigAdapter.save.mockResolvedValue();

      const result = await useCase.execute();

      expect(result.anthropicApiKey).toBe('new-anthropic-key');
      expect(result.openaiApiKey).toBe('new-openai-key');
      expect(result.ollamaHost).toBe('http://newhost:11434');
    });

    it('should preserve LLM model when provider unchanged', async () => {
      const existingConfig = new Configuration({
        ...Configuration.getDefaults(),
        llmProvider: 'anthropic',
        llmModel: 'claude-3-5-sonnet-20241022',
      });
      mockConfigAdapter.loadOrDefault.mockResolvedValue(existingConfig);
      mockConfigAdapter.exists.mockResolvedValue(true);
      mockPromptAdapter.promptConfiguration.mockResolvedValue({
        ...defaultAnswers,
        llmProvider: 'anthropic', // Same provider
        llmModel: '', // No new model specified
      });
      mockConfigAdapter.save.mockResolvedValue();

      const result = await useCase.execute();

      expect(result.llmModel).toBe('claude-3-5-sonnet-20241022');
    });

    it('should clear LLM model when provider changes', async () => {
      const existingConfig = new Configuration({
        ...Configuration.getDefaults(),
        llmProvider: 'anthropic',
        llmModel: 'claude-3-5-sonnet-20241022',
      });
      mockConfigAdapter.loadOrDefault.mockResolvedValue(existingConfig);
      mockConfigAdapter.exists.mockResolvedValue(true);
      mockPromptAdapter.promptConfiguration.mockResolvedValue({
        ...defaultAnswers,
        llmProvider: 'openai', // Different provider
        llmModel: '', // No new model
      });
      mockConfigAdapter.save.mockResolvedValue();

      const result = await useCase.execute();

      expect(result.llmModel).toBeNull();
    });

    it('should use new model when explicitly provided', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue({
        ...defaultAnswers,
        llmProvider: 'openai',
        llmModel: 'gpt-4-turbo',
      });
      mockConfigAdapter.save.mockResolvedValue();

      const result = await useCase.execute();

      expect(result.llmModel).toBe('gpt-4-turbo');
    });

    it('should save configuration', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue(defaultAnswers);
      mockConfigAdapter.save.mockResolvedValue();

      await useCase.execute();

      expect(mockConfigAdapter.save).toHaveBeenCalledWith(expect.any(Configuration));
    });

    it('should show success message after saving', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue(defaultAnswers);
      mockConfigAdapter.save.mockResolvedValue();

      await useCase.execute();

      expect(mockPromptAdapter.success).toHaveBeenCalledWith(
        expect.stringContaining('Configuration saved'),
      );
    });

    it('should throw on invalid configuration', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue({
        ...defaultAnswers,
        dateFormat: 'INVALID-FORMAT', // Invalid format
      });

      await expect(useCase.execute()).rejects.toThrow('Invalid configuration');
      expect(mockPromptAdapter.error).toHaveBeenCalled();
    });

    it('should uppercase currency', async () => {
      mockConfigAdapter.loadOrDefault.mockResolvedValue(Configuration.getDefaults());
      mockConfigAdapter.exists.mockResolvedValue(false);
      mockPromptAdapter.promptConfiguration.mockResolvedValue({
        ...defaultAnswers,
        defaultCurrency: 'eur',
      });
      mockConfigAdapter.save.mockResolvedValue();

      const result = await useCase.execute();

      expect(result.defaultCurrency).toBe('EUR');
    });
  });

  describe('parseExtensions', () => {
    it('should return array input as-is', () => {
      const result = useCase.parseExtensions(['.pdf', '.jpg']);
      expect(result).toEqual(['.pdf', '.jpg']);
    });

    it('should parse comma-separated string', () => {
      const result = useCase.parseExtensions('.pdf, .jpg, .png');
      expect(result).toEqual(['.pdf', '.jpg', '.png']);
    });

    it('should add dot prefix if missing', () => {
      const result = useCase.parseExtensions('pdf, jpg');
      expect(result).toEqual(['.pdf', '.jpg']);
    });

    it('should lowercase extensions', () => {
      const result = useCase.parseExtensions('.PDF, .JPG');
      expect(result).toEqual(['.pdf', '.jpg']);
    });

    it('should filter empty strings', () => {
      const result = useCase.parseExtensions('.pdf, , .jpg, ');
      expect(result).toEqual(['.pdf', '.jpg']);
    });

    it('should handle mixed formats', () => {
      const result = useCase.parseExtensions('PDF, .jpg, JPEG');
      expect(result).toEqual(['.pdf', '.jpg', '.jpeg']);
    });
  });

  describe('parseList', () => {
    it('should return array input as-is', () => {
      const result = useCase.parseList(['item1', 'item2']);
      expect(result).toEqual(['item1', 'item2']);
    });

    it('should parse comma-separated string', () => {
      const result = useCase.parseList('item1, item2, item3');
      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should trim whitespace', () => {
      const result = useCase.parseList('  item1  ,  item2  ');
      expect(result).toEqual(['item1', 'item2']);
    });

    it('should filter empty strings', () => {
      const result = useCase.parseList('item1, , item2, ');
      expect(result).toEqual(['item1', 'item2']);
    });
  });
});
