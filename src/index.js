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
import { MemoryAdapter } from './adapters/secondary/MemoryAdapter.js';
import { UserPromptAdapter } from './adapters/primary/UserPromptAdapter.js';
import {
  colors as c,
  symbols,
  badge,
  timestamp,
} from './adapters/primary/ui.js';

const program = new Command();

// App info
const APP_NAME = 'pappetizer';
const APP_VERSION = '1.0.0';
const APP_DESCRIPTION = 'Receipt File Renamer';

/**
 * Print the app header
 */
function printHeader() {
  console.log('');
  console.log(`  ${c.bold}${c.cyan}${APP_NAME}${c.reset} ${c.dim}v${APP_VERSION}${c.reset}`);
  console.log(`  ${c.dim}${APP_DESCRIPTION}${c.reset}`);
  console.log('');
}

/**
 * Print stats summary
 */
function printStats(stats, options = {}) {
  const { verbose = false } = options;

  console.log('');
  console.log(`  ${c.bold}Summary${c.reset}`);
  console.log('');

  // Stats table
  const statsLine = [
    `${c.dim}Processed${c.reset} ${c.bold}${stats.processed}${c.reset}`,
    `${c.green}Renamed${c.reset} ${c.bold}${stats.renamed}${c.reset}`,
    `${c.dim}Skipped${c.reset} ${stats.skipped}`,
  ];

  if (stats.errors.length > 0) {
    statsLine.push(`${c.red}Errors${c.reset} ${stats.errors.length}`);
  }

  console.log(`  ${statsLine.join('  ${c.dim}│${c.reset}  ')}`);

  if (stats.errors.length > 0 && verbose) {
    console.log('');
    console.log(`  ${c.bold}${c.red}Errors${c.reset}`);
    for (const error of stats.errors) {
      console.log(`  ${c.red}${symbols.error}${c.reset} ${error}`);
    }
  }

  console.log('');
}

/**
 * Print active flags/options
 */
function printFlags(flags) {
  const activeFlags = [];

  if (flags.dryRun) activeFlags.push(badge('DRY RUN', 'warning'));
  if (flags.recursive) activeFlags.push(badge('RECURSIVE', 'info'));
  if (flags.watch) activeFlags.push(badge('WATCH', 'primary'));
  if (flags.llm) activeFlags.push(badge('LLM', 'success'));
  if (flags.yes) activeFlags.push(badge('AUTO', 'default'));

  if (activeFlags.length > 0) {
    console.log(`  ${activeFlags.join(' ')}`);
    console.log('');
  }
}

program
  .name(APP_NAME)
  .description('CLI tool to rename receipt files by extracting vendor, date, and amount')
  .version(APP_VERSION);

