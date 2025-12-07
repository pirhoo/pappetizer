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
    configuration = null,
  }) {
    this.fileSystem = fileSystemAdapter;
    this.ocr = ocrAdapter;
    this.pdfReader = pdfReaderAdapter;
    this.manifest = manifestAdapter;
    this.userPrompt = userPromptAdapter;
    this.llm = llmAdapter;
    this.config = configuration || Configuration.getDefaults();
    this.dataExtractor = new ReceiptDataExtractor();
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
    const supportedExtensions = this.config.supportedExtensions;

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
      for await (const filePath of this.fileSystem.walkDirectory(dirPath)) {
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

        // Check if already processed (original name was renamed before)
        const alreadyRenamed = await this.manifest.hasBeenRenamed(currentDir, originalName);
        if (alreadyRenamed) {
          this.userPrompt.log(`Skipping (already processed): ${originalName}`);
          stats.skipped++;
          continue;
        }

        // Check if this file is the result of a previous rename
        const isRenameResult = await this.manifest.isRenameResult(currentDir, originalName);
        if (isRenameResult) {
          this.userPrompt.log(`Skipping (previously renamed): ${originalName}`);
          stats.skipped++;
          continue;
        }

        stats.processed++;
        this.userPrompt.log(`\nProcessing: ${filePath}`);

        try {
          const receipt = await this.extractReceiptData(filePath, originalName);
          const suggestedName = receipt.generateFilename({
            dateFormat: this.config.dateFormat,
            nameSeparator: this.config.nameSeparator,
            nameTemplate: this.config.nameTemplate,
            defaultCurrency: this.config.defaultCurrency,
          });

          // Skip if suggested name is same as original
          if (suggestedName === originalName) {
            this.userPrompt.log(`Name unchanged: ${originalName}`);
            stats.skipped++;
            continue;
          }

          let finalName = suggestedName;
          let shouldRename = false;
          let finalReceipt = receipt;

          if (acceptAllInDir === currentDir || acceptAllInDir === 'all') {
            // Auto-accept for this directory or globally
            shouldRename = true;
          } else {
            const extractedData = {
              vendor: receipt.vendor,
              date: receipt.date,
              amount: receipt.amount,
              currency: receipt.currency,
            };
            const response = await this.userPrompt.promptForRename(originalName, suggestedName, extractedData);

            switch (response.action) {
            case 'accept':
              shouldRename = true;
              break;
            case 'acceptAll':
              shouldRename = true;
              acceptAllInDir = currentDir;
              break;
            case 'editFields':
              // Apply edited fields to create new receipt
              finalReceipt = new Receipt({
                filePath,
                originalName,
                vendor: response.editedFields.vendor !== undefined ? response.editedFields.vendor : receipt.vendor,
                date: response.editedFields.date !== undefined ? response.editedFields.date : receipt.date,
                amount: response.editedFields.amount !== undefined ? response.editedFields.amount : receipt.amount,
                currency: response.editedFields.currency !== undefined ? response.editedFields.currency : receipt.currency,
              });
              finalName = finalReceipt.generateFilename({
                dateFormat: this.config.dateFormat,
                nameSeparator: this.config.nameSeparator,
                nameTemplate: this.config.nameTemplate,
                defaultCurrency: this.config.defaultCurrency,
              });
              shouldRename = true;
              break;
            case 'manual':
              finalName = response.customName;
              shouldRename = true;
              break;
            case 'skip':
              stats.skipped++;
              continue;
            }
          }

          if (shouldRename) {
            const newPath = this.fileSystem.joinPath(currentDir, finalName);

            // Check if target already exists
            if (await this.fileSystem.exists(newPath)) {
              this.userPrompt.error(`Target file already exists: ${finalName}`);
              stats.errors.push(`${originalName}: target exists`);
              continue;
            }

            if (dryRun) {
              this.userPrompt.success(`[DRY RUN] Would rename: ${originalName} -> ${finalName}`);
              stats.renamed++;
            } else {
              await this.fileSystem.renameFile(filePath, newPath);
              await this.manifest.addEntry(currentDir, originalName, finalName, finalReceipt.toJSON({
                dateFormat: this.config.dateFormat,
                nameSeparator: this.config.nameSeparator,
                nameTemplate: this.config.nameTemplate,
                defaultCurrency: this.config.defaultCurrency,
              }));

              this.userPrompt.success(`Renamed: ${originalName} -> ${finalName}`);
              stats.renamed++;
            }
          }
        } catch (error) {
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
   * Extract receipt data from a file
   * @param {string} filePath - Path to the file
   * @param {string} originalName - Original filename
   * @returns {Promise<Receipt>}
   */
  async extractReceiptData(filePath, originalName) {
    const ext = this.fileSystem.getExtension(filePath);
    const buffer = await this.fileSystem.readFile(filePath);
    let text = '';

    if (ext === '.pdf') {
      // Try to extract text from PDF
      const pdfText = await this.pdfReader.extractText(buffer);

      if (pdfText && pdfText.trim().length > 20) {
        text = pdfText;
      } else {
        // PDF might be image-based, try to extract and OCR images
        const images = await this.pdfReader.extractImages(buffer);

        if (images.length === 0) {
          throw new Error('Could not extract images from PDF');
        }

        const textParts = [];
        for (const imageBuffer of images) {
          try {
            const imageText = await this.ocr.extractText(imageBuffer);
            textParts.push(imageText);
          } catch (ocrError) {
            this.userPrompt.warn(`OCR failed for page: ${ocrError.message}`);
          }
        }

        text = textParts.join('\n');

        if (!text.trim()) {
          throw new Error('OCR could not extract any text from PDF');
        }
      }
    } else {
      // Image file - OCR directly
      text = await this.ocr.extractText(buffer);
    }

    // Use LLM for extraction if available, with fallback to heuristics
    let extracted;
    if (this.llm && this.llm.isAvailable()) {
      try {
        extracted = await this.llm.extractReceiptData(text);
        // If LLM returns incomplete data, fill in gaps with heuristic extraction
        const heuristicExtracted = this.dataExtractor.extract(text);
        extracted = {
          vendor: extracted.vendor || heuristicExtracted.vendor,
          date: extracted.date || heuristicExtracted.date,
          amount: extracted.amount ?? heuristicExtracted.amount,
          currency: extracted.currency || heuristicExtracted.currency,
        };
      } catch (error) {
        this.userPrompt.warn(`LLM extraction failed: ${error.message}. Falling back to heuristics.`);
        extracted = this.dataExtractor.extract(text);
      }
    } else {
      extracted = this.dataExtractor.extract(text);
    }

    return new Receipt({
      filePath,
      originalName,
      vendor: extracted.vendor,
      date: extracted.date,
      amount: extracted.amount,
      currency: extracted.currency,
    });
  }
}
