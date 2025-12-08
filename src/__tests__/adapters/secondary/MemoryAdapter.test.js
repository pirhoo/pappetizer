import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { MemoryAdapter } from '../../../adapters/secondary/MemoryAdapter.js';

describe('MemoryAdapter', () => {
  let memoryAdapter;
  let tempDir;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pappetizer-memory-test-'));

    // Create memory adapter with temp dir
    memoryAdapter = new MemoryAdapter(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getMemoryPath', () => {
    it('should return correct memory path', () => {
      const memoryPath = memoryAdapter.getMemoryPath();
      expect(memoryPath).toBe(path.join(tempDir, 'memory.json'));
    });
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

    it('should persist alias to memory file', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');

      // Read the file directly
      const content = await fs.readFile(memoryAdapter.getMemoryPath(), 'utf-8');
      const data = JSON.parse(content);
      expect(data.vendorAliases['amazon web service']).toBe('AWS');
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

  describe('initialize', () => {
    it('should load existing memory from file', async () => {
      // Write memory file directly
      const memoryData = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        vendorAliases: {
          'existing vendor': 'Existing Alias',
        },
      };
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'memory.json'),
        JSON.stringify(memoryData, null, 2),
      );

      // Create new adapter and initialize
      const newAdapter = new MemoryAdapter(tempDir);
      await newAdapter.initialize();

      expect(newAdapter.applyVendorAlias('existing vendor')).toBe('Existing Alias');
    });

    it('should handle missing memory file gracefully', async () => {
      const newAdapter = new MemoryAdapter(tempDir);
      await newAdapter.initialize();

      expect(newAdapter.getVendorAliases()).toEqual({});
    });
  });

  describe('persistence', () => {
    it('should persist multiple aliases', async () => {
      await memoryAdapter.recordVendorAlias('Amazon Web Service', 'AWS');
      await memoryAdapter.recordVendorAlias('Starbucks Corporation', 'Starbucks');
      await memoryAdapter.recordVendorAlias('McDonald\'s Restaurant', 'McDonalds');

      // Create new adapter from persisted file
      const newMemoryAdapter = new MemoryAdapter(tempDir);
      await newMemoryAdapter.initialize();

      expect(newMemoryAdapter.applyVendorAlias('Amazon Web Service')).toBe('AWS');
      expect(newMemoryAdapter.applyVendorAlias('Starbucks Corporation')).toBe('Starbucks');
      expect(newMemoryAdapter.applyVendorAlias('McDonald\'s Restaurant')).toBe('McDonalds');
    });

    it('should include version and lastUpdated in memory file', async () => {
      await memoryAdapter.recordVendorAlias('Amazon', 'AWS');

      const content = await fs.readFile(memoryAdapter.getMemoryPath(), 'utf-8');
      const data = JSON.parse(content);

      expect(data.version).toBe('1.0');
      expect(data.lastUpdated).toBeDefined();
      expect(new Date(data.lastUpdated)).toBeInstanceOf(Date);
    });

    it('should create state directory if it does not exist', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'path');
      const nestedAdapter = new MemoryAdapter(nestedDir);

      await nestedAdapter.recordVendorAlias('Test', 'Value');

      const exists = await fs.access(nestedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('XDG compliance', () => {
    it('should use XDG_STATE_HOME when set', () => {
      const originalEnv = process.env.XDG_STATE_HOME;
      process.env.XDG_STATE_HOME = '/custom/state';

      // Create adapter without custom dir to test default path
      const adapter = new MemoryAdapter();
      expect(adapter.stateDir).toBe('/custom/state/pappetizer');

      // Restore
      if (originalEnv) {
        process.env.XDG_STATE_HOME = originalEnv;
      } else {
        delete process.env.XDG_STATE_HOME;
      }
    });

    it('should fall back to ~/.local/state when XDG_STATE_HOME not set', () => {
      const originalEnv = process.env.XDG_STATE_HOME;
      delete process.env.XDG_STATE_HOME;

      const adapter = new MemoryAdapter();
      expect(adapter.stateDir).toBe(path.join(os.homedir(), '.local', 'state', 'pappetizer'));

      // Restore
      if (originalEnv) {
        process.env.XDG_STATE_HOME = originalEnv;
      }
    });
  });
});
