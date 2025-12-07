import inquirer from 'inquirer';
import { UserPromptPort } from '../../domain/ports/UserPromptPort.js';

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

/**
 * User prompt adapter using inquirer
 */
export class UserPromptAdapter extends UserPromptPort {
  /**
   * Prompt user for rename confirmation
   * @param {string} originalName - Original filename
   * @param {string} suggestedName - Suggested new name
   * @param {object} extractedData - Extracted receipt data (vendor, date, amount, currency)
   * @returns {Promise<{action: string, customName?: string, editedFields?: object}>}
   */
  async promptForRename(originalName, suggestedName, extractedData = {}) {
    const dateVal = this.formatDateForDisplay(extractedData.date) || '—';
    const vendorVal = extractedData.vendor || '—';
    const amountVal = extractedData.amount != null ? String(extractedData.amount) : '—';
    const currencyVal = extractedData.currency || '—';

    console.log('');
    console.log(`${c.bgBlue}${c.white}${c.bold} RECEIPT ${c.reset}`);
    console.log('');
    console.log(`  ${c.dim}Original${c.reset}   ${originalName}`);
    console.log(`  ${c.dim}Suggested${c.reset}  ${c.green}${suggestedName}${c.reset}`);
    console.log('');
    console.log(`  ${c.dim}Extracted:${c.reset}`);
    console.log(`    ${c.yellow}Date${c.reset}      ${dateVal}`);
    console.log(`    ${c.yellow}Vendor${c.reset}    ${vendorVal}`);
    console.log(`    ${c.yellow}Amount${c.reset}    ${amountVal}`);
    console.log(`    ${c.yellow}Currency${c.reset}  ${currencyVal}`);
    console.log('');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Accept this suggestion', value: 'accept' },
          { name: 'Accept all suggestions in this directory', value: 'acceptAll' },
          { name: 'Edit fields manually', value: 'editFields' },
          { name: 'Enter full filename manually', value: 'manual' },
          { name: 'Skip this file', value: 'skip' },
        ],
      },
    ]);

    if (action === 'editFields') {
      const editedFields = await this.promptFieldEdits(extractedData);
      return { action: 'editFields', editedFields };
    }

    if (action === 'manual') {
      const { customName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customName',
          message: 'Enter new filename:',
          default: suggestedName,
          validate: (input) => {
            if (!input.trim()) {
              return 'Filename cannot be empty';
            }
            if (/[<>:"/\\|?*]/.test(input)) {
              return 'Filename contains invalid characters';
            }
            return true;
          },
        },
      ]);

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
    console.log(`  ${c.cyan}Select fields to edit:${c.reset}`);
    console.log('');

    const { fieldsToEdit } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'fieldsToEdit',
        message: 'Fields',
        prefix: '  ',
        choices: [
          {
            name: `${c.yellow}Date${c.reset}      ${c.dim}→${c.reset} ${this.formatDateForDisplay(extractedData.date) || `${c.dim}unknown${c.reset}`}`,
            value: 'date',
            short: 'Date',
          },
          {
            name: `${c.yellow}Vendor${c.reset}    ${c.dim}→${c.reset} ${extractedData.vendor || `${c.dim}unknown${c.reset}`}`,
            value: 'vendor',
            short: 'Vendor',
          },
          {
            name: `${c.yellow}Amount${c.reset}    ${c.dim}→${c.reset} ${extractedData.amount ?? `${c.dim}unknown${c.reset}`}`,
            value: 'amount',
            short: 'Amount',
          },
          {
            name: `${c.yellow}Currency${c.reset}  ${c.dim}→${c.reset} ${extractedData.currency || `${c.dim}unknown${c.reset}`}`,
            value: 'currency',
            short: 'Currency',
          },
        ],
      },
    ]);

    if (fieldsToEdit.length === 0) {
      return {};
    }

    console.log('');
    console.log(`  ${c.cyan}Enter new values:${c.reset}`);
    console.log('');

    const editedFields = {};

    if (fieldsToEdit.includes('date')) {
      const { date } = await inquirer.prompt([
        {
          type: 'input',
          name: 'date',
          message: `${c.yellow}Date${c.reset} ${c.dim}(YYYY-MM-DD)${c.reset}`,
          prefix: '  ',
          default: this.formatDateForDisplay(extractedData.date) || '',
          validate: (input) => {
            if (!input.trim()) return true;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
              return `${c.red}Format: YYYY-MM-DD${c.reset}`;
            }
            const d = new Date(input);
            if (isNaN(d.getTime())) {
              return `${c.red}Invalid date${c.reset}`;
            }
            return true;
          },
        },
      ]);
      editedFields.date = date.trim() ? new Date(date.trim()) : null;
    }

    if (fieldsToEdit.includes('vendor')) {
      const { vendor } = await inquirer.prompt([
        {
          type: 'input',
          name: 'vendor',
          message: `${c.yellow}Vendor${c.reset}`,
          prefix: '  ',
          default: extractedData.vendor || '',
          validate: (input) => {
            if (input && /[<>:"/\\|?*]/.test(input)) {
              return `${c.red}Invalid characters in name${c.reset}`;
            }
            return true;
          },
        },
      ]);
      editedFields.vendor = vendor.trim() || null;
    }

    if (fieldsToEdit.includes('amount')) {
      const { amount } = await inquirer.prompt([
        {
          type: 'input',
          name: 'amount',
          message: `${c.yellow}Amount${c.reset}`,
          prefix: '  ',
          default: extractedData.amount?.toString() || '',
          validate: (input) => {
            if (!input.trim()) return true;
            const num = parseFloat(input);
            if (isNaN(num) || num < 0) {
              return `${c.red}Must be a positive number${c.reset}`;
            }
            return true;
          },
        },
      ]);
      editedFields.amount = amount.trim() ? parseFloat(amount) : null;
    }

    if (fieldsToEdit.includes('currency')) {
      const { currency } = await inquirer.prompt([
        {
          type: 'input',
          name: 'currency',
          message: `${c.yellow}Currency${c.reset} ${c.dim}(3 letters)${c.reset}`,
          prefix: '  ',
          default: extractedData.currency || '',
          validate: (input) => {
            if (!input.trim()) return true;
            if (!/^[A-Za-z]{3}$/.test(input)) {
              return `${c.red}Use 3-letter code (USD, EUR, CHF...)${c.reset}`;
            }
            return true;
          },
        },
      ]);
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
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'dateFormat',
        message: 'Date format for filenames:',
        choices: [
          { name: 'YYYYMMDD (e.g., 20240315)', value: 'YYYYMMDD' },
          { name: 'YYYY-MM-DD (e.g., 2024-03-15)', value: 'YYYY-MM-DD' },
          { name: 'DD-MM-YYYY (e.g., 15-03-2024)', value: 'DD-MM-YYYY' },
          { name: 'MM-DD-YYYY (e.g., 03-15-2024)', value: 'MM-DD-YYYY' },
          { name: 'DD.MM.YYYY (e.g., 15.03.2024)', value: 'DD.MM.YYYY' },
        ],
        default: currentConfig.dateFormat,
      },
      {
        type: 'input',
        name: 'nameSeparator',
        message: 'Separator between name parts:',
        default: currentConfig.nameSeparator,
      },
      {
        type: 'input',
        name: 'nameTemplate',
        message: 'Filename template (use {date}, {vendor}, {amount}, {currency}, {sep}, {ext}):',
        default: currentConfig.nameTemplate,
        validate: (input) => {
          if (!input.includes('{date}')) return 'Template must include {date}';
          if (!input.includes('{vendor}')) return 'Template must include {vendor}';
          if (!input.includes('{amount}')) return 'Template must include {amount}';
          return true;
        },
      },
      {
        type: 'input',
        name: 'defaultCurrency',
        message: 'Default currency (3-letter code):',
        default: currentConfig.defaultCurrency,
        validate: (input) => {
          if (!/^[A-Za-z]{3}$/.test(input)) {
            return 'Currency must be 3 letters (e.g., USD, EUR, CHF)';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'dateLocale',
        message: 'Date parsing locale (for ambiguous dates like 01/02/2024):',
        choices: [
          { name: 'European (DD/MM/YYYY)', value: 'eu' },
          { name: 'American (MM/DD/YYYY)', value: 'us' },
        ],
        default: currentConfig.dateLocale,
      },
      {
        type: 'list',
        name: 'ocrLanguage',
        message: 'OCR language:',
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
      },
      {
        type: 'input',
        name: 'supportedExtensions',
        message: 'File extensions to process (comma-separated):',
        default: currentConfig.supportedExtensions.join(', '),
      },
      {
        type: 'input',
        name: 'minFileSize',
        message: 'Minimum file size in bytes (skip smaller files):',
        default: currentConfig.minFileSize.toString(),
        validate: (input) => {
          const num = parseInt(input, 10);
          if (isNaN(num) || num < 0) {
            return 'Must be a non-negative number';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'skipDirectories',
        message: 'Directories to skip (comma-separated):',
        default: currentConfig.skipDirectories.join(', '),
      },
      {
        type: 'confirm',
        name: 'recursive',
        message: 'Process subdirectories recursively?',
        default: currentConfig.recursive,
      },
      {
        type: 'confirm',
        name: 'autoAcceptAll',
        message: 'Auto-accept all suggestions without prompting?',
        default: currentConfig.autoAcceptAll,
      },
      {
        type: 'confirm',
        name: 'dryRun',
        message: 'Dry-run mode by default (show changes without renaming)?',
        default: currentConfig.dryRun,
      },
      {
        type: 'confirm',
        name: 'useLlm',
        message: 'Use LLM (Claude) for enhanced data extraction? (requires Anthropic API key)',
        default: currentConfig.useLlm,
      },
      {
        type: 'password',
        name: 'anthropicApiKey',
        message: 'Anthropic API key (leave empty to keep existing):',
        mask: '*',
        when: (answers) => answers.useLlm,
        default: '',
      },
      {
        type: 'list',
        name: 'llmModel',
        message: 'LLM model to use:',
        choices: [
          { name: 'Claude 3 Haiku (fastest, cheapest)', value: 'claude-3-haiku-20240307' },
          { name: 'Claude 3.5 Haiku (fast, good quality)', value: 'claude-3-5-haiku-20241022' },
          { name: 'Claude 3.5 Sonnet (best quality)', value: 'claude-3-5-sonnet-20241022' },
          { name: 'Claude Sonnet 4 (latest)', value: 'claude-sonnet-4-20250514' },
        ],
        when: (answers) => answers.useLlm,
        default: currentConfig.llmModel,
      },
    ]);

    return answers;
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
    console.error(`  ${c.red}✖${c.reset} ${message}`);
  }

  /**
   * Display a success message
   * @param {string} message - Success message
   */
  success(message) {
    console.log(`  ${c.green}✔${c.reset} ${message}`);
  }

  /**
   * Display a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    console.warn(`  ${c.yellow}⚠${c.reset} ${message}`);
  }

  /**
   * Display an info message
   * @param {string} message - Info message
   */
  info(message) {
    console.log(`  ${c.blue}ℹ${c.reset} ${message}`);
  }
}
