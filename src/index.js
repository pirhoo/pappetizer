#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { RenameReceiptsUseCase } from './application/RenameReceiptsUseCase.js';
import { ConfigureUseCase } from './application/ConfigureUseCase.js';
import { RestoreUseCase } from './application/RestoreUseCase.js';
import { FileSystemAdapter } from './adapters/secondary/FileSystemAdapter.js';
import { OcrAdapter } from './adapters/secondary/OcrAdapter.js';
import { PdfReaderAdapter } from './adapters/secondary/PdfReaderAdapter.js';
import { ManifestAdapter } from './adapters/secondary/ManifestAdapter.js';
import { ConfigurationAdapter } from './adapters/secondary/ConfigurationAdapter.js';
import { LlmAdapterFactory } from './adapters/secondary/LlmAdapterFactory.js';
import { MemoryAdapter } from './adapters/secondary/MemoryAdapter.js';
import { UserPromptAdapter } from './adapters/primary/UserPromptAdapter.js';
import {
  colors as c,
  symbols,
  badge,
  timestamp,
  showCursor,
  box,
} from './adapters/primary/ui.js';

// Load package.json for app info
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const APP_NAME = pkg.name;
const APP_VERSION = pkg.version;
const APP_DESCRIPTION = pkg.description;

// Ensure cursor is restored on exit or interrupt
const restoreCursor = () => {
  showCursor();
};

process.on('exit', restoreCursor);
process.on('SIGINT', () => {
  restoreCursor();
  process.exit(130);
});
process.on('SIGTERM', () => {
  restoreCursor();
  process.exit(143);
});
process.on('uncaughtException', (err) => {
  restoreCursor();
  console.error(err);
  process.exit(1);
});

const program = new Command();

/**
 * Resolve and validate a path, exiting on error
 */
