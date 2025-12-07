#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { RenameReceiptsUseCase } from './application/RenameReceiptsUseCase.js';
import { ConfigureUseCase } from './application/ConfigureUseCase.js';
import { FileSystemAdapter } from './adapters/secondary/FileSystemAdapter.js';
import { OcrAdapter } from './adapters/secondary/OcrAdapter.js';
import { PdfReaderAdapter } from './adapters/secondary/PdfReaderAdapter.js';
import { ManifestAdapter } from './adapters/secondary/ManifestAdapter.js';
import { ConfigurationAdapter } from './adapters/secondary/ConfigurationAdapter.js';
import { LlmAdapter } from './adapters/secondary/LlmAdapter.js';
import { UserPromptAdapter } from './adapters/primary/UserPromptAdapter.js';

const program = new Command();

program
  .name('pappetizer')
  .description('CLI tool to rename receipt files by extracting vendor, date, and amount')
  .version('1.0.0');

// Configure subcommand
program
  .command('configure')
  .alias('config')
  .description('Run interactive configuration wizard')
  .action(async () => {
    const configAdapter = new ConfigurationAdapter();
    const promptAdapter = new UserPromptAdapter();

    const useCase = new ConfigureUseCase({
      configAdapter,
      promptAdapter,
    });

    try {
      await useCase.execute();
    } catch (error) {
      promptAdapter.error(`Configuration failed: ${error.message}`);
      process.exit(1);
    }
  });

