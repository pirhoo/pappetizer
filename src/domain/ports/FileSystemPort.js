/**
 * Port interface for file system operations
 */
export class FileSystemPort {
  /**
   * Walk a directory recursively and return all files
   * @param {string} _dirPath - Directory path to walk
   * @returns {AsyncGenerator<string>} - Yields file paths
   */
  // eslint-disable-next-line require-yield
  async *walkDirectory(_dirPath) {
    throw new Error('Method not implemented');
  }

  /**
   * Read file contents as buffer
   * @param {string} _filePath - Path to file
   * @returns {Promise<Buffer>} - File contents
   */
  async readFile(_filePath) {
    throw new Error('Method not implemented');
  }

  /**
   * Rename a file
   * @param {string} _oldPath - Current file path
   * @param {string} _newPath - New file path
   * @returns {Promise<void>}
   */
  async renameFile(_oldPath, _newPath) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if file exists
   * @param {string} _filePath - Path to check
   * @returns {Promise<boolean>}
   */
  async exists(_filePath) {
    throw new Error('Method not implemented');
  }

  /**
   * Get file extension
   * @param {string} _filePath - Path to file
   * @returns {string} - File extension (lowercase, with dot)
   */
  getExtension(_filePath) {
    throw new Error('Method not implemented');
  }

  /**
   * Get directory name from path
   * @param {string} _filePath - Path to file
   * @returns {string} - Directory path
   */
  getDirname(_filePath) {
    throw new Error('Method not implemented');
  }

  /**
   * Get base name from path
   * @param {string} _filePath - Path to file
   * @returns {string} - File name
   */
  getBasename(_filePath) {
    throw new Error('Method not implemented');
  }

  /**
   * Join path segments
   * @param {...string} _segments - Path segments
   * @returns {string} - Joined path
   */
  joinPath(..._segments) {
    throw new Error('Method not implemented');
  }
}
