import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { MemoryAdapter } from '../adapters/secondary/MemoryAdapter.js';
import { ConfigurationAdapter } from '../adapters/secondary/ConfigurationAdapter.js';
import { Configuration } from '../domain/entities/Configuration.js';

describe('MemoryAdapter', () => {
  let memoryAdapter;
  let configAdapter;
  let configuration;
  let tempDir;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pappetizer-memory-test-'));

    // Create config adapter pointing to temp dir
    configAdapter = new ConfigurationAdapter(tempDir);

    // Create a fresh configuration
    configuration = Configuration.getDefaults();

    // Create memory adapter
    memoryAdapter = new MemoryAdapter(configAdapter, configuration);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('recordVendorAlias', () => {
    it('should record a vendor alias', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');

      const aliases = memoryAdapter.getVendorAliases();
      expect(aliases['amazon web service']).toBe('AWS');
    });

    it('should store aliases in lowercase for case-insensitive matching', async () => {
      await memoryAdapter.recordVendorAlias('AMAZON WEB SERVICE', 'AWS');

      const aliases = memoryAdapter.getVendorAliases();
      expect(aliases['amazon web service']).toBe('AWS');
    });

    it('should persist alias to config file', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');

      // Load config from file
      const loadedConfig = await configAdapter.load();
      expect(loadedConfig.vendorAliases['amazon web service']).toBe('AWS');
    });

    it('should not record if extracted equals corrected', async () => {
      await memoryAdapter.recordVendorAlias('AWS', 'AWS');

      const aliases = memoryAdapter.getVendorAliases();
      expect(Object.keys(aliases)).toHaveLength(0);
    });

    it('should not record if extracted is null or empty', async () => {
      await memoryAdapter.recordVendorAlias(null, 'AWS');
      await memoryAdapter.recordVendorAlias('', 'AWS');

      const aliases = memoryAdapter.getVendorAliases();
      expect(Object.keys(aliases)).toHaveLength(0);
    });

    it('should not record if corrected is null or empty', async () => {
      await memoryAdapter.recordVendorAlias('Amazon', null);
      await memoryAdapter.recordVendorAlias('Amazon', '');

      const aliases = memoryAdapter.getVendorAliases();
      expect(Object.keys(aliases)).toHaveLength(0);
    });

    it('should trim whitespace from vendor names', async () => {
      await memoryAdapter.recordVendorAlias('  Amazon Web Service  ', '  AWS  ');

      const aliases = memoryAdapter.getVendorAliases();
      expect(aliases['amazon web service']).toBe('AWS');
    });

    it('should overwrite existing alias', async () => {
      await memoryAdapter.recordVendorAlias('Amazon', 'AWS');
      await memoryAdapter.recordVendorAlias('Amazon', 'Amazon Web Services');

      const aliases = memoryAdapter.getVendorAliases();
      expect(aliases['amazon']).toBe('Amazon Web Services');
    });
  });

  describe('applyVendorAlias', () => {
    it('should return corrected vendor name when alias exists', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');

      const result = memoryAdapter.applyVendorAlias('Amazon Web Service');
      expect(result).toBe('AWS');
    });

    it('should be case-insensitive', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');

      expect(memoryAdapter.applyVendorAlias('amazon web service')).toBe('AWS');
      expect(memoryAdapter.applyVendorAlias('AMAZON WEB SERVICE')).toBe('AWS');
      expect(memoryAdapter.applyVendorAlias('Amazon Web Service')).toBe('AWS');
    });

    it('should return original vendor when no alias exists', () => {
      const result = memoryAdapter.applyVendorAlias('Unknown Vendor');
      expect(result).toBe('Unknown Vendor');
    });

    it('should return original vendor when input is null or empty', () => {
      expect(memoryAdapter.applyVendorAlias(null)).toBe(null);
      expect(memoryAdapter.applyVendorAlias('')).toBe('');
    });

    it('should handle whitespace in lookup', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');

      const result = memoryAdapter.applyVendorAlias('  Amazon Web Service  ');
      expect(result).toBe('AWS');
    });
  });

  describe('getVendorAliases', () => {
    it('should return empty object when no aliases', () => {
      const aliases = memoryAdapter.getVendorAliases();
      expect(aliases).toEqual({});
    });

    it('should return all aliases', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');
      await memoryAdapter.recordVendorAlias('McDonald\'s', 'McDonalds');

      const aliases = memoryAdapter.getVendorAliases();
      expect(aliases).toEqual({
        'amazon web service': 'AWS',
        'mcdonald\'s': 'McDonalds',
      });
    });

    it('should return a copy, not the original object', async () => {
      await memoryAdapter.recordVendorAlias('Amazon', 'AWS');

      const aliases = memoryAdapter.getVendorAliases();
      aliases['test'] = 'value';

      expect(memoryAdapter.getVendorAliases()['test']).toBeUndefined();
    });
  });

  describe('hasAliases', () => {
    it('should return false when no aliases', () => {
      expect(memoryAdapter.hasAliases()).toBe(false);
    });

    it('should return true when aliases exist', async () => {
      await memoryAdapter.recordVendorAlias('Amazon', 'AWS');
      expect(memoryAdapter.hasAliases()).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist multiple aliases', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');
      await memoryAdapter.recordVendorAlias('Starbucks Corporation', 'Starbucks');
      await memoryAdapter.recordVendorAlias('McDonald\'s Restaurant', 'McDonalds');

      // Create new adapter from persisted config
      const loadedConfig = await configAdapter.load();
      const newMemoryAdapter = new MemoryAdapter(configAdapter, loadedConfig);

      expect(newMemoryAdapter.applyVendorAlias('Amazon Web Service')).toBe('AWS');
      expect(newMemoryAdapter.applyVendorAlias('Starbucks Corporation')).toBe('Starbucks');
      expect(newMemoryAdapter.applyVendorAlias('McDonald\'s Restaurant')).toBe('McDonalds');
    });

    it('should work with existing vendorAliases in config', async () => {
      // Create config with pre-existing aliases
      const existingConfig = new Configuration({
        vendorAliases: {
          'existing vendor': 'Existing Alias',
        },
      });
      await configAdapter.save(existingConfig);

      // Load and create new memory adapter
      const loadedConfig = await configAdapter.load();
      const newMemoryAdapter = new MemoryAdapter(configAdapter, loadedConfig);

      // Should have existing alias
      expect(newMemoryAdapter.applyVendorAlias('existing vendor')).toBe('Existing Alias');

      // Should be able to add new alias
      await newMemoryAdapter.recordVendorAlias('New Vendor', 'New Alias');
      expect(newMemoryAdapter.applyVendorAlias('new vendor')).toBe('New Alias');

      // Both should be persisted
      const reloadedConfig = await configAdapter.load();
      expect(reloadedConfig.vendorAliases['existing vendor']).toBe('Existing Alias');
      expect(reloadedConfig.vendorAliases['new vendor']).toBe('New Alias');
    });
  });
});
