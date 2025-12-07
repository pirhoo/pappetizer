import { Receipt } from '../domain/entities/Receipt.js';
import { ReceiptDataExtractor } from '../domain/services/ReceiptDataExtractor.js';
import { Configuration } from '../domain/entities/Configuration.js';

/**
 * Use case for renaming receipt files (the "clean" command)
 */
export class RenameReceiptsUseCase {
  constructor({
    fileSystemAdapter,
    ocrAdapter,
    pdfReaderAdapter,
    manifestAdapter,
    userPromptAdapter,
    llmAdapter = null,
    memoryAdapter = null,
    configuration = null,
  }) {
    this.fileSystem = fileSystemAdapter;
    this.ocr = ocrAdapter;
    this.pdfReader = pdfReaderAdapter;
    this.manifest = manifestAdapter;
    this.userPrompt = userPromptAdapter;
    this.llm = llmAdapter;
    this.memory = memoryAdapter;
    this.config = configuration || Configuration.getDefaults();
    this.dataExtractor = new ReceiptDataExtractor();
  }

  /**
   * Get filename generation config object
   */
  getFilenameConfig() {
    return {
      dateFormat: this.config.dateFormat,
      nameSeparator: this.config.nameSeparator,
      nameTemplate: this.config.nameTemplate,
      defaultCurrency: this.config.defaultCurrency,
    };
  }

  /**
   * Build extracted data object for prompt
   */
  buildExtractedData(receipt) {
    return {
      vendor: receipt.vendor,
      date: receipt.date,
      amount: receipt.amount,
      currency: receipt.currency,
      confidence: receipt.confidence,
    };
  }

  /**
   * Apply edited fields to create a new receipt
   */
  applyEditedFields(receipt, editedFields, filePath, originalName) {
    return new Receipt({
      filePath,
      originalName,
      vendor: editedFields.vendor !== undefined ? editedFields.vendor : receipt.vendor,
      date: editedFields.date !== undefined ? editedFields.date : receipt.date,
      amount: editedFields.amount !== undefined ? editedFields.amount : receipt.amount,
      currency: editedFields.currency !== undefined ? editedFields.currency : receipt.currency,
      confidence: receipt.confidence,
    });
  }

  /**
   * Record vendor alias if vendor was edited (with user confirmation)
   */
  async recordVendorEdit(receipt, editedFields) {
    if (this.memory && editedFields.vendor !== undefined && editedFields.vendor !== receipt.vendor) {
      const shouldMemorize = await this.userPrompt.confirmMemorizeVendor(
        receipt.vendor || 'unknown',
        editedFields.vendor,
      );
      if (shouldMemorize) {
        await this.memory.recordVendorAlias(receipt.vendor, editedFields.vendor);
      }
    }
  }

  /**
   * Handle user response from rename prompt
   * @returns {{ shouldRename: boolean, finalName: string, finalReceipt: Receipt, shouldSkip: boolean, setAcceptAll: boolean }}
   */
  async handleUserResponse(response, receipt, suggestedName, filePath, originalName) {
    let finalName = suggestedName;
    let finalReceipt = receipt;
    let shouldRename = false;
    let shouldSkip = false;
    let setAcceptAll = false;

    switch (response.action) {
    case 'accept':
      shouldRename = true;
      break;
    case 'acceptAll':
      shouldRename = true;
      setAcceptAll = true;
      break;
    case 'editFields':
      await this.recordVendorEdit(receipt, response.editedFields);
      finalReceipt = this.applyEditedFields(receipt, response.editedFields, filePath, originalName);
      finalName = finalReceipt.generateFilename(this.getFilenameConfig());
      shouldRename = true;
      break;
    case 'manual':
      finalName = response.customName;
      shouldRename = true;
      break;
    case 'skip':
      shouldSkip = true;
      break;
    }

    return { shouldRename, finalName, finalReceipt, shouldSkip, setAcceptAll };
  }