// Clean subcommand
program
  .command('clean')
  .description('Rename receipt files in a directory')
  .argument('[directory]', 'Directory to process', '.')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-r, --recursive', 'Process subdirectories recursively')
  .option('-w, --watch', 'Watch directory for new files and process them automatically')
  .option('--dry-run', 'Show what would be renamed without actually renaming')
  .option('-y, --yes', 'Auto-accept all suggestions without prompting')
  .option('--api-key <key>', 'Anthropic API key for LLM extraction (overrides config)')
  .option('--use-llm', 'Enable LLM extraction (requires API key)')
  .option('--no-llm', 'Disable LLM extraction even if configured')
  .option('--model <model>', 'LLM model to use (e.g., claude-3-haiku-20240307)')
  .action(async (directory, options) => {
    const dirPath = path.resolve(directory);
    const userPrompt = new UserPromptAdapter();

    userPrompt.log('');
    userPrompt.log('\x1b[36m\x1b[1m  Pappetizer\x1b[0m \x1b[2m— Receipt File Renamer\x1b[0m');
    userPrompt.log('');
    userPrompt.log(`  \x1b[2mDirectory:\x1b[0m ${dirPath}`);

    // Load configuration
    const configAdapter = new ConfigurationAdapter();
    const configuration = await configAdapter.loadOrDefault();

    // Determine LLM settings (CLI options override config)
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || configuration.anthropicApiKey;
    const llmModel = options.model || configuration.llmModel;

    // Determine if LLM should be used
    let useLlm = configuration.useLlm;
    if (options.useLlm) {
      useLlm = true;
    } else if (options.llm === false) {
      useLlm = false;
    }

    // Create LLM adapter if enabled
    let llmAdapter = null;
    if (useLlm && apiKey) {
      llmAdapter = new LlmAdapter(apiKey, llmModel);
      userPrompt.info(`LLM extraction enabled \x1b[2m(${llmModel})\x1b[0m`);
    } else if (useLlm && !apiKey) {
      userPrompt.warn('LLM extraction requested but no API key provided. Using heuristics only.');
    }
    userPrompt.log('');

    const fileSystemAdapter = new FileSystemAdapter();
    const ocrAdapter = new OcrAdapter();
    const pdfReaderAdapter = new PdfReaderAdapter();
    const manifestAdapter = new ManifestAdapter();

    const createUseCase = () => new RenameReceiptsUseCase({
      fileSystemAdapter,
      ocrAdapter,
      pdfReaderAdapter,
      manifestAdapter,
      userPromptAdapter: userPrompt,
      llmAdapter,
      configuration,
    });

    const executeOptions = {
      dryRun: options.dryRun,
      yes: options.yes,
      recursive: options.recursive,
    };

    const printStats = (stats) => {
      userPrompt.log('');
      userPrompt.log('\x1b[36m\x1b[1m  Summary\x1b[0m');
      userPrompt.log('');
      userPrompt.log(`    Processed   \x1b[1m${stats.processed}\x1b[0m`);
      userPrompt.log(`    Renamed     \x1b[32m${stats.renamed}\x1b[0m`);
      userPrompt.log(`    Skipped     \x1b[2m${stats.skipped}\x1b[0m`);

      if (stats.errors.length > 0) {
        userPrompt.log(`    Errors      \x1b[31m${stats.errors.length}\x1b[0m`);

        if (options.verbose) {
          userPrompt.log('');
          for (const error of stats.errors) {
            userPrompt.error(error);
          }
        }
      }

      userPrompt.log('');
    };

    try {
      // Initial run
      const useCase = createUseCase();
      const stats = await useCase.execute(dirPath, executeOptions);
      printStats(stats);

      // Watch mode
      if (options.watch) {
        userPrompt.info('Watching for new files... (Press Ctrl+C to stop)');
        userPrompt.log('');

        const watchOptions = { recursive: options.recursive };
        let debounceTimers = new Map();
        let isProcessing = false;
        const pendingFiles = new Set();

        const processNextFile = async () => {
          if (isProcessing || pendingFiles.size === 0) return;

          isProcessing = true;

          while (pendingFiles.size > 0) {
            const filePath = pendingFiles.values().next().value;
            pendingFiles.delete(filePath);

            // Check if file still exists (might have been moved/deleted)
            if (!fs.existsSync(filePath)) continue;

            userPrompt.log(`\x1b[2m[${new Date().toLocaleTimeString()}]\x1b[0m New file detected: ${path.basename(filePath)}`);

            // Clear manifest cache to pick up any changes
            manifestAdapter.clearCache();

            const watchUseCase = createUseCase();
            const result = await watchUseCase.processFile(filePath, executeOptions);

            if (result.renamed) {
              userPrompt.log('');
            } else if (result.error) {
              userPrompt.log('');
            }
          }

          isProcessing = false;
          userPrompt.info('Watching for new files... (Press Ctrl+C to stop)');
          userPrompt.log('');
        };

        const watcher = fs.watch(dirPath, watchOptions, (eventType, filename) => {
          if (!filename || filename.startsWith('.')) return;

          const ext = path.extname(filename).toLowerCase();
          if (!configuration.supportedExtensions.includes(ext)) return;

          const filePath = path.join(dirPath, filename);

          // Clear any existing debounce timer for this file
          if (debounceTimers.has(filePath)) {
            clearTimeout(debounceTimers.get(filePath));
          }

          // Debounce to handle multiple events for same file (file being written)
          const timer = setTimeout(async () => {
            debounceTimers.delete(filePath);
            pendingFiles.add(filePath);

            try {
              await processNextFile();
            } catch (error) {
              userPrompt.error(`Watch error: ${error.message}`);
            }
          }, 1000); // Wait 1 second for file to be fully written

          debounceTimers.set(filePath, timer);
        });

        // Handle graceful shutdown
        const cleanup = () => {
          userPrompt.log('');
          userPrompt.info('Stopping watcher...');
          watcher.close();
          for (const timer of debounceTimers.values()) {
            clearTimeout(timer);
          }
          process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

        // Keep process running
        await new Promise(() => {});
      }
    } catch (error) {
      userPrompt.error(`Fatal error: ${error.message}`);
      process.exit(1);
    }
  });

// Default command when no subcommand is provided
program
  .action(() => {
    program.outputHelp();
  });

program.parse();
