import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ManifestAdapter } from '../adapters/secondary/ManifestAdapter.js';

describe('ManifestAdapter', () => {
  let adapter;
  let tempDir;

  beforeEach(async () => {
    adapter = new ManifestAdapter();
    // Create a unique temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pappetizer-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getManifestPath', () => {
    it('should return correct manifest path for directory', () => {
      const manifestPath = adapter.getManifestPath('/some/directory');
      expect(manifestPath).toBe('/some/directory/.pappetizer.json');
    });

    it('should handle directory with trailing slash', () => {
      const manifestPath = adapter.getManifestPath('/some/directory/');
      expect(manifestPath).toBe('/some/directory/.pappetizer.json');
    });

    it('should handle current directory', () => {
      const manifestPath = adapter.getManifestPath('.');
      // path.join('.', '.pappetizer.json') returns '.pappetizer.json' not './.pappetizer.json'
      expect(manifestPath).toBe('.pappetizer.json');
    });

    it('should handle relative paths', () => {
      const manifestPath = adapter.getManifestPath('./receipts');
      expect(manifestPath).toBe('receipts/.pappetizer.json');
    });
  });

  describe('load', () => {
    it('should return empty map for non-existent manifest', async () => {
      const entries = await adapter.load(tempDir);
      expect(entries).toBeInstanceOf(Map);
      expect(entries.size).toBe(0);
    });

    it('should load manifest with entries', async () => {
      // Create a manifest file
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const manifestData = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        renames: [
          { originalName: 'receipt1.pdf', newName: '2024-01-15_Walmart_50.00_USD.pdf', renamedAt: new Date().toISOString() },
          { originalName: 'receipt2.jpg', newName: '2024-01-20_Target_25.00_USD.jpg', renamedAt: new Date().toISOString() },
        ],
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');

      const entries = await adapter.load(tempDir);

      expect(entries.size).toBe(2);
      expect(entries.has('receipt1.pdf')).toBe(true);
      expect(entries.has('receipt2.jpg')).toBe(true);
      expect(entries.get('receipt1.pdf').newName).toBe('2024-01-15_Walmart_50.00_USD.pdf');
    });

    it('should cache loaded manifest', async () => {
      // Create a manifest file
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'test.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      // Load twice
      const entries1 = await adapter.load(tempDir);
      const entries2 = await adapter.load(tempDir);

      // Should be the same cached instance
      expect(entries1).toBe(entries2);
    });

    it('should handle corrupted manifest gracefully', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, 'not valid json {{{', 'utf-8');

      const entries = await adapter.load(tempDir);

      // Should return empty map on parse error
      expect(entries).toBeInstanceOf(Map);
      expect(entries.size).toBe(0);
    });

    it('should handle manifest with missing renames array', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({ version: '1.0' }), 'utf-8');

      const entries = await adapter.load(tempDir);

      expect(entries.size).toBe(0);
    });

    it('should handle manifest with empty renames array', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [],
      }), 'utf-8');

      const entries = await adapter.load(tempDir);

      expect(entries.size).toBe(0);
    });

    it('should handle manifest with non-array renames', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: 'not-an-array',
      }), 'utf-8');

      const entries = await adapter.load(tempDir);

      expect(entries.size).toBe(0);
    });
  });

  describe('save', () => {
    it('should save manifest to file', async () => {
      const entries = new Map();
      entries.set('receipt.pdf', {
        originalName: 'receipt.pdf',
        newName: '2024-01-15_Store_50.00_USD.pdf',
        renamedAt: '2024-01-15T10:00:00.000Z',
      });

      await adapter.save(tempDir, entries);

      // Read the file and verify
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.version).toBe('1.0');
      expect(data.lastUpdated).toBeTruthy();
      expect(data.renames).toHaveLength(1);
      expect(data.renames[0].originalName).toBe('receipt.pdf');
      expect(data.renames[0].newName).toBe('2024-01-15_Store_50.00_USD.pdf');
    });

    it('should update cache after save', async () => {
      const entries = new Map();
      entries.set('test.pdf', { originalName: 'test.pdf', newName: 'renamed.pdf' });

      await adapter.save(tempDir, entries);

      // Load should return cached entries
      const loaded = await adapter.load(tempDir);
      expect(loaded).toBe(entries);
    });

    it('should save empty manifest', async () => {
      const entries = new Map();

      await adapter.save(tempDir, entries);

      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.renames).toEqual([]);
    });

    it('should preserve all entry metadata', async () => {
      const entries = new Map();
      entries.set('receipt.pdf', {
        originalName: 'receipt.pdf',
        newName: 'renamed.pdf',
        renamedAt: '2024-01-15T10:00:00.000Z',
        vendor: 'Walmart',
        amount: 50.00,
        currency: 'USD',
        customField: 'custom value',
      });

      await adapter.save(tempDir, entries);

      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.renames[0].vendor).toBe('Walmart');
      expect(data.renames[0].amount).toBe(50.00);
      expect(data.renames[0].customField).toBe('custom value');
    });
  });

  describe('hasBeenRenamed', () => {
    it('should return false for non-existent manifest', async () => {
      const result = await adapter.hasBeenRenamed(tempDir, 'receipt.pdf');
      expect(result).toBe(false);
    });

    it('should return false for file not in manifest', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'other.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      const result = await adapter.hasBeenRenamed(tempDir, 'receipt.pdf');
      expect(result).toBe(false);
    });

    it('should return true for file in manifest', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'receipt.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      const result = await adapter.hasBeenRenamed(tempDir, 'receipt.pdf');
      expect(result).toBe(true);
    });

    it('should be case-sensitive for filename matching', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'Receipt.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      // Exact match
      expect(await adapter.hasBeenRenamed(tempDir, 'Receipt.pdf')).toBe(true);
      // Different case - should not match
      expect(await adapter.hasBeenRenamed(tempDir, 'receipt.pdf')).toBe(false);
      expect(await adapter.hasBeenRenamed(tempDir, 'RECEIPT.pdf')).toBe(false);
    });
  });

  describe('isRenameResult', () => {
    it('should return false for non-existent manifest', async () => {
      const result = await adapter.isRenameResult(tempDir, 'renamed.pdf');
      expect(result).toBe(false);
    });

    it('should return false for file not in manifest as newName', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'receipt.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      const result = await adapter.isRenameResult(tempDir, 'other.pdf');
      expect(result).toBe(false);
    });

    it('should return true for file that is a newName in manifest', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'receipt.pdf', newName: '2024-01-15 - Walmart - 50.00 USD.pdf' }],
      }), 'utf-8');

      const result = await adapter.isRenameResult(tempDir, '2024-01-15 - Walmart - 50.00 USD.pdf');
      expect(result).toBe(true);
    });

    it('should return false for original name (not the rename result)', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'receipt.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      // Original name should not be considered a rename result
      const result = await adapter.isRenameResult(tempDir, 'receipt.pdf');
      expect(result).toBe(false);
    });

    it('should be case-sensitive for newName matching', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'receipt.pdf', newName: 'Renamed.pdf' }],
      }), 'utf-8');

      expect(await adapter.isRenameResult(tempDir, 'Renamed.pdf')).toBe(true);
      expect(await adapter.isRenameResult(tempDir, 'renamed.pdf')).toBe(false);
      expect(await adapter.isRenameResult(tempDir, 'RENAMED.pdf')).toBe(false);
    });

    it('should find newName among multiple entries', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [
          { originalName: 'receipt1.pdf', newName: 'renamed1.pdf' },
          { originalName: 'receipt2.pdf', newName: 'renamed2.pdf' },
          { originalName: 'receipt3.pdf', newName: 'renamed3.pdf' },
        ],
      }), 'utf-8');

      expect(await adapter.isRenameResult(tempDir, 'renamed1.pdf')).toBe(true);
      expect(await adapter.isRenameResult(tempDir, 'renamed2.pdf')).toBe(true);
      expect(await adapter.isRenameResult(tempDir, 'renamed3.pdf')).toBe(true);
      expect(await adapter.isRenameResult(tempDir, 'renamed4.pdf')).toBe(false);
    });

    it('should handle empty manifest', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [],
      }), 'utf-8');

      const result = await adapter.isRenameResult(tempDir, 'any.pdf');
      expect(result).toBe(false);
    });

    it('should handle special characters in newName', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'receipt.pdf', newName: '2024-01-15 - McDonald\'s - 10.00 USD.pdf' }],
      }), 'utf-8');

      const result = await adapter.isRenameResult(tempDir, '2024-01-15 - McDonald\'s - 10.00 USD.pdf');
      expect(result).toBe(true);
    });

    it('should handle unicode characters in newName', async () => {
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'receipt.pdf', newName: '2024-01-15 - Café Müller 日本 - 15.00 EUR.pdf' }],
      }), 'utf-8');

      const result = await adapter.isRenameResult(tempDir, '2024-01-15 - Café Müller 日本 - 15.00 EUR.pdf');
      expect(result).toBe(true);
    });
  });

  describe('addEntry', () => {
    it('should add entry to empty manifest', async () => {
      await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed.pdf', { vendor: 'Test' });

      const entries = await adapter.load(tempDir);
      expect(entries.size).toBe(1);
      expect(entries.has('receipt.pdf')).toBe(true);
      expect(entries.get('receipt.pdf').newName).toBe('renamed.pdf');
      expect(entries.get('receipt.pdf').vendor).toBe('Test');
    });

    it('should add entry to existing manifest', async () => {
      // Create initial manifest
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'existing.pdf', newName: 'renamed-existing.pdf' }],
      }), 'utf-8');

      // Clear cache to force reload
      adapter.clearCache();

      // Add new entry
      await adapter.addEntry(tempDir, 'new.pdf', 'renamed-new.pdf', {});

      const entries = await adapter.load(tempDir);
      expect(entries.size).toBe(2);
      expect(entries.has('existing.pdf')).toBe(true);
      expect(entries.has('new.pdf')).toBe(true);
    });

    it('should include renamedAt timestamp', async () => {
      const before = new Date().toISOString();
      await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed.pdf', {});
      const after = new Date().toISOString();

      const entries = await adapter.load(tempDir);
      const entry = entries.get('receipt.pdf');

      expect(entry.renamedAt).toBeTruthy();
      expect(entry.renamedAt >= before).toBe(true);
      expect(entry.renamedAt <= after).toBe(true);
    });

    it('should persist entry to file', async () => {
      await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed.pdf', { amount: 50 });

      // Read file directly
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.renames).toHaveLength(1);
      expect(data.renames[0].amount).toBe(50);
    });

    it('should handle metadata with nested objects', async () => {
      await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed.pdf', {
        vendor: 'Test',
        extractedData: {
          confidence: 0.95,
          source: 'ocr',
        },
      });

      const entries = await adapter.load(tempDir);
      const entry = entries.get('receipt.pdf');

      expect(entry.extractedData.confidence).toBe(0.95);
      expect(entry.extractedData.source).toBe('ocr');
    });

    it('should overwrite existing entry for same filename', async () => {
      // Add first entry
      await adapter.addEntry(tempDir, 'receipt.pdf', 'first-name.pdf', { version: 1 });

      // Add second entry for same file
      await adapter.addEntry(tempDir, 'receipt.pdf', 'second-name.pdf', { version: 2 });

      const entries = await adapter.load(tempDir);
      expect(entries.size).toBe(1);
      expect(entries.get('receipt.pdf').newName).toBe('second-name.pdf');
      expect(entries.get('receipt.pdf').version).toBe(2);
    });
  });

  describe('initialize', () => {
    it('should create manifest file if it does not exist', async () => {
      await adapter.initialize(tempDir);

      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const exists = await fs.access(manifestPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.version).toBe('1.0');
      expect(data.renames).toEqual([]);
    });

    it('should not overwrite existing manifest', async () => {
      // Create existing manifest
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'existing.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      // Initialize
      await adapter.initialize(tempDir);

      // Check existing data is preserved
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.renames).toHaveLength(1);
      expect(data.renames[0].originalName).toBe('existing.pdf');
    });

    it('should load existing manifest into cache', async () => {
      // Create existing manifest
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'test.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      // Initialize
      await adapter.initialize(tempDir);

      // Check cache is populated
      const entries = await adapter.load(tempDir);
      expect(entries.has('test.pdf')).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached entries', async () => {
      // Load a manifest to populate cache
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'test.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      await adapter.load(tempDir);
      expect(adapter.cache.size).toBeGreaterThan(0);

      adapter.clearCache();
      expect(adapter.cache.size).toBe(0);
    });

    it('should force reload from file on next load', async () => {
      // Create initial manifest
      const manifestPath = path.join(tempDir, '.pappetizer.json');
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'old.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      // Load to cache
      await adapter.load(tempDir);

      // Modify file directly (simulating external change)
      await fs.writeFile(manifestPath, JSON.stringify({
        version: '1.0',
        renames: [{ originalName: 'new.pdf', newName: 'renamed.pdf' }],
      }), 'utf-8');

      // Without clear, should still return cached data
      const cachedEntries = await adapter.load(tempDir);
      expect(cachedEntries.has('old.pdf')).toBe(true);

      // Clear and reload
      adapter.clearCache();
      const freshEntries = await adapter.load(tempDir);
      expect(freshEntries.has('new.pdf')).toBe(true);
      expect(freshEntries.has('old.pdf')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in filenames', async () => {
      await adapter.addEntry(tempDir, 'receipt (1).pdf', 'renamed.pdf', {});
      await adapter.addEntry(tempDir, "file's name.jpg", 'renamed2.jpg', {});
      await adapter.addEntry(tempDir, 'file with spaces.png', 'renamed3.png', {});

      const entries = await adapter.load(tempDir);
      expect(entries.has('receipt (1).pdf')).toBe(true);
      expect(entries.has("file's name.jpg")).toBe(true);
      expect(entries.has('file with spaces.png')).toBe(true);
    });

    it('should handle unicode filenames', async () => {
      await adapter.addEntry(tempDir, 'réceipt_日本語.pdf', 'renamed.pdf', {});

      const entries = await adapter.load(tempDir);
      expect(entries.has('réceipt_日本語.pdf')).toBe(true);
    });

    it('should handle very long metadata values', async () => {
      const longValue = 'A'.repeat(10000);
      await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed.pdf', {
        longField: longValue,
      });

      const entries = await adapter.load(tempDir);
      expect(entries.get('receipt.pdf').longField).toBe(longValue);
    });

    it('should handle multiple directories independently', async () => {
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'pappetizer-test2-'));

      try {
        await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed1.pdf', {});
        await adapter.addEntry(tempDir2, 'receipt.pdf', 'renamed2.pdf', {});

        const entries1 = await adapter.load(tempDir);
        const entries2 = await adapter.load(tempDir2);

        expect(entries1.get('receipt.pdf').newName).toBe('renamed1.pdf');
        expect(entries2.get('receipt.pdf').newName).toBe('renamed2.pdf');
      } finally {
        await fs.rm(tempDir2, { recursive: true, force: true });
      }
    });

    it('should handle sequential operations', async () => {
      // Add multiple entries sequentially (parallel writes have race conditions with current implementation)
      for (let i = 0; i < 10; i++) {
        await adapter.addEntry(tempDir, `receipt${i}.pdf`, `renamed${i}.pdf`, { index: i });
      }

      const entries = await adapter.load(tempDir);
      expect(entries.size).toBe(10);
    });
  });

  describe('file format', () => {
    it('should write pretty-printed JSON', async () => {
      await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed.pdf', {});

      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const content = await fs.readFile(manifestPath, 'utf-8');

      // Should be formatted with 2-space indentation
      expect(content).toContain('\n');
      expect(content.includes('  ')).toBe(true);
    });

    it('should include version in manifest', async () => {
      await adapter.initialize(tempDir);

      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.version).toBe('1.0');
    });

    it('should include lastUpdated timestamp in manifest', async () => {
      const before = new Date().toISOString();
      await adapter.addEntry(tempDir, 'receipt.pdf', 'renamed.pdf', {});
      const after = new Date().toISOString();

      const manifestPath = path.join(tempDir, '.pappetizer.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data.lastUpdated).toBeTruthy();
      expect(data.lastUpdated >= before).toBe(true);
      expect(data.lastUpdated <= after).toBe(true);
    });
  });
});
