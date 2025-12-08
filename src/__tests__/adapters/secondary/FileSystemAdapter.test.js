import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileSystemAdapter } from '../../../adapters/secondary/FileSystemAdapter.js';

describe('FileSystemAdapter', () => {
  let adapter;
  let tempDir;

  beforeEach(async () => {
    adapter = new FileSystemAdapter();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pappetizer-fs-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('walkDirectory', () => {
    it('should yield files in directory', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.pdf'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.jpg'), 'content2');

      const files = [];
      for await (const file of adapter.walkDirectory(tempDir)) {
        files.push(file);
      }

      expect(files).toHaveLength(2);
      expect(files.some(f => f.endsWith('file1.pdf'))).toBe(true);
      expect(files.some(f => f.endsWith('file2.jpg'))).toBe(true);
    });

    it('should skip hidden files', async () => {
      await fs.writeFile(path.join(tempDir, 'visible.pdf'), 'content');
      await fs.writeFile(path.join(tempDir, '.hidden.pdf'), 'content');

      const files = [];
      for await (const file of adapter.walkDirectory(tempDir)) {
        files.push(file);
      }

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('visible.pdf');
    });

    it('should skip hidden directories', async () => {
      const hiddenDir = path.join(tempDir, '.hidden');
      await fs.mkdir(hiddenDir);
      await fs.writeFile(path.join(hiddenDir, 'file.pdf'), 'content');
      await fs.writeFile(path.join(tempDir, 'visible.pdf'), 'content');

      const files = [];
      for await (const file of adapter.walkDirectory(tempDir, { recursive: true })) {
        files.push(file);
      }

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('visible.pdf');
    });

    it('should not recurse by default', async () => {
      const subDir = path.join(tempDir, 'subdir');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(tempDir, 'file1.pdf'), 'content');
      await fs.writeFile(path.join(subDir, 'file2.pdf'), 'content');

      const files = [];
      for await (const file of adapter.walkDirectory(tempDir)) {
        files.push(file);
      }

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('file1.pdf');
    });

    it('should recurse when option is set', async () => {
      const subDir = path.join(tempDir, 'subdir');
      await fs.mkdir(subDir);
      await fs.writeFile(path.join(tempDir, 'file1.pdf'), 'content');
      await fs.writeFile(path.join(subDir, 'file2.pdf'), 'content');

      const files = [];
      for await (const file of adapter.walkDirectory(tempDir, { recursive: true })) {
        files.push(file);
      }

      expect(files).toHaveLength(2);
    });

    it('should recurse into nested directories', async () => {
      const subDir1 = path.join(tempDir, 'level1');
      const subDir2 = path.join(subDir1, 'level2');
      await fs.mkdir(subDir1);
      await fs.mkdir(subDir2);
      await fs.writeFile(path.join(tempDir, 'root.pdf'), 'content');
      await fs.writeFile(path.join(subDir1, 'level1.pdf'), 'content');
      await fs.writeFile(path.join(subDir2, 'level2.pdf'), 'content');

      const files = [];
      for await (const file of adapter.walkDirectory(tempDir, { recursive: true })) {
        files.push(file);
      }

      expect(files).toHaveLength(3);
    });

    it('should return absolute paths', async () => {
      await fs.writeFile(path.join(tempDir, 'file.pdf'), 'content');

      const files = [];
      for await (const file of adapter.walkDirectory(tempDir)) {
        files.push(file);
      }

      expect(path.isAbsolute(files[0])).toBe(true);
    });

    it('should handle empty directory', async () => {
      const files = [];
      for await (const file of adapter.walkDirectory(tempDir)) {
        files.push(file);
      }

      expect(files).toHaveLength(0);
    });
  });

  describe('readFile', () => {
    it('should read file contents as buffer', async () => {
      const content = 'Test file content';
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, content);

      const result = await adapter.readFile(filePath);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe(content);
    });

    it('should read binary files', async () => {
      const binaryContent = Buffer.from([0x00, 0xFF, 0x50, 0x44, 0x46]);
      const filePath = path.join(tempDir, 'binary.bin');
      await fs.writeFile(filePath, binaryContent);

      const result = await adapter.readFile(filePath);

      expect(result.equals(binaryContent)).toBe(true);
    });

    it('should throw for non-existent file', async () => {
      await expect(adapter.readFile('/non/existent/file.txt'))
        .rejects.toThrow();
    });
  });

  describe('renameFile', () => {
    it('should rename file', async () => {
      const oldPath = path.join(tempDir, 'old.txt');
      const newPath = path.join(tempDir, 'new.txt');
      await fs.writeFile(oldPath, 'content');

      await adapter.renameFile(oldPath, newPath);

      await expect(fs.access(oldPath)).rejects.toThrow();
      await expect(fs.access(newPath)).resolves.toBeUndefined();
    });

    it('should preserve file content after rename', async () => {
      const content = 'Important content';
      const oldPath = path.join(tempDir, 'old.txt');
      const newPath = path.join(tempDir, 'new.txt');
      await fs.writeFile(oldPath, content);

      await adapter.renameFile(oldPath, newPath);

      const result = await fs.readFile(newPath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should throw for non-existent source', async () => {
      const oldPath = path.join(tempDir, 'nonexistent.txt');
      const newPath = path.join(tempDir, 'new.txt');

      await expect(adapter.renameFile(oldPath, newPath))
        .rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const result = await adapter.exists(filePath);

      expect(result).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const result = await adapter.exists(tempDir);

      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const result = await adapter.exists(path.join(tempDir, 'nonexistent.txt'));

      expect(result).toBe(false);
    });
  });

  describe('getExtension', () => {
    it('should return lowercase extension with dot', () => {
      expect(adapter.getExtension('/path/to/file.PDF')).toBe('.pdf');
      expect(adapter.getExtension('/path/to/file.Jpg')).toBe('.jpg');
      expect(adapter.getExtension('document.TXT')).toBe('.txt');
    });

    it('should return empty string for no extension', () => {
      expect(adapter.getExtension('/path/to/file')).toBe('');
      expect(adapter.getExtension('README')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(adapter.getExtension('/path/file.tar.gz')).toBe('.gz');
      expect(adapter.getExtension('backup.2024.01.15.pdf')).toBe('.pdf');
    });

    it('should handle hidden files', () => {
      expect(adapter.getExtension('.gitignore')).toBe('');
      expect(adapter.getExtension('.pappetizer.json')).toBe('.json');
    });
  });

  describe('getDirname', () => {
    it('should return directory path', () => {
      expect(adapter.getDirname('/path/to/file.pdf')).toBe('/path/to');
      expect(adapter.getDirname('/single/file.txt')).toBe('/single');
    });

    it('should handle root paths', () => {
      expect(adapter.getDirname('/file.txt')).toBe('/');
    });

    it('should handle relative paths', () => {
      expect(adapter.getDirname('path/to/file.txt')).toBe('path/to');
      expect(adapter.getDirname('./file.txt')).toBe('.');
    });
  });

  describe('getBasename', () => {
    it('should return filename', () => {
      expect(adapter.getBasename('/path/to/file.pdf')).toBe('file.pdf');
      expect(adapter.getBasename('/another/path/document.txt')).toBe('document.txt');
    });

    it('should handle filename only', () => {
      expect(adapter.getBasename('file.pdf')).toBe('file.pdf');
    });

    it('should handle hidden files', () => {
      expect(adapter.getBasename('/path/.gitignore')).toBe('.gitignore');
    });
  });

  describe('joinPath', () => {
    it('should join path segments', () => {
      expect(adapter.joinPath('/root', 'subdir', 'file.txt')).toBe('/root/subdir/file.txt');
    });

    it('should handle single segment', () => {
      expect(adapter.joinPath('/root')).toBe('/root');
    });

    it('should normalize paths', () => {
      expect(adapter.joinPath('/root/', '/subdir/', 'file.txt')).toBe('/root/subdir/file.txt');
    });

    it('should handle relative paths', () => {
      expect(adapter.joinPath('.', 'subdir', 'file.txt')).toBe('subdir/file.txt');
    });
  });

  describe('getStats', () => {
    it('should return file stats', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Test content';
      await fs.writeFile(filePath, content);

      const stats = await adapter.getStats(filePath);

      expect(stats.size).toBe(content.length);
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
    });

    it('should return directory stats', async () => {
      const stats = await adapter.getStats(tempDir);

      expect(stats.isDirectory()).toBe(true);
      expect(stats.isFile()).toBe(false);
    });

    it('should throw for non-existent path', async () => {
      await expect(adapter.getStats('/non/existent/path'))
        .rejects.toThrow();
    });
  });
});
