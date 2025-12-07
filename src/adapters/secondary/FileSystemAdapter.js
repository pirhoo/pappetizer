import fs from 'fs/promises';
import path from 'path';
import { FileSystemPort } from '../../domain/ports/FileSystemPort.js';

/**
 * File system adapter implementation
 */
export class FileSystemAdapter extends FileSystemPort {
  /**
   * Walk a directory and yield file paths
   * @param {string} dirPath - Directory to walk
   * @param {object} options - Walk options
   * @param {boolean} options.recursive - Whether to recurse into subdirectories (default: false)
   * @yields {string} - File paths
   */
  async *walkDirectory(dirPath, options = {}) {
    const { recursive = false } = options;
    const resolvedPath = path.resolve(dirPath);
    yield* this._walk(resolvedPath, recursive);
  }

  async *_walk(dirPath, recursive) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Only recurse if recursive option is enabled
        if (recursive && !entry.name.startsWith('.')) {
          yield* this._walk(fullPath, recursive);
        }
      } else if (entry.isFile()) {
        // Skip hidden files
        if (!entry.name.startsWith('.')) {
          yield fullPath;
        }
      }
    }
  }

  /**
   * Read file contents
   * @param {string} filePath - Path to file
   * @returns {Promise<Buffer>}
   */
  async readFile(filePath) {
    return fs.readFile(filePath);
  }

  /**
   * Rename a file
   * @param {string} oldPath - Current path
   * @param {string} newPath - New path
   */
  async renameFile(oldPath, newPath) {
    await fs.rename(oldPath, newPath);
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>}
   */
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file extension (lowercase, with dot)
   * @param {string} filePath - Path to file
   * @returns {string}
   */
  getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Get directory name
   * @param {string} filePath - Path to file
   * @returns {string}
   */
  getDirname(filePath) {
    return path.dirname(filePath);
  }

  /**
   * Get base name
   * @param {string} filePath - Path to file
   * @returns {string}
   */
  getBasename(filePath) {
    return path.basename(filePath);
  }

  /**
   * Join path segments
   * @param {...string} segments - Path segments
   * @returns {string}
   */
  joinPath(...segments) {
    return path.join(...segments);
  }

  /**
   * Get file stats
   * @param {string} filePath - Path to file
   * @returns {Promise<object>} - File stats object
   */
  async getStats(filePath) {
    return fs.stat(filePath);
  }
}
