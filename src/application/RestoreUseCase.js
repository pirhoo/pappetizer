/**
 * Use case for restoring renamed files to their original names
 */
export class RestoreUseCase {
  constructor({
    fileSystemAdapter,
    manifestAdapter,
    userPromptAdapter,
  }) {
    this.fileSystem = fileSystemAdapter;
    this.manifest = manifestAdapter;
    this.userPrompt = userPromptAdapter;
  }

  /**
   * Restore all renamed files in a directory to their original names
   * @param {string} dirPath - Directory path
   * @param {object} options - Options
   * @param {boolean} options.dryRun - Preview without actually restoring
   * @param {boolean} options.yes - Auto-accept all restorations
   * @param {boolean} options.recursive - Process subdirectories
   * @returns {Promise<{restored: number, skipped: number, errors: string[]}>}
   */
  async execute(dirPath, options = {}) {
    const stats = { restored: 0, skipped: 0, errors: [] };
    const { dryRun = false, yes = false, recursive = false } = options;

    // Get all directories to process
    const directories = [dirPath];
    if (recursive) {
      const subdirs = await this.fileSystem.walkDirectory(dirPath, { recursive: true });
      for (const entry of subdirs) {
        if (entry.isDirectory) {
          directories.push(entry.path);
        }
      }
    }

    for (const dir of directories) {
      const dirStats = await this.restoreDirectory(dir, { dryRun, yes });
      stats.restored += dirStats.restored;
      stats.skipped += dirStats.skipped;
      stats.errors.push(...dirStats.errors);
    }

    return stats;
  }

  /**
   * Restore renamed files in a single directory
   * @param {string} dirPath - Directory path
   * @param {object} options - Options
   * @returns {Promise<{restored: number, skipped: number, errors: string[]}>}
   */
  async restoreDirectory(dirPath, options = {}) {
    const stats = { restored: 0, skipped: 0, errors: [] };
    const { dryRun = false, yes = false } = options;

    // Load manifest entries
    const entries = await this.manifest.getAllEntries(dirPath);

    if (entries.length === 0) {
      return stats;
    }

    this.userPrompt.log(`\n  Processing ${dirPath}`);

    for (const entry of entries) {
      const { originalName, newName } = entry;
      const newPath = this.fileSystem.joinPath(dirPath, newName);
      const originalPath = this.fileSystem.joinPath(dirPath, originalName);

      // Check if the renamed file exists
      const newFileExists = await this.fileSystem.exists(newPath);
      if (!newFileExists) {
        this.userPrompt.dim(`  ${newName} not found, removing from manifest`);
        await this.manifest.removeEntry(dirPath, originalName);
        stats.skipped++;
        continue;
      }

      // Check if original name is already taken
      const originalExists = await this.fileSystem.exists(originalPath);
      if (originalExists) {
        this.userPrompt.warn(`Cannot restore ${newName}: ${originalName} already exists`);
        stats.skipped++;
        continue;
      }

      // Prompt for confirmation unless auto-accept
      let shouldRestore = yes;
      if (!yes) {
        shouldRestore = await this.userPrompt.confirmRestore(newName, originalName);
      }

      if (!shouldRestore) {
        stats.skipped++;
        continue;
      }

      // Perform restoration
      try {
        if (dryRun) {
          this.userPrompt.restored(newName, originalName, true);
        } else {
          await this.fileSystem.renameFile(newPath, originalPath);
          await this.manifest.removeEntry(dirPath, originalName);
          this.userPrompt.restored(newName, originalName, false);
        }
        stats.restored++;
      } catch (error) {
        stats.errors.push(`Failed to restore ${newName}: ${error.message}`);
        this.userPrompt.error(`Failed to restore ${newName}: ${error.message}`);
      }
    }

    return stats;
  }

  /**
   * Restore a single file to its original name
   * @param {string} filePath - Path to the renamed file
   * @param {object} options - Options
   * @returns {Promise<{restored: boolean, error: string|null}>}
   */
  async restoreFile(filePath, options = {}) {
    const result = { restored: false, error: null };
    const { dryRun = false, yes = false } = options;

    const dirPath = this.fileSystem.getDirname(filePath);
    const fileName = this.fileSystem.getBasename(filePath);

    // Load manifest and find entry by newName
    const entries = await this.manifest.getAllEntries(dirPath);
    const entry = entries.find(e => e.newName === fileName);

    if (!entry) {
      result.error = `${fileName} is not in the manifest`;
      return result;
    }

    const { originalName } = entry;
    const originalPath = this.fileSystem.joinPath(dirPath, originalName);

    // Check if original name is already taken
    const originalExists = await this.fileSystem.exists(originalPath);
    if (originalExists) {
      result.error = `Cannot restore: ${originalName} already exists`;
      return result;
    }

    // Prompt for confirmation unless auto-accept
    let shouldRestore = yes;
    if (!yes) {
      shouldRestore = await this.userPrompt.confirmRestore(fileName, originalName);
    }

    if (!shouldRestore) {
      return result;
    }

    // Perform restoration
    try {
      if (dryRun) {
        this.userPrompt.restored(fileName, originalName, true);
      } else {
        await this.fileSystem.renameFile(filePath, originalPath);
        await this.manifest.removeEntry(dirPath, originalName);
        this.userPrompt.restored(fileName, originalName, false);
      }
      result.restored = true;
    } catch (error) {
      result.error = `Failed to restore: ${error.message}`;
    }

    return result;
  }
}