function resolveAndValidatePath(targetPath, userPrompt) {
  const resolvedPath = path.resolve(targetPath);
  let isFile = false;

  try {
    const stat = fs.statSync(resolvedPath);
    isFile = stat.isFile();
  } catch {
    userPrompt.error(`Path not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log('  ' + c.dim(isFile ? 'File' : 'Directory') + '  ' + resolvedPath);
  console.log('');

  return { resolvedPath, isFile };
}

/**
 * Print stats summary
 */
function printStats(stats, options = {}) {
  const {
    verbose = false,
    primaryLabel = 'Renamed',
    primaryKey = 'renamed',
    showProcessed = true,
  } = options;

  console.log('');
  console.log('  ' + c.bold('Summary'));
  console.log('');

  const statsLine = [];
  if (showProcessed && stats.processed !== undefined) {
    statsLine.push(c.dim('Processed') + ' ' + c.bold(String(stats.processed)));
  }
  statsLine.push(c.green(primaryLabel) + ' ' + c.bold(String(stats[primaryKey])));
  statsLine.push(c.dim('Skipped') + ' ' + stats.skipped);

  if (stats.errors.length > 0) {
    statsLine.push(c.red('Errors') + ' ' + stats.errors.length);
  }

  console.log('  ' + statsLine.join('  ' + c.dim('│') + '  '));

  if (stats.errors.length > 0 && verbose) {
    console.log('');
    console.log('  ' + c.bold(c.red('Errors')));
    for (const error of stats.errors) {
      console.log('  ' + c.red(symbols.error) + ' ' + error);
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
  if (flags.llm) {
    const providerName = flags.llmProvider ? flags.llmProvider.toUpperCase() : 'LLM';
    activeFlags.push(badge(providerName, 'success'));
  }
  if (flags.yes) activeFlags.push(badge('AUTO', 'default'));
  if (flags.force) activeFlags.push(badge('FORCE', 'warning'));

  if (activeFlags.length > 0) {
    console.log('  ' + activeFlags.join(' '));
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

// Restore subcommand
program
  .command('restore')
  .description('Restore renamed files to their original names')
  .argument('[path]', 'Directory or file to restore', '.')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-r, --recursive', 'Process subdirectories recursively')
  .option('--dry-run', 'Show what would be restored without actually restoring')
  .option('-y, --yes', 'Auto-accept all restorations without prompting')
  .action(async (targetPath, options) => {
    const userPrompt = new UserPromptAdapter();

    const { resolvedPath, isFile } = resolveAndValidatePath(targetPath, userPrompt);

    printFlags({
      dryRun: options.dryRun,
      recursive: options.recursive,
      yes: options.yes,
    });

    const useCase = new RestoreUseCase({
      fileSystemAdapter: new FileSystemAdapter(),
      manifestAdapter: new ManifestAdapter(),
      userPromptAdapter: userPrompt,
    });

    const executeOptions = {
      dryRun: options.dryRun,
      yes: options.yes,
      recursive: options.recursive,
    };

    try {
      if (isFile) {
        const result = await useCase.restoreFile(resolvedPath, executeOptions);
        if (result.error) {
          userPrompt.error(result.error);
          process.exit(1);
        }
        console.log('');
        console.log(result.restored
          ? '  ' + c.green(symbols.success) + ' File restored successfully'
          : '  ' + c.dim('No changes made'));
        console.log('');
      } else {
        const stats = await useCase.execute(resolvedPath, executeOptions);
        printStats(stats, {
          verbose: options.verbose,
          primaryLabel: 'Restored',
          primaryKey: 'restored',
          showProcessed: false,
        });
      }
    } catch (error) {
      userPrompt.error(`Restore failed: ${error.message}`);
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
  .option('--use-llm', 'Enable LLM extraction')
  .option('--no-llm', 'Disable LLM extraction even if configured')
  .option('--llm-provider <provider>', 'LLM provider: anthropic, openai, or ollama')
  .option('--api-key <key>', 'API key for Anthropic or OpenAI (overrides config)')
  .option('--ollama-host <url>', 'Ollama server URL (default: http://localhost:11434)')
  .option('--model <model>', 'LLM model to use (provider-specific)')
  .option('--min-confidence <value>', 'Minimum confidence (0-1) for auto-rename with --yes (default: 0.7)', parseFloat)
  .option('-f, --force', 'Re-process files even if already in manifest')
  .action(async (targetPath, options) => {
    const userPrompt = new UserPromptAdapter();

    const { resolvedPath, isFile } = resolveAndValidatePath(targetPath, userPrompt);

    // Load configuration
    const configAdapter = new ConfigurationAdapter();
    const configuration = await configAdapter.loadOrDefault();

    // Determine if LLM should be used
    let useLlm = configuration.useLlm;
    if (options.useLlm) {
      useLlm = true;
    } else if (options.llm === false) {
      useLlm = false;
    }

    // Determine LLM provider
    const llmProvider = options.llmProvider || configuration.llmProvider || 'anthropic';

    // Determine API key
    let apiKey = options.apiKey;
    if (!apiKey) {
      if (llmProvider === 'anthropic') {
        apiKey = process.env.ANTHROPIC_API_KEY || configuration.anthropicApiKey;
      } else if (llmProvider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || configuration.openaiApiKey;
      }
    }

    // Determine Ollama host
    const ollamaHost = options.ollamaHost || process.env.OLLAMA_HOST || configuration.ollamaHost;

    // Determine model
    const llmModel = options.model || configuration.llmModel;

    // Create LLM adapter if enabled
    let llmAdapter = null;
    if (useLlm) {
      llmAdapter = LlmAdapterFactory.create({
        provider: llmProvider,
        apiKey,
        host: ollamaHost,
        model: llmModel,
      });

      if (!llmAdapter || !llmAdapter.isAvailable()) {
        if (llmProvider !== 'ollama') {
          userPrompt.warn(`LLM requested but no API key provided for ${llmProvider}. Using heuristics.`);
          llmAdapter = null;
        }
      }
    }

    // Print active flags
    printFlags({
      dryRun: options.dryRun,
      recursive: options.recursive,
      watch: options.watch,
      llm: llmAdapter !== null,
      llmProvider: llmAdapter ? llmProvider : null,
      yes: options.yes,
      force: options.force,
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
      force: options.force,
    };

    try {
      const useCase = createUseCase();

      if (isFile) {
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
        const stats = await useCase.execute(resolvedPath, executeOptions);
        printStats(stats, { verbose: options.verbose });

        // Watch mode
        if (options.watch) {
          console.log('  ' + c.cyan(symbols.info) + ' Watching for new files...');
          console.log('  ' + c.dim('Press Ctrl+C to stop'));
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

              if (!fs.existsSync(filePath)) continue;

              console.log('  ' + timestamp() + ' ' + c.cyan(symbols.arrowRight) + ' ' + path.basename(filePath));

              manifestAdapter.clearCache();

              const watchUseCase = createUseCase();
              const result = await watchUseCase.processFile(filePath, executeOptions);

              if (result.error) {
                userPrompt.error(result.error);
              }
            }

            isProcessing = false;
            console.log('');
            console.log('  ' + c.cyan(symbols.info) + ' Watching for new files...');
            console.log('');
          };

          const watcher = fs.watch(resolvedPath, watchOptions, (eventType, filename) => {
            if (!filename || filename.startsWith('.')) return;

            const ext = path.extname(filename).toLowerCase();
            if (!configuration.supportedExtensions.includes(ext)) return;

            const filePath = path.join(resolvedPath, filename);

            if (debounceTimers.has(filePath)) {
              clearTimeout(debounceTimers.get(filePath));
            }

            const timer = setTimeout(async () => {
              debounceTimers.delete(filePath);
              pendingFiles.add(filePath);

              try {
                await processNextFile();
              } catch (error) {
                userPrompt.error(`Watch error: ${error.message}`);
              }
            }, 1000);

            debounceTimers.set(filePath, timer);
          });

          // Handle graceful shutdown
          const cleanup = () => {
            console.log('');
            console.log('  ' + c.dim('Stopping watcher...'));
            watcher.close();
            for (const timer of debounceTimers.values()) {
              clearTimeout(timer);
            }
            console.log('  ' + c.green(symbols.success) + ' Done');
            console.log('');
            process.exit(0);
          };

          process.on('SIGINT', cleanup);
          process.on('SIGTERM', cleanup);

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
  const header = c.bold(c.cyan(APP_NAME)) + ' ' + c.dim('v' + APP_VERSION) + '\n' + c.dim(APP_DESCRIPTION);
  console.log('');
  console.log(box(header, { padding: 1 }));
  return '';
});

program.addHelpText('afterAll', () => {
  console.log('');
  console.log('  ' + c.dim('Examples:'));
  console.log('    $ ' + APP_NAME + ' clean ./receipts');
  console.log('    $ ' + APP_NAME + ' clean ./receipt.pdf');
  console.log('    $ ' + APP_NAME + ' clean ./receipts --dry-run');
  console.log('    $ ' + APP_NAME + ' clean ./receipts -r -y');
  console.log('    $ ' + APP_NAME + ' clean ./receipts --watch');
  console.log('    $ ' + APP_NAME + ' clean ./receipts --use-llm --llm-provider openai');
  console.log('    $ ' + APP_NAME + ' clean ./receipts --use-llm --llm-provider ollama --model llama3.2');
  console.log('    $ ' + APP_NAME + ' restore ./receipts');
  console.log('    $ ' + APP_NAME + ' restore ./receipts -y');
  console.log('    $ ' + APP_NAME + ' configure');
  console.log('');
  return '';
});

// Default command
program
  .action(() => {
    program.outputHelp();
  });

program.parse();
