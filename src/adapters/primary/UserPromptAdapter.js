import { select, input, checkbox, confirm, password } from '@inquirer/prompts';
import { UserPromptPort } from '../../domain/ports/UserPromptPort.js';
import {
  colors as c,
  symbols,
  box,
  keyValue,
  createSpinner,
  divider,
} from './ui.js';

/**
 * User prompt adapter using @inquirer/prompts with modern UI
 */
export class UserPromptAdapter extends UserPromptPort {
  constructor() {
    super();
    this.spinner = null;
  }

  /**
   * Prompt user for rename confirmation
   * @param {string} originalName - Original filename
   * @param {string} suggestedName - Suggested new name
   * @param {object} extractedData - Extracted receipt data (vendor, date, amount, currency)
   * @returns {Promise<{action: string, customName?: string, editedFields?: object}>}
   */
  async promptForRename(originalName, suggestedName, extractedData = {}) {
    const dateVal = this.formatDateForDisplay(extractedData.date);
    const vendorVal = extractedData.vendor;
    const amountVal = extractedData.amount != null ? extractedData.amount.toFixed(2) : null;
    const currencyVal = extractedData.currency;
    const confidenceVal = extractedData.confidence;

    // Build the extracted data display
    const extractedLines = [
      keyValue('Vendor', vendorVal || `${c.dim}not detected${c.reset}`, { keyColor: c.cyan, keyWidth: 15 }),
      keyValue('Date', dateVal || `${c.dim}not detected${c.reset}`, { keyColor: c.cyan, keyWidth: 15 }),
      keyValue('Amount', amountVal ? `${amountVal} ${currencyVal || ''}`.trim() : `${c.dim}not detected${c.reset}`, { keyColor: c.cyan, keyWidth: 15 }),
    ];

    // Add confidence score if available
    if (confidenceVal != null) {
      const confidencePercent = Math.round(confidenceVal * 100);
      let confidenceColor = c.red;
      if (confidencePercent >= 70) confidenceColor = c.green;
      else if (confidencePercent >= 50) confidenceColor = c.yellow;
      extractedLines.push(keyValue('Confidence', `${confidenceColor}${confidencePercent}%${c.reset}`, { keyColor: c.cyan, keyWidth: 15 }));
    }

    console.log('');
    console.log(box(
      `${c.dim}From${c.reset}  ${originalName}\n${c.dim}To${c.reset}    ${c.green}${suggestedName}${c.reset}\n\n${extractedLines.join('\n')}`,
      { title: 'RENAME', titleColor: c.cyan + c.bold, padding: 1 },
    ));
    console.log('');

    const action = await select({
      message: `${c.bold}Action${c.reset}`,
      choices: [
        { name: `${c.green}${symbols.check}${c.reset}  Accept`, value: 'accept' },
        { name: `${c.green}${symbols.check}${symbols.check}${c.reset} Accept all in directory`, value: 'acceptAll' },
        { name: `${c.yellow}${symbols.bullet}${c.reset}  Edit fields`, value: 'editFields' },
        { name: `${c.blue}${symbols.bullet}${c.reset}  Enter filename manually`, value: 'manual' },
        { name: `${c.dim}${symbols.cross}  Skip${c.reset}`, value: 'skip' },
      ],
      theme: {
        prefix: `${c.cyan}❯${c.reset}`,
        style: {
          highlight: (text) => `${c.bold}${text}${c.reset}`,
        },
      },
    });

    if (action === 'editFields') {
      const editedFields = await this.promptFieldEdits(extractedData);
      return { action: 'editFields', editedFields };
    }

    if (action === 'manual') {
      const customName = await input({
        message: `${c.bold}New filename${c.reset}`,
        default: suggestedName,
        theme: {
          prefix: `${c.cyan}❯${c.reset}`,
        },
        validate: (value) => {
          if (!value.trim()) {
            return 'Filename cannot be empty';
          }
          if (/[<>:"/\\|?*]/.test(value)) {
            return 'Filename contains invalid characters';
          }
          return true;
        },
      });

      return { action: 'manual', customName: customName.trim() };
    }

    return { action };
  }

  /**
   * Format date for display
   * @param {Date|string} date - Date to format
   * @returns {string}
   */
  formatDateForDisplay(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  /**
   * Prompt user to edit specific fields
   * @param {object} extractedData - Current extracted data
   * @returns {Promise<object>} - Edited field values
   */
  async promptFieldEdits(extractedData) {
    console.log('');

    const fieldsToEdit = await checkbox({
      message: `${c.bold}Select fields to edit${c.reset}`,
      choices: [
        {
          name: `${c.cyan}Vendor${c.reset}    ${c.dim}${symbols.arrowRight}${c.reset} ${extractedData.vendor || `${c.dim}unknown${c.reset}`}`,
          value: 'vendor',
        },
        {
          name: `${c.cyan}Date${c.reset}      ${c.dim}${symbols.arrowRight}${c.reset} ${this.formatDateForDisplay(extractedData.date) || `${c.dim}unknown${c.reset}`}`,
          value: 'date',
        },
        {
          name: `${c.cyan}Amount${c.reset}    ${c.dim}${symbols.arrowRight}${c.reset} ${extractedData.amount ?? `${c.dim}unknown${c.reset}`}`,
          value: 'amount',
        },
        {
          name: `${c.cyan}Currency${c.reset}  ${c.dim}${symbols.arrowRight}${c.reset} ${extractedData.currency || `${c.dim}unknown${c.reset}`}`,
          value: 'currency',
        },
      ],
      theme: {
        prefix: `${c.cyan}❯${c.reset}`,
        style: {
          highlight: (text) => `${c.bold}${text}${c.reset}`,
        },
      },
    });

    if (fieldsToEdit.length === 0) {
      return {};
    }

    console.log('');

    const editedFields = {};

    if (fieldsToEdit.includes('vendor')) {
      const vendor = await input({
        message: `${c.cyan}Vendor${c.reset}`,
        default: extractedData.vendor || '',
        theme: {
          prefix: `  ${c.dim}${symbols.arrowRight}${c.reset}`,
        },
        validate: (value) => {
          if (value && /[<>:"/\\|?*]/.test(value)) {
            return 'Invalid characters';
          }
          return true;
        },
      });
      editedFields.vendor = vendor.trim() || null;
    }

    if (fieldsToEdit.includes('date')) {
      const date = await input({
        message: `${c.cyan}Date${c.reset} ${c.dim}(YYYY-MM-DD)${c.reset}`,
        default: this.formatDateForDisplay(extractedData.date) || '',
        theme: {
          prefix: `  ${c.dim}${symbols.arrowRight}${c.reset}`,
        },
        validate: (value) => {
          if (!value.trim()) return true;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return 'Format: YYYY-MM-DD';
          }
          const d = new Date(value);
          if (isNaN(d.getTime())) {
            return 'Invalid date';
          }
          return true;
        },
      });
      editedFields.date = date.trim() ? new Date(date.trim()) : null;
    }

    if (fieldsToEdit.includes('amount')) {
      const amount = await input({
        message: `${c.cyan}Amount${c.reset}`,
        default: extractedData.amount?.toString() || '',
        theme: {
          prefix: `  ${c.dim}${symbols.arrowRight}${c.reset}`,
        },
        validate: (value) => {
          if (!value.trim()) return true;
          const num = parseFloat(value);
          if (isNaN(num) || num < 0) {
            return 'Must be a positive number';
          }
          return true;
        },
      });
      editedFields.amount = amount.trim() ? parseFloat(amount) : null;
    }

    if (fieldsToEdit.includes('currency')) {
      const currency = await input({
        message: `${c.cyan}Currency${c.reset} ${c.dim}(3 letters)${c.reset}`,
        default: extractedData.currency || '',
        theme: {
          prefix: `  ${c.dim}${symbols.arrowRight}${c.reset}`,
        },
        validate: (value) => {
          if (!value.trim()) return true;
          if (!/^[A-Za-z]{3}$/.test(value)) {
            return 'Use 3-letter code';
          }
          return true;
        },
      });
      editedFields.currency = currency.trim() ? currency.trim().toUpperCase() : null;
    }

    return editedFields;
  }

  /**
   * Prompt user for configuration settings
   * @param {Configuration} currentConfig - Current configuration values
   * @returns {Promise<object>} - Configuration answers
   */
  async promptConfiguration(currentConfig) {
    console.log('');
    console.log(`  ${c.bold}${c.cyan}Configuration Wizard${c.reset}`);
    console.log(`  ${c.dim}Configure pappetizer settings${c.reset}`);
    console.log('');
    console.log(divider(40));
    console.log('');

    const theme = {
      prefix: `${c.cyan}❯${c.reset}`,
      style: {
        highlight: (text) => `${c.bold}${text}${c.reset}`,
      },
    };

    const answers = {};

    answers.dateFormat = await select({
      message: `${c.bold}Date format${c.reset}`,
      choices: [
        { name: 'YYYYMMDD     (20240315)', value: 'YYYYMMDD' },
        { name: 'YYYY-MM-DD   (2024-03-15)', value: 'YYYY-MM-DD' },
        { name: 'DD-MM-YYYY   (15-03-2024)', value: 'DD-MM-YYYY' },
        { name: 'MM-DD-YYYY   (03-15-2024)', value: 'MM-DD-YYYY' },
        { name: 'DD.MM.YYYY   (15.03.2024)', value: 'DD.MM.YYYY' },
      ],
      default: currentConfig.dateFormat,
      theme,
    });

    answers.nameSeparator = await input({
      message: `${c.bold}Separator${c.reset} ${c.dim}(between name parts)${c.reset}`,
      default: currentConfig.nameSeparator,
      theme,
    });

    answers.nameTemplate = await input({
      message: `${c.bold}Template${c.reset} ${c.dim}({date}, {vendor}, {amount}, {currency}, {sep}, {ext})${c.reset}`,
      default: currentConfig.nameTemplate,
      theme,
      validate: (value) => {
        if (!value.includes('{date}')) return 'Must include {date}';
        if (!value.includes('{vendor}')) return 'Must include {vendor}';
        if (!value.includes('{amount}')) return 'Must include {amount}';
        return true;
      },
    });

    answers.defaultCurrency = await input({
      message: `${c.bold}Default currency${c.reset}`,
      default: currentConfig.defaultCurrency,
      theme,
      validate: (value) => {
        if (!/^[A-Za-z]{3}$/.test(value)) {
          return 'Use 3-letter code (USD, EUR, CHF)';
        }
        return true;
      },
    });

    answers.dateLocale = await select({
      message: `${c.bold}Date locale${c.reset} ${c.dim}(for ambiguous dates)${c.reset}`,
      choices: [
        { name: 'European (DD/MM/YYYY)', value: 'eu' },
        { name: 'American (MM/DD/YYYY)', value: 'us' },
      ],
      default: currentConfig.dateLocale,
      theme,
    });

    answers.ocrLanguage = await select({
      message: `${c.bold}OCR language${c.reset}`,
      choices: [
        { name: 'English', value: 'eng' },
        { name: 'German', value: 'deu' },
        { name: 'French', value: 'fra' },
        { name: 'Spanish', value: 'spa' },
        { name: 'Italian', value: 'ita' },
        { name: 'Portuguese', value: 'por' },
        { name: 'Dutch', value: 'nld' },
        { name: 'Japanese', value: 'jpn' },
        { name: 'Chinese (Simplified)', value: 'chi_sim' },
        { name: 'Chinese (Traditional)', value: 'chi_tra' },
      ],
      default: currentConfig.ocrLanguage,
      theme,
    });

    answers.supportedExtensions = await input({
      message: `${c.bold}File extensions${c.reset} ${c.dim}(comma-separated)${c.reset}`,
      default: currentConfig.supportedExtensions.join(', '),
      theme,
    });

    answers.minFileSize = await input({
      message: `${c.bold}Min file size${c.reset} ${c.dim}(bytes)${c.reset}`,
      default: currentConfig.minFileSize.toString(),
      theme,
      validate: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          return 'Must be a non-negative number';
        }
        return true;
      },
    });

    answers.recursive = await confirm({
      message: `${c.bold}Recursive${c.reset} ${c.dim}(process subdirectories)${c.reset}`,
      default: currentConfig.recursive,
      theme,
    });

    answers.autoAcceptAll = await confirm({
      message: `${c.bold}Auto-accept${c.reset} ${c.dim}(skip confirmations)${c.reset}`,
      default: currentConfig.autoAcceptAll,
      theme,
    });

    answers.dryRun = await confirm({
      message: `${c.bold}Dry-run${c.reset} ${c.dim}(preview without renaming)${c.reset}`,
      default: currentConfig.dryRun,
      theme,
    });

    answers.useLlm = await confirm({
      message: `${c.bold}Use LLM${c.reset} ${c.dim}(AI for better extraction)${c.reset}`,
      default: currentConfig.useLlm,
      theme,
    });

    if (answers.useLlm) {
      answers.llmProvider = await select({
        message: `${c.bold}LLM Provider${c.reset}`,
        choices: [
          { name: `Anthropic   ${c.dim}(Claude)${c.reset}`, value: 'anthropic' },
          { name: `OpenAI      ${c.dim}(ChatGPT)${c.reset}`, value: 'openai' },
          { name: `Ollama      ${c.dim}(local)${c.reset}`, value: 'ollama' },
        ],
        default: currentConfig.llmProvider || 'anthropic',
        theme,
      });

      if (answers.llmProvider === 'anthropic') {
        answers.anthropicApiKey = await password({
          message: `${c.bold}Anthropic API key${c.reset} ${c.dim}(leave empty to keep existing)${c.reset}`,
          mask: '•',
          theme,
        });

        answers.llmModel = await select({
          message: `${c.bold}Model${c.reset}`,
          choices: [
            { name: `Claude 3 Haiku      ${c.dim}(fastest)${c.reset}`, value: 'claude-3-haiku-20240307' },
            { name: `Claude 3.5 Haiku    ${c.dim}(balanced)${c.reset}`, value: 'claude-3-5-haiku-20241022' },
            { name: `Claude 3.5 Sonnet   ${c.dim}(best quality)${c.reset}`, value: 'claude-3-5-sonnet-20241022' },
            { name: `Claude Sonnet 4     ${c.dim}(latest)${c.reset}`, value: 'claude-sonnet-4-20250514' },
          ],
          default: currentConfig.llmProvider === 'anthropic' ? currentConfig.llmModel : 'claude-3-haiku-20240307',
          theme,
        });
      } else if (answers.llmProvider === 'openai') {
        answers.openaiApiKey = await password({
          message: `${c.bold}OpenAI API key${c.reset} ${c.dim}(leave empty to keep existing)${c.reset}`,
          mask: '•',
          theme,
        });

        answers.llmModel = await select({
          message: `${c.bold}Model${c.reset}`,
          choices: [
            { name: `GPT-4o mini         ${c.dim}(fastest)${c.reset}`, value: 'gpt-4o-mini' },
            { name: `GPT-4o              ${c.dim}(balanced)${c.reset}`, value: 'gpt-4o' },
            { name: `GPT-4 Turbo         ${c.dim}(best quality)${c.reset}`, value: 'gpt-4-turbo' },
            { name: `GPT-3.5 Turbo       ${c.dim}(legacy)${c.reset}`, value: 'gpt-3.5-turbo' },
          ],
          default: currentConfig.llmProvider === 'openai' ? currentConfig.llmModel : 'gpt-4o-mini',
          theme,
        });
      } else if (answers.llmProvider === 'ollama') {
        answers.ollamaHost = await input({
          message: `${c.bold}Ollama host${c.reset}`,
          default: currentConfig.ollamaHost || 'http://localhost:11434',
          theme,
          validate: (value) => {
            if (!value.trim()) return 'Host is required';
            if (!value.startsWith('http://') && !value.startsWith('https://')) {
              return 'Must start with http:// or https://';
            }
            return true;
          },
        });

        answers.llmModel = await input({
          message: `${c.bold}Model${c.reset} ${c.dim}(e.g., llama3.2, mistral, codellama)${c.reset}`,
          default: currentConfig.llmProvider === 'ollama' ? (currentConfig.llmModel || 'llama3.2') : 'llama3.2',
          theme,
          validate: (value) => {
            if (!value.trim()) return 'Model name is required';
            return true;
          },
        });
      }
    }

    return answers;
  }