  /**
   * Perform the actual rename operation
   */
  async performRename(filePath, finalName, finalReceipt, originalName, currentDir, dryRun) {
    const newPath = this.fileSystem.joinPath(currentDir, finalName);

    if (await this.fileSystem.exists(newPath)) {
      return { success: false, error: `Target file already exists: ${finalName}` };
    }

    if (dryRun) {
      this.userPrompt.success(`[DRY RUN] Would rename: ${originalName} -> ${finalName}`);
    } else {
      await this.fileSystem.renameFile(filePath, newPath);
      await this.manifest.addEntry(currentDir, originalName, finalName, finalReceipt.toJSON(this.getFilenameConfig()));
      this.userPrompt.success(`Renamed: ${originalName} -> ${finalName}`);
    }

    return { success: true };
  }

  /**
   * Apply memory-learned vendor aliases to receipt
   */
  applyVendorMemory(receipt) {
    if (this.memory && receipt.vendor) {
      const correctedVendor = this.memory.applyVendorAlias(receipt.vendor);
      if (correctedVendor !== receipt.vendor) {
        receipt.vendor = correctedVendor;
      }
    }
  }

  /**
   * Execute the rename operation on a directory
   * @param {string} dirPath - Directory to process
   * @param {object} options - Command-line options that override config
   * @returns {Promise<{ processed: number, renamed: number, skipped: number, errors: string[] }>}
   */
  async execute(dirPath, options = {}) {
    const stats = { processed: 0, renamed: 0, skipped: 0, errors: [] };

    // Merge options with config (options take precedence)
    const dryRun = options.dryRun ?? this.config.dryRun;
    const autoAccept = options.yes ?? this.config.autoAcceptAll;
    const recursive = options.recursive ?? this.config.recursive;
    const supportedExtensions = this.config.supportedExtensions;
    const minConfidence = options.minConfidence ?? this.config.minConfidence;
    const force = options.force ?? false;

    let acceptAllInDir = autoAccept ? 'all' : null;

    if (dryRun) {
      this.userPrompt.warn('DRY RUN MODE - No files will be renamed');
      this.userPrompt.log('');
    }

    try {
      await this.ocr.initialize();
    } catch (error) {
      this.userPrompt.error(`Failed to initialize OCR: ${error.message}`);
      return stats;
    }

    try {
      for await (const filePath of this.fileSystem.walkDirectory(dirPath, { recursive })) {
        const ext = this.fileSystem.getExtension(filePath);

        if (!supportedExtensions.includes(ext)) {
          continue;
        }

        // Check file size
        try {
          const fileStats = await this.fileSystem.getStats(filePath);
          if (fileStats && fileStats.size < this.config.minFileSize) {
            continue; // Skip small files (likely thumbnails)
          }
        } catch {
          // Continue if we can't get stats
        }

        const currentDir = this.fileSystem.getDirname(filePath);
        const originalName = this.fileSystem.getBasename(filePath);

        // Initialize manifest for this directory (creates file immediately)
        await this.manifest.initialize(currentDir);

        // Reset acceptAll when entering a new directory (unless global autoAccept)
        if (!autoAccept && acceptAllInDir !== currentDir && acceptAllInDir !== 'all') {
          acceptAllInDir = null;
        }

        // Check if this file is the result of a previous rename (skip it unless forced)
        if (!force) {
          const isRenameResult = await this.manifest.isRenameResult(currentDir, originalName);
          if (isRenameResult) {
            this.userPrompt.skipped(originalName, 'previously renamed');
            stats.skipped++;
            continue;
          }
        }
        // Note: We don't skip files just because their name is in the manifest as originalName.
        // If a file with that name exists, it's either a new file or the renamed file was deleted.

        stats.processed++;
        this.userPrompt.log('');
        this.userPrompt.startSpinner(`Extracting data from ${originalName}`);

        try {
          const receipt = await this.extractReceiptData(filePath, originalName);
          this.userPrompt.stopSpinner();

          this.applyVendorMemory(receipt);

          const suggestedName = receipt.generateFilename(this.getFilenameConfig());

          if (suggestedName === originalName) {
            this.userPrompt.skipped(originalName, 'name unchanged');
            stats.skipped++;
            continue;
          }

          const isAutoAccept = acceptAllInDir === currentDir || acceptAllInDir === 'all';
          const meetsConfidenceThreshold = receipt.confidence >= minConfidence;

          let result;
          if (isAutoAccept && meetsConfidenceThreshold) {
            result = { shouldRename: true, finalName: suggestedName, finalReceipt: receipt };
          } else {
            if (isAutoAccept && !meetsConfidenceThreshold) {
              this.userPrompt.warn(`Low confidence (${(receipt.confidence * 100).toFixed(0)}%) - prompting for review`);
            }
            const response = await this.userPrompt.promptForRename(
              originalName, suggestedName, this.buildExtractedData(receipt),
            );
            result = await this.handleUserResponse(response, receipt, suggestedName, filePath, originalName);

            if (result.shouldSkip) {
              stats.skipped++;
              continue;
            }
            if (result.setAcceptAll) {
              acceptAllInDir = currentDir;
            }
          }

          if (result.shouldRename) {
            const renameResult = await this.performRename(
              filePath, result.finalName, result.finalReceipt, originalName, currentDir, dryRun,
            );
            if (renameResult.success) {
              stats.renamed++;
            } else {
              this.userPrompt.error(renameResult.error);
              stats.errors.push(`${originalName}: target exists`);
            }
          }
        } catch (error) {
          this.userPrompt.stopSpinner();
          this.userPrompt.error(`Error processing ${originalName}: ${error.message}`);
          stats.errors.push(`${originalName}: ${error.message}`);
        }
      }
    } finally {
      await this.ocr.terminate();
    }

    return stats;
  }