// Configure subcommand
program
  .command('configure')
  .alias('config')
  .description('Run interactive configuration wizard')
  .action(async () => {
    const configAdapter = new ConfigurationAdapter();
    const promptAdapter = new UserPromptAdapter();

    printHeader();

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
  .description('Rename receipt files in a directory or process a single file')
  .argument('[path]', 'Directory or file to process', '.')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-r, --recursive', 'Process subdirectories recursively')
  .option('-w, --watch', 'Watch directory for new files and process them automatically')
  .option('--dry-run', 'Show what would be renamed without actually renaming')
  .option('-y, --yes', 'Auto-accept all suggestions without prompting')
  .option('--api-key <key>', 'Anthropic API key for LLM extraction (overrides config)')
  .option('--use-llm', 'Enable LLM extraction (requires API key)')
  .option('--no-llm', 'Disable LLM extraction even if configured')
  .option('--model <model>', 'LLM model to use (e.g., claude-3-haiku-20240307)')
  .option('--min-confidence <value>', 'Minimum confidence (0-1) for auto-rename with --yes (default: 0.7)', parseFloat)
  .action(async (targetPath, options) => {
    const resolvedPath = path.resolve(targetPath);
    const userPrompt = new UserPromptAdapter();

    printHeader();

    // Check if path is a file or directory
    let isFile = false;
    try {
      const stat = fs.statSync(resolvedPath);
      isFile = stat.isFile();
    } catch {
      userPrompt.error(`Path not found: ${resolvedPath}`);
      process.exit(1);
    }

    // Show path
    console.log(`  ${c.dim}${isFile ? 'File' : 'Directory'}${c.reset}  ${resolvedPath}`);
    console.log('');

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
    } else if (useLlm && !apiKey) {
      userPrompt.warn('LLM requested but no API key provided. Using heuristics.');
    }

    // Print active flags
    printFlags({
      dryRun: options.dryRun,
      recursive: options.recursive,
      watch: options.watch,
      llm: llmAdapter !== null,
      yes: options.yes,
    });

    const fileSystemAdapter = new FileSystemAdapter();
    const ocrAdapter = new OcrAdapter();
    const pdfReaderAdapter = new PdfReaderAdapter();
    const manifestAdapter = new ManifestAdapter();
    const memoryAdapter = new MemoryAdapter();
    await memoryAdapter.initialize();

    const createUseCase = () => new RenameReceiptsUseCase({
      fileSystemAdapter,
      ocrAdapter,
      pdfReaderAdapter,
      manifestAdapter,
      userPromptAdapter: userPrompt,
      llmAdapter,
      memoryAdapter,
      configuration,
    });

    const executeOptions = {
      dryRun: options.dryRun,
      yes: options.yes,
      recursive: options.recursive,
      minConfidence: options.minConfidence,
    };

    try {
      const useCase = createUseCase();

      if (isFile) {
        // Process single file
        if (options.watch) {
          userPrompt.warn('Watch mode is not available for single files.');
        }
        const result = await useCase.processFile(resolvedPath, executeOptions);
        const stats = {
          processed: result.processed ? 1 : 0,
          renamed: result.renamed ? 1 : 0,
          skipped: result.skipped ? 1 : 0,
          errors: result.error ? [result.error] : [],
        };
        printStats(stats, { verbose: options.verbose });
      } else {
        // Process directory
        const stats = await useCase.execute(resolvedPath, executeOptions);
        printStats(stats, { verbose: options.verbose });

        // Watch mode (only for directories)
        if (options.watch) {
          console.log(`  ${c.cyan}${symbols.info}${c.reset} Watching for new files...`);
          console.log(`  ${c.dim}Press Ctrl+C to stop${c.reset}`);
          console.log('');

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

              console.log(`  ${timestamp()} ${c.cyan}${symbols.arrowRight}${c.reset} ${path.basename(filePath)}`);

              // Clear manifest cache to pick up any changes
              manifestAdapter.clearCache();

              const watchUseCase = createUseCase();
              const result = await watchUseCase.processFile(filePath, executeOptions);

              if (result.error) {
                userPrompt.error(result.error);
              }
            }

            isProcessing = false;
            console.log('');
            console.log(`  ${c.cyan}${symbols.info}${c.reset} Watching for new files...`);
            console.log('');
          };

          const watcher = fs.watch(resolvedPath, watchOptions, (eventType, filename) => {
            if (!filename || filename.startsWith('.')) return;

            const ext = path.extname(filename).toLowerCase();
            if (!configuration.supportedExtensions.includes(ext)) return;

            const filePath = path.join(resolvedPath, filename);

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
            console.log('');
            console.log(`  ${c.dim}Stopping watcher...${c.reset}`);
            watcher.close();
            for (const timer of debounceTimers.values()) {
              clearTimeout(timer);
            }
            console.log(`  ${c.green}${symbols.success}${c.reset} Done`);
            console.log('');
            process.exit(0);
          };

          process.on('SIGINT', cleanup);
          process.on('SIGTERM', cleanup);

          // Keep process running
          await new Promise(() => {});
        }
      }
    } catch (error) {
      userPrompt.error(`Fatal error: ${error.message}`);
      process.exit(1);
    }
  });

// Help command customization
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name(),
});

// Custom help output
program.addHelpText('beforeAll', () => {
  console.log('');
  console.log(`  ${c.bold}${c.cyan}${APP_NAME}${c.reset} ${c.dim}v${APP_VERSION}${c.reset}`);
  console.log(`  ${c.dim}${APP_DESCRIPTION}${c.reset}`);
  return '';
});

program.addHelpText('afterAll', () => {
  console.log('');
  console.log(`  ${c.dim}Examples:${c.reset}`);
  console.log(`    $ ${APP_NAME} clean ./receipts`);
  console.log(`    $ ${APP_NAME} clean ./receipt.pdf`);
  console.log(`    $ ${APP_NAME} clean ./receipts --dry-run`);
  console.log(`    $ ${APP_NAME} clean ./receipts -r -y`);
  console.log(`    $ ${APP_NAME} clean ./receipts --watch`);
  console.log(`    $ ${APP_NAME} configure`);
  console.log('');
  return '';
});

// Default command when no subcommand is provided
program
  .action(() => {
    program.outputHelp();
  });

program.parse();