  /**
   * Start a spinner
   * @param {string} text - Spinner text
   */
  startSpinner(text) {
    this.spinner = createSpinner(text);
    this.spinner.start();
  }

  /**
   * Stop the spinner silently (just clear it)
   */
  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Stop the spinner with success
   * @param {string} text - Success text
   */
  stopSpinnerSuccess(text) {
    if (this.spinner) {
      this.spinner.success(text);
      this.spinner = null;
    }
  }

  /**
   * Stop the spinner with failure
   * @param {string} text - Failure text
   */
  stopSpinnerFail(text) {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  /**
   * Update spinner text
   * @param {string} text - New text
   */
  updateSpinner(text) {
    if (this.spinner) {
      this.spinner.update(text);
    }
  }

  /**
   * Show completed step and continue spinner with new text
   * @param {string} completedText - Text for the completed step
   * @param {string} newText - New spinner text
   */
  stepSpinner(completedText, newText) {
    if (this.spinner) {
      this.spinner.step(completedText, newText);
    }
  }

  /**
   * Display a log message
   * @param {string} message - Message to display
   */
  log(message) {
    console.log(message);
  }

  /**
   * Display an error message
   * @param {string} message - Error message
   */
  error(message) {
    console.error(`  ${c.red}${symbols.error}${c.reset} ${message}`);
  }

  /**
   * Display a success message
   * @param {string} message - Success message
   */
  success(message) {
    console.log(`  ${c.green}${symbols.success}${c.reset} ${message}`);
  }

  /**
   * Display a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    console.warn(`  ${c.yellow}${symbols.warning}${c.reset} ${message}`);
  }

  /**
   * Display an info message
   * @param {string} message - Info message
   */
  info(message) {
    console.log(`  ${c.blue}${symbols.info}${c.reset} ${message}`);
  }

  /**
   * Display a dim/muted message
   * @param {string} message - Message to display
   */
  dim(message) {
    console.log(`  ${c.dim}${message}${c.reset}`);
  }

  /**
   * Display file processing status
   * @param {string} filename - File being processed
   */
  processing(filename) {
    console.log(`\n  ${c.cyan}${symbols.arrowRight}${c.reset} ${filename}`);
  }

  /**
   * Display rename result
   * @param {string} from - Original filename
   * @param {string} to - New filename
   * @param {boolean} dryRun - Whether this is a dry run
   */
  renamed(from, to, dryRun = false) {
    if (dryRun) {
      console.log(`  ${c.yellow}${symbols.arrowRight}${c.reset} ${c.dim}Would rename:${c.reset} ${from}`);
      console.log(`               ${c.dim}${symbols.arrowRight}${c.reset} ${c.green}${to}${c.reset}`);
    } else {
      console.log(`  ${c.green}${symbols.success}${c.reset} ${c.dim}Renamed:${c.reset} ${from}`);
      console.log(`            ${c.dim}${symbols.arrowRight}${c.reset} ${c.green}${to}${c.reset}`);
    }
  }

  /**
   * Display skipped file
   * @param {string} filename - Skipped filename
   * @param {string} reason - Reason for skipping
   */
  skipped(filename, reason = '') {
    console.log(`  ${c.dim}${symbols.bullet} Skipped: ${filename}${reason ? ` (${reason})` : ''}${c.reset}`);
  }

  /**
   * Confirm restoration of a file
   * @param {string} currentName - Current (renamed) filename
   * @param {string} originalName - Original filename to restore to
   * @returns {Promise<boolean>}
   */
  async confirmRestore(currentName, originalName) {
    console.log('');
    console.log(box(
      `${c.dim}From${c.reset}  ${currentName}\n${c.dim}To${c.reset}    ${c.yellow}${originalName}${c.reset}`,
      { title: 'RESTORE', titleColor: c.yellow + c.bold, padding: 1 },
    ));
    console.log('');

    const shouldRestore = await confirm({
      message: `${c.bold}Restore to original name?${c.reset}`,
      default: true,
      theme: {
        prefix: `${c.cyan}❯${c.reset}`,
      },
    });

    return shouldRestore;
  }

  /**
   * Display restore result
   * @param {string} from - Current (renamed) filename
   * @param {string} to - Original filename
   * @param {boolean} dryRun - Whether this is a dry run
   */
  restored(from, to, dryRun = false) {
    if (dryRun) {
      console.log(`  ${c.yellow}${symbols.arrowRight}${c.reset} ${c.dim}Would restore:${c.reset} ${from}`);
      console.log(`                ${c.dim}${symbols.arrowRight}${c.reset} ${c.yellow}${to}${c.reset}`);
    } else {
      console.log(`  ${c.green}${symbols.success}${c.reset} ${c.dim}Restored:${c.reset} ${from}`);
      console.log(`             ${c.dim}${symbols.arrowRight}${c.reset} ${c.yellow}${to}${c.reset}`);
    }
  }
}
