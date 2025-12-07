import { jest } from '@jest/globals';
import { RestoreUseCase } from '../application/RestoreUseCase.js';

describe('RestoreUseCase', () => {
  let useCase;
  let mockFileSystem;
  let mockManifest;
  let mockUserPrompt;

  beforeEach(() => {
    mockFileSystem = {
      exists: jest.fn(),
      renameFile: jest.fn(),
      joinPath: jest.fn((...segments) => segments.join('/')),
      getDirname: jest.fn((p) => p.split('/').slice(0, -1).join('/') || '.'),
      getBasename: jest.fn((p) => p.split('/').pop()),
      walkDirectory: jest.fn(),
    };

    mockManifest = {
      getAllEntries: jest.fn(),
      removeEntry: jest.fn(),
    };

    mockUserPrompt = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      dim: jest.fn(),
      restored: jest.fn(),
      confirmRestore: jest.fn(),
    };

    useCase = new RestoreUseCase({
      fileSystemAdapter: mockFileSystem,
      manifestAdapter: mockManifest,
      userPromptAdapter: mockUserPrompt,
    });
  });

  describe('execute', () => {
    it('should return empty stats for empty manifest', async () => {
      mockManifest.getAllEntries.mockResolvedValue([]);

      const result = await useCase.execute('/test/dir');

      expect(result).toEqual({ restored: 0, skipped: 0, errors: [] });
    });

    it('should restore files when auto-accept is enabled', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: '2024-01-15 - Store - 50.00 USD.pdf' },
      ]);
      mockFileSystem.exists
        .mockResolvedValueOnce(true)  // newPath exists
        .mockResolvedValueOnce(false); // originalPath does not exist
      mockFileSystem.renameFile.mockResolvedValue();
      mockManifest.removeEntry.mockResolvedValue();

      const result = await useCase.execute('/test/dir', { yes: true });

      expect(result.restored).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockFileSystem.renameFile).toHaveBeenCalled();
      expect(mockManifest.removeEntry).toHaveBeenCalled();
      expect(mockUserPrompt.restored).toHaveBeenCalled();
    });

    it('should skip files when renamed file does not exist', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists.mockResolvedValue(false); // newPath doesn't exist

      const result = await useCase.execute('/test/dir', { yes: true });

      expect(result.skipped).toBe(1);
      expect(mockManifest.removeEntry).toHaveBeenCalledWith('/test/dir', 'receipt.pdf');
      expect(mockUserPrompt.dim).toHaveBeenCalled();
    });

    it('should skip files when original name already exists', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists
        .mockResolvedValueOnce(true)  // newPath exists
        .mockResolvedValueOnce(true); // originalPath also exists

      const result = await useCase.execute('/test/dir', { yes: true });

      expect(result.skipped).toBe(1);
      expect(mockUserPrompt.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot restore'),
      );
    });

    it('should prompt for confirmation when yes is false', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockUserPrompt.confirmRestore.mockResolvedValue(true);
      mockFileSystem.renameFile.mockResolvedValue();
      mockManifest.removeEntry.mockResolvedValue();

      const result = await useCase.execute('/test/dir', { yes: false });

      expect(mockUserPrompt.confirmRestore).toHaveBeenCalledWith('renamed.pdf', 'receipt.pdf');
      expect(result.restored).toBe(1);
    });

    it('should skip when user declines confirmation', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockUserPrompt.confirmRestore.mockResolvedValue(false);

      const result = await useCase.execute('/test/dir', { yes: false });

      expect(result.skipped).toBe(1);
      expect(mockFileSystem.renameFile).not.toHaveBeenCalled();
    });

    it('should not rename files in dry run mode', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await useCase.execute('/test/dir', { yes: true, dryRun: true });

      expect(result.restored).toBe(1);
      expect(mockFileSystem.renameFile).not.toHaveBeenCalled();
      expect(mockManifest.removeEntry).not.toHaveBeenCalled();
      expect(mockUserPrompt.restored).toHaveBeenCalledWith('renamed.pdf', 'receipt.pdf', true);
    });

    it('should handle rename errors gracefully', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockFileSystem.renameFile.mockRejectedValue(new Error('Permission denied'));

      const result = await useCase.execute('/test/dir', { yes: true });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Permission denied');
      expect(mockUserPrompt.error).toHaveBeenCalled();
    });

    it('should process multiple files', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt1.pdf', newName: 'renamed1.pdf' },
        { originalName: 'receipt2.pdf', newName: 'renamed2.pdf' },
        { originalName: 'receipt3.pdf', newName: 'renamed3.pdf' },
      ]);
      mockFileSystem.exists.mockResolvedValue(true).mockResolvedValue(false);
      // Alternate between exists(true) for newPath and exists(false) for originalPath
      mockFileSystem.exists
        .mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mockFileSystem.renameFile.mockResolvedValue();
      mockManifest.removeEntry.mockResolvedValue();

      const result = await useCase.execute('/test/dir', { yes: true });

      expect(result.restored).toBe(3);
      expect(mockFileSystem.renameFile).toHaveBeenCalledTimes(3);
    });

    it('should handle recursive option', async () => {
      const mockWalkResults = [
        { path: '/test/dir/subdir1', isDirectory: true },
        { path: '/test/dir/subdir2', isDirectory: true },
      ];
      mockFileSystem.walkDirectory.mockResolvedValue(mockWalkResults);
      mockManifest.getAllEntries.mockResolvedValue([]);

      await useCase.execute('/test/dir', { recursive: true });

      expect(mockFileSystem.walkDirectory).toHaveBeenCalledWith('/test/dir', { recursive: true });
      // Should process main dir + 2 subdirs = 3 total
      expect(mockManifest.getAllEntries).toHaveBeenCalledTimes(3);
    });
  });

  describe('restoreDirectory', () => {
    it('should return empty stats when manifest is empty', async () => {
      mockManifest.getAllEntries.mockResolvedValue([]);

      const result = await useCase.restoreDirectory('/test/dir');

      expect(result).toEqual({ restored: 0, skipped: 0, errors: [] });
    });

    it('should log directory being processed', async () => {
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockUserPrompt.confirmRestore.mockResolvedValue(false);

      await useCase.restoreDirectory('/test/dir');

      expect(mockUserPrompt.log).toHaveBeenCalledWith(expect.stringContaining('/test/dir'));
    });
  });

  describe('restoreFile', () => {
    it('should return error when file is not in manifest', async () => {
      mockFileSystem.getDirname.mockReturnValue('/test/dir');
      mockFileSystem.getBasename.mockReturnValue('unknown.pdf');
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'other.pdf', newName: 'renamed-other.pdf' },
      ]);

      const result = await useCase.restoreFile('/test/dir/unknown.pdf');

      expect(result.restored).toBe(false);
      expect(result.error).toContain('not in the manifest');
    });

    it('should return error when original name already exists', async () => {
      mockFileSystem.getDirname.mockReturnValue('/test/dir');
      mockFileSystem.getBasename.mockReturnValue('renamed.pdf');
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists.mockResolvedValue(true);

      const result = await useCase.restoreFile('/test/dir/renamed.pdf');

      expect(result.restored).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should restore file successfully', async () => {
      mockFileSystem.getDirname.mockReturnValue('/test/dir');
      mockFileSystem.getBasename.mockReturnValue('renamed.pdf');
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists.mockResolvedValue(false);
      mockFileSystem.renameFile.mockResolvedValue();
      mockManifest.removeEntry.mockResolvedValue();

      const result = await useCase.restoreFile('/test/dir/renamed.pdf', { yes: true });

      expect(result.restored).toBe(true);
      expect(result.error).toBeNull();
      expect(mockFileSystem.renameFile).toHaveBeenCalledWith(
        '/test/dir/renamed.pdf',
        '/test/dir/receipt.pdf',
      );
    });

    it('should not rename in dry run mode', async () => {
      mockFileSystem.getDirname.mockReturnValue('/test/dir');
      mockFileSystem.getBasename.mockReturnValue('renamed.pdf');
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await useCase.restoreFile('/test/dir/renamed.pdf', {
        yes: true,
        dryRun: true,
      });

      expect(result.restored).toBe(true);
      expect(mockFileSystem.renameFile).not.toHaveBeenCalled();
      expect(mockManifest.removeEntry).not.toHaveBeenCalled();
    });

    it('should return not restored when user declines', async () => {
      mockFileSystem.getDirname.mockReturnValue('/test/dir');
      mockFileSystem.getBasename.mockReturnValue('renamed.pdf');
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists.mockResolvedValue(false);
      mockUserPrompt.confirmRestore.mockResolvedValue(false);

      const result = await useCase.restoreFile('/test/dir/renamed.pdf', { yes: false });

      expect(result.restored).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should handle rename errors', async () => {
      mockFileSystem.getDirname.mockReturnValue('/test/dir');
      mockFileSystem.getBasename.mockReturnValue('renamed.pdf');
      mockManifest.getAllEntries.mockResolvedValue([
        { originalName: 'receipt.pdf', newName: 'renamed.pdf' },
      ]);
      mockFileSystem.exists.mockResolvedValue(false);
      mockFileSystem.renameFile.mockRejectedValue(new Error('Disk full'));

      const result = await useCase.restoreFile('/test/dir/renamed.pdf', { yes: true });

      expect(result.restored).toBe(false);
      expect(result.error).toContain('Disk full');
    });
  });
});