  /**
   * Process a single file
   * @param {string} filePath - Full path to the file
   * @param {object} options - Processing options
   * @returns {Promise<{ processed: boolean, renamed: boolean, skipped: boolean, error: string|null }>}
   */
  async processFile(filePath, options = {}) {
    const result = { processed: false, renamed: false, skipped: false, error: null };

    const dryRun = options.dryRun ?? this.config.dryRun;
    const autoAccept = options.yes ?? this.config.autoAcceptAll;
    const supportedExtensions = this.config.supportedExtensions;
    const minConfidence = options.minConfidence ?? this.config.minConfidence;
    const force = options.force ?? false;

    const ext = this.fileSystem.getExtension(filePath);

    if (!supportedExtensions.includes(ext)) {
      result.skipped = true;
      return result;
    }

    // Check file size
    try {
      const fileStats = await this.fileSystem.getStats(filePath);
      if (fileStats && fileStats.size < this.config.minFileSize) {
        result.skipped = true;
        return result;
      }
    } catch {
      // Continue if we can't get stats
    }

    const currentDir = this.fileSystem.getDirname(filePath);
    const originalName = this.fileSystem.getBasename(filePath);

    // Initialize manifest for this directory
    await this.manifest.initialize(currentDir);

    // Check if this file is the result of a previous rename (skip it unless forced)
    if (!force) {
      const isRenameResult = await this.manifest.isRenameResult(currentDir, originalName);
      if (isRenameResult) {
        this.userPrompt.skipped(originalName, 'previously renamed');
        result.skipped = true;
        return result;
      }
    }

    result.processed = true;
    this.userPrompt.log('');
    this.userPrompt.startSpinner(`Extracting data from ${originalName}`);

    try {
      await this.ocr.initialize();

      const receipt = await this.extractReceiptData(filePath, originalName);
      this.userPrompt.stopSpinner();

      this.applyVendorMemory(receipt);

      const suggestedName = receipt.generateFilename(this.getFilenameConfig());

      if (suggestedName === originalName) {
        this.userPrompt.skipped(originalName, 'name unchanged');
        result.skipped = true;
        return result;
      }

      const meetsConfidenceThreshold = receipt.confidence >= minConfidence;

      let handlerResult;
      if (autoAccept && meetsConfidenceThreshold) {
        handlerResult = { shouldRename: true, finalName: suggestedName, finalReceipt: receipt };
      } else {
        if (autoAccept && !meetsConfidenceThreshold) {
          this.userPrompt.warn(`Low confidence (${(receipt.confidence * 100).toFixed(0)}%) - prompting for review`);
        }
        const response = await this.userPrompt.promptForRename(
          originalName, suggestedName, this.buildExtractedData(receipt),
        );
        handlerResult = await this.handleUserResponse(response, receipt, suggestedName, filePath, originalName);

        if (handlerResult.shouldSkip) {
          result.skipped = true;
          return result;
        }
      }

      if (handlerResult.shouldRename) {
        const renameResult = await this.performRename(
          filePath, handlerResult.finalName, handlerResult.finalReceipt, originalName, currentDir, dryRun,
        );
        if (renameResult.success) {
          result.renamed = true;
        } else {
          this.userPrompt.error(renameResult.error);
          result.error = `${originalName}: target exists`;
        }
      }
    } catch (error) {
      this.userPrompt.stopSpinner();
      this.userPrompt.error(`Error processing ${originalName}: ${error.message}`);
      result.error = `${originalName}: ${error.message}`;
    } finally {
      await this.ocr.terminate();
    }

    return result;
  }

