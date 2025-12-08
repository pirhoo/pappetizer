import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ConfigurationAdapter } from '../../../adapters/secondary/ConfigurationAdapter.js';
import { Configuration } from '../../../domain/entities/Configuration.js';

describe('ConfigurationAdapter', () => {
  let adapter;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pappetizer-config-test-'));
    adapter = new ConfigurationAdapter(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getConfigPath', () => {
    it('should return path in config directory', () => {
      const configPath = adapter.getConfigPath();
      expect(configPath).toBe(path.join(tempDir, 'config.json'));
    });

    it('should use XDG_CONFIG_HOME by default', () => {
      const defaultAdapter = new ConfigurationAdapter();
      const configPath = defaultAdapter.getConfigPath();

      const expectedDir = process.env.XDG_CONFIG_HOME
        || path.join(os.homedir(), '.config');
      expect(configPath).toBe(path.join(expectedDir, 'pappetizer', 'config.json'));
    });
  });

  describe('ensureConfigDir', () => {
    it('should create config directory', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'config');
      const nestedAdapter = new ConfigurationAdapter(nestedDir);

      await nestedAdapter.ensureConfigDir();

      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw if directory exists', async () => {
      await adapter.ensureConfigDir();
      await expect(adapter.ensureConfigDir()).resolves.not.toThrow();
    });
  });

  describe('load', () => {
    it('should return null when config does not exist', async () => {
      const result = await adapter.load();
      expect(result).toBeNull();
    });

    it('should load configuration from file', async () => {
      const configPath = adapter.getConfigPath();
      const configData = {
        dateFormat: 'DD-MM-YYYY',
        nameSeparator: '_',
        defaultCurrency: 'EUR',
      };
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(configData), 'utf-8');

      const result = await adapter.load();

      expect(result).toBeInstanceOf(Configuration);
      expect(result.dateFormat).toBe('DD-MM-YYYY');
      expect(result.nameSeparator).toBe('_');
      expect(result.defaultCurrency).toBe('EUR');
    });

    it('should throw on corrupted JSON', async () => {
      const configPath = adapter.getConfigPath();
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(configPath, 'not valid json {{{', 'utf-8');

      await expect(adapter.load()).rejects.toThrow('Failed to load configuration');
    });

    it('should merge with defaults for partial config', async () => {
      const configPath = adapter.getConfigPath();
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify({ dateFormat: 'DD-MM-YYYY' }), 'utf-8');

      const result = await adapter.load();

      expect(result.dateFormat).toBe('DD-MM-YYYY');
      // Other fields should have defaults
      expect(result.nameSeparator).toBe(' - ');
    });
  });

  describe('save', () => {
    it('should save configuration to file', async () => {
      const config = new Configuration({
        dateFormat: 'DD-MM-YYYY',
        nameSeparator: '_',
        defaultCurrency: 'EUR',
      });

      await adapter.save(config);

      const configPath = adapter.getConfigPath();
      const content = await fs.readFile(configPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.dateFormat).toBe('DD-MM-YYYY');
      expect(data.nameSeparator).toBe('_');
    });

    it('should create directory if it does not exist', async () => {
      const nestedDir = path.join(tempDir, 'new', 'nested');
      const nestedAdapter = new ConfigurationAdapter(nestedDir);
      const config = Configuration.getDefaults();

      await nestedAdapter.save(config);

      const configPath = nestedAdapter.getConfigPath();
      await expect(fs.access(configPath)).resolves.not.toThrow();
    });

    it('should throw on invalid configuration', async () => {
      const invalidConfig = new Configuration({
        dateFormat: 'INVALID',
      });

      await expect(adapter.save(invalidConfig)).rejects.toThrow('Invalid configuration');
    });

    it('should write pretty-printed JSON', async () => {
      const config = Configuration.getDefaults();

      await adapter.save(config);

      const configPath = adapter.getConfigPath();
      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  '); // 2-space indentation
    });

    it('should overwrite existing config', async () => {
      const configPath = adapter.getConfigPath();
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify({ dateFormat: 'OLD' }), 'utf-8');

      const newConfig = new Configuration({ dateFormat: 'YYYYMMDD' });
      await adapter.save(newConfig);

      const content = await fs.readFile(configPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.dateFormat).toBe('YYYYMMDD');
    });
  });

  describe('exists', () => {
    it('should return false when config does not exist', async () => {
      const result = await adapter.exists();
      expect(result).toBe(false);
    });

    it('should return true when config exists', async () => {
      const configPath = adapter.getConfigPath();
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(configPath, '{}', 'utf-8');

      const result = await adapter.exists();
      expect(result).toBe(true);
    });
  });

  describe('loadOrDefault', () => {
    it('should return defaults when config does not exist', async () => {
      const result = await adapter.loadOrDefault();

      expect(result).toBeInstanceOf(Configuration);
      expect(result.dateFormat).toBe('YYYYMMDD');
      expect(result.nameSeparator).toBe(' - ');
    });

    it('should return loaded config when exists', async () => {
      const configPath = adapter.getConfigPath();
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify({ dateFormat: 'DD-MM-YYYY' }), 'utf-8');

      const result = await adapter.loadOrDefault();

      expect(result.dateFormat).toBe('DD-MM-YYYY');
    });
  });

  describe('persistence', () => {
    it('should round-trip configuration', async () => {
      const original = new Configuration({
        dateFormat: 'DD-MM-YYYY',
        nameSeparator: ' - ',
        nameTemplate: '{date}{sep}{vendor}{sep}{amount} {currency}{ext}',
        defaultCurrency: 'EUR',
        dateLocale: 'eu',
        autoAcceptAll: true,
        supportedExtensions: ['.pdf', '.png'],
        ocrLanguage: 'deu',
        minFileSize: 2000,
        skipDirectories: ['node_modules'],
        recursive: true,
        dryRun: true,
        minConfidence: 0.75,
        useLlm: true,
        llmProvider: 'openai',
        anthropicApiKey: 'key1',
        openaiApiKey: 'key2',
        ollamaHost: 'http://localhost:11434',
        llmModel: 'gpt-4',
      });

      await adapter.save(original);
      const loaded = await adapter.load();

      expect(loaded.dateFormat).toBe(original.dateFormat);
      expect(loaded.nameSeparator).toBe(original.nameSeparator);
      expect(loaded.nameTemplate).toBe(original.nameTemplate);
      expect(loaded.defaultCurrency).toBe(original.defaultCurrency);
      expect(loaded.dateLocale).toBe(original.dateLocale);
      expect(loaded.autoAcceptAll).toBe(original.autoAcceptAll);
      expect(loaded.supportedExtensions).toEqual(original.supportedExtensions);
      expect(loaded.ocrLanguage).toBe(original.ocrLanguage);
      expect(loaded.minFileSize).toBe(original.minFileSize);
      expect(loaded.recursive).toBe(original.recursive);
      expect(loaded.dryRun).toBe(original.dryRun);
      expect(loaded.minConfidence).toBe(original.minConfidence);
      expect(loaded.useLlm).toBe(original.useLlm);
      expect(loaded.llmProvider).toBe(original.llmProvider);
      expect(loaded.anthropicApiKey).toBe(original.anthropicApiKey);
      expect(loaded.openaiApiKey).toBe(original.openaiApiKey);
      expect(loaded.ollamaHost).toBe(original.ollamaHost);
      expect(loaded.llmModel).toBe(original.llmModel);
    });

    it('should handle special characters in separator', async () => {
      const config = new Configuration({
        nameSeparator: ' → ',
      });

      await adapter.save(config);
      const loaded = await adapter.load();

      expect(loaded.nameSeparator).toBe(' → ');
    });

    it('should handle unicode in skip directories', async () => {
      const config = new Configuration({
        skipDirectories: ['日本語フォルダ', "McDonald's receipts"],
      });

      await adapter.save(config);
      const loaded = await adapter.load();

      expect(loaded.skipDirectories).toContain('日本語フォルダ');
      expect(loaded.skipDirectories).toContain("McDonald's receipts");
    });
  });
});