  /**
   * Extract receipt data from a file
   * @param {string} filePath - Path to the file
   * @param {string} originalName - Original filename
   * @returns {Promise<Receipt>}
   */
  async extractReceiptData(filePath, originalName) {
    const ext = this.fileSystem.getExtension(filePath);

    this.userPrompt.updateSpinner('Reading file...');
    const buffer = await this.fileSystem.readFile(filePath);
    let text = '';

    if (ext === '.pdf') {
      this.userPrompt.stepSpinner('File read', 'Extracting text from PDF...');
      const pdfText = await this.pdfReader.extractText(buffer);

      if (pdfText && pdfText.trim().length > 20) {
        text = pdfText;
        this.userPrompt.stepSpinner('Text extracted from PDF', 'Analyzing receipt data...');
      } else {
        this.userPrompt.stepSpinner('No text layer found', 'Extracting images from PDF...');
        const images = await this.pdfReader.extractImages(buffer);

        if (images.length === 0) {
          throw new Error('Could not extract images from PDF');
        }

        this.userPrompt.stepSpinner(`Extracted ${images.length} page(s)`, 'Running OCR...');
        const textParts = [];
        for (let i = 0; i < images.length; i++) {
          if (images.length > 1) {
            this.userPrompt.updateSpinner(`Running OCR (page ${i + 1}/${images.length})...`);
          }
          try {
            const imageText = await this.ocr.extractText(images[i]);
            textParts.push(imageText);
          } catch (ocrError) {
            this.userPrompt.warn(`OCR failed for page ${i + 1}: ${ocrError.message}`);
          }
        }

        text = textParts.join('\n');

        if (!text.trim()) {
          throw new Error('OCR could not extract any text from PDF');
        }
        this.userPrompt.stepSpinner('OCR complete', 'Analyzing receipt data...');
      }
    } else {
      this.userPrompt.stepSpinner('File read', 'Running OCR...');
      text = await this.ocr.extractText(buffer);
      this.userPrompt.stepSpinner('OCR complete', 'Analyzing receipt data...');
    }

    // Use LLM for extraction if available, with fallback to heuristics
    let extracted;
    let usedLlm = false;
    if (this.llm && this.llm.isAvailable()) {
      this.userPrompt.updateSpinner('Extracting data with LLM...');
      try {
        // Pass vendor aliases to LLM for context
        const vendorAliases = this.memory ? this.memory.getVendorAliases() : {};
        extracted = await this.llm.extractReceiptData(text, vendorAliases);
        usedLlm = true;
        this.userPrompt.stepSpinner('LLM extraction complete', 'Finalizing...');
        // If LLM returns incomplete data, fill in gaps with heuristic extraction
        const heuristicExtracted = this.dataExtractor.extract(text);
        extracted = {
          vendor: extracted.vendor || heuristicExtracted.vendor,
          date: extracted.date || heuristicExtracted.date,
          amount: extracted.amount ?? heuristicExtracted.amount,
          currency: extracted.currency || heuristicExtracted.currency,
        };
      } catch (error) {
        this.userPrompt.stepSpinner('LLM failed', 'Falling back to heuristics...');
        this.userPrompt.warn(`LLM extraction failed: ${error.message}`);
        extracted = this.dataExtractor.extract(text);
        usedLlm = false;
      }
    } else {
      extracted = this.dataExtractor.extract(text);
    }

    const receipt = new Receipt({
      filePath,
      originalName,
      vendor: extracted.vendor,
      date: extracted.date,
      amount: extracted.amount,
      currency: extracted.currency,
    });

    // Calculate and set confidence score
    receipt.confidence = receipt.calculateConfidence({ usedLlm });

    return receipt;
  }
}
