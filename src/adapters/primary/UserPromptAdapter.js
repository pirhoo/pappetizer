import { select, input, checkbox, confirm, password } from '@inquirer/prompts';
import { UserPromptPort } from '../../domain/ports/UserPromptPort.js';
import {
  colors as c,
  symbols,
  box,
  keyValue,
  divider,
  progressBar,
  stripAnsi,
} from './ui.js';

/**
 * User prompt adapter using @inquirer/prompts with modern UI
 */
export class UserPromptAdapter extends UserPromptPort {
  constructor() {
    super();
    this.spinner = null;
    this.progress = null;
  }

  /**
   * Prompt user for rename confirmation
   */
  async promptForRename(originalName, suggestedName, extractedData = {}) {
    this.hideProgress();

    const dateVal = this.formatDateForDisplay(extractedData.date);
    const vendorVal = extractedData.vendor;
    const amountVal = extractedData.amount != null ? extractedData.amount.toFixed(2) : null;
    const currencyVal = extractedData.currency;
    const confidenceVal = extractedData.confidence;

    const extractedLines = [
      keyValue('Vendor', vendorVal || c.dim('not detected'), { keyWidth: 15 }),
      keyValue('Date', dateVal || c.dim('not detected'), { keyWidth: 15 }),
      keyValue('Amount', amountVal ? `${amountVal} ${currencyVal || ''}`.trim() : c.dim('not detected'), { keyWidth: 15 }),
    ];

    if (confidenceVal != null) {
      const confidencePercent = Math.round(confidenceVal * 100);
      let colorFn = c.red;
      if (confidencePercent >= 70) colorFn = c.green;
      else if (confidencePercent >= 50) colorFn = c.yellow;
      extractedLines.push(keyValue('Confidence', colorFn(`${confidencePercent}%`), { keyWidth: 15 }));
    }

    console.log('');
    console.log(box(
      `${c.dim('From')}  ${originalName}\n${c.dim('To')}    ${c.green(suggestedName)}\n\n${extractedLines.join('\n')}`,
      { title: 'RENAME', padding: 1 },
    ));
    console.log('');

    const action = await select({
      message: c.bold('Action'),
      choices: [
        { name: `${c.green(symbols.check)}  Accept`, value: 'accept' },
        { name: `${c.green(symbols.check + symbols.check)} Accept all in directory`, value: 'acceptAll' },
        { name: `${c.yellow(symbols.bullet)}  Edit fields`, value: 'editFields' },
        { name: `${c.blue(symbols.bullet)}  Enter filename manually`, value: 'manual' },
        { name: c.dim(`${symbols.cross}  Skip`), value: 'skip' },
      ],
      theme: {
        prefix: c.cyan('❯'),
        style: {
          highlight: (text) => c.bold(text),
        },
      },
    });

    if (action === 'editFields') {
      const editedFields = await this.promptFieldEdits(extractedData);
      return { action: 'editFields', editedFields };
    }

    if (action === 'manual') {
      const customName = await input({
        message: c.bold('New filename'),
        default: suggestedName,
        theme: {
          prefix: c.cyan('❯'),
        },
        validate: (value) => {
          if (!value.trim()) return 'Filename cannot be empty';
          if (/[<>:"/\\|?*]/.test(value)) return 'Filename contains invalid characters';
          return true;
        },
      });

      return { action: 'manual', customName: customName.trim() };
    }

    return { action };
  }

  formatDateForDisplay(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  async promptFieldEdits(extractedData) {
    console.log('');

    const fieldsToEdit = await checkbox({
      message: c.bold('Select fields to edit'),
      choices: [
        {
          name: `${c.cyan('Vendor')}    ${c.dim(symbols.arrowRight)} ${extractedData.vendor || c.dim('unknown')}`,
          value: 'vendor',
        },
        {
          name: `${c.cyan('Date')}      ${c.dim(symbols.arrowRight)} ${this.formatDateForDisplay(extractedData.date) || c.dim('unknown')}`,
          value: 'date',
        },
        {
          name: `${c.cyan('Amount')}    ${c.dim(symbols.arrowRight)} ${extractedData.amount ?? c.dim('unknown')}`,
          value: 'amount',
        },
        {
          name: `${c.cyan('Currency')}  ${c.dim(symbols.arrowRight)} ${extractedData.currency || c.dim('unknown')}`,
          value: 'currency',
        },
      ],
      theme: {
        prefix: c.cyan('❯'),
        style: {
          highlight: (text) => c.bold(text),
        },
      },
    });

    if (fieldsToEdit.length === 0) return {};

    console.log('');

    const editedFields = {};

    if (fieldsToEdit.includes('vendor')) {
      const vendor = await input({
        message: c.cyan('Vendor'),
        default: extractedData.vendor || '',
        theme: {
          prefix: '  ' + c.dim(symbols.arrowRight),
        },
        validate: (value) => {
          if (value && /[<>:"/\\|?*]/.test(value)) return 'Invalid characters';
          return true;
        },
      });
      editedFields.vendor = vendor.trim() || null;
    }

    if (fieldsToEdit.includes('date')) {
      const date = await input({
        message: c.cyan('Date') + ' ' + c.dim('(YYYY-MM-DD)'),
        default: this.formatDateForDisplay(extractedData.date) || '',
        theme: {
          prefix: '  ' + c.dim(symbols.arrowRight),
        },
        validate: (value) => {
          if (!value.trim()) return true;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Format: YYYY-MM-DD';
          const d = new Date(value);
          if (isNaN(d.getTime())) return 'Invalid date';
          return true;
        },
      });
      editedFields.date = date.trim() ? new Date(date.trim()) : null;
    }

    if (fieldsToEdit.includes('amount')) {
      const amount = await input({
        message: c.cyan('Amount'),
        default: extractedData.amount?.toString() || '',
        theme: {
          prefix: '  ' + c.dim(symbols.arrowRight),
        },
        validate: (value) => {
          if (!value.trim()) return true;
          const num = parseFloat(value);
          if (isNaN(num) || num < 0) return 'Must be a positive number';
          return true;
        },
      });
      editedFields.amount = amount.trim() ? parseFloat(amount) : null;
    }

    if (fieldsToEdit.includes('currency')) {
      const currency = await input({
        message: c.cyan('Currency') + ' ' + c.dim('(3 letters)'),
        default: extractedData.currency || '',
        theme: {
          prefix: '  ' + c.dim(symbols.arrowRight),
        },
        validate: (value) => {
          if (!value.trim()) return true;
          if (!/^[A-Za-z]{3}$/.test(value)) return 'Use 3-letter code';
          return true;
        },
      });
      editedFields.currency = currency.trim() ? currency.trim().toUpperCase() : null;
    }

    return editedFields;
  }

  async promptConfiguration(currentConfig) {
    this.hideProgress();

    console.log('');
    console.log('  ' + c.bold(c.cyan('Configuration Wizard')));
    console.log('  ' + c.dim('Configure pappetizer settings'));
    console.log('');
    console.log(divider(40));
    console.log('');

    const theme = {
      prefix: c.cyan('❯'),
      style: {
        highlight: (text) => c.bold(text),
      },
    };

    const answers = {};

    answers.dateFormat = await select({
      message: c.bold('Date format'),
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
      message: c.bold('Separator') + ' ' + c.dim('(between name parts)'),
      default: currentConfig.nameSeparator,
      theme,
    });

    answers.nameTemplate = await input({
      message: c.bold('Template') + ' ' + c.dim('({date}, {vendor}, {amount}, {currency}, {sep}, {ext})'),
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
      message: c.bold('Default currency'),
      default: currentConfig.defaultCurrency,
      theme,
      validate: (value) => {
        if (!/^[A-Za-z]{3}$/.test(value)) return 'Use 3-letter code (USD, EUR, CHF)';
        return true;
      },
    });

    answers.dateLocale = await select({
      message: c.bold('Date locale') + ' ' + c.dim('(for ambiguous dates)'),
      choices: [
        { name: 'European (DD/MM/YYYY)', value: 'eu' },
        { name: 'American (MM/DD/YYYY)', value: 'us' },
      ],
      default: currentConfig.dateLocale,
      theme,
    });

    answers.ocrLanguage = await select({
      message: c.bold('OCR language'),
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
      message: c.bold('File extensions') + ' ' + c.dim('(comma-separated)'),
      default: currentConfig.supportedExtensions.join(', '),
      theme,
    });

    answers.minFileSize = await input({
      message: c.bold('Min file size') + ' ' + c.dim('(bytes)'),
      default: currentConfig.minFileSize.toString(),
      theme,
      validate: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) return 'Must be a non-negative number';
        return true;
      },
    });

    answers.recursive = await confirm({
      message: c.bold('Recursive') + ' ' + c.dim('(process subdirectories)'),
      default: currentConfig.recursive,
      theme,
    });

    answers.autoAcceptAll = await confirm({
      message: c.bold('Auto-accept') + ' ' + c.dim('(skip confirmations)'),
      default: currentConfig.autoAcceptAll,
      theme,
    });

    answers.dryRun = await confirm({
      message: c.bold('Dry-run') + ' ' + c.dim('(preview without renaming)'),
      default: currentConfig.dryRun,
      theme,
    });

    answers.useLlm = await confirm({
      message: c.bold('Use LLM') + ' ' + c.dim('(AI for better extraction)'),
      default: currentConfig.useLlm,
      theme,
    });

    if (answers.useLlm) {
      answers.llmProvider = await select({
        message: c.bold('LLM Provider'),
        choices: [
          { name: 'Anthropic   ' + c.dim('(Claude)'), value: 'anthropic' },
          { name: 'OpenAI      ' + c.dim('(ChatGPT)'), value: 'openai' },
          { name: 'Ollama      ' + c.dim('(local)'), value: 'ollama' },
        ],
        default: currentConfig.llmProvider || 'anthropic',
        theme,
      });

      if (answers.llmProvider === 'anthropic') {
        answers.anthropicApiKey = await password({
          message: c.bold('Anthropic API key') + ' ' + c.dim('(leave empty to keep existing)'),
          mask: '•',
          theme,
        });

        answers.llmModel = await select({
          message: c.bold('Model'),
          choices: [
            { name: 'Claude 3 Haiku      ' + c.dim('(fastest)'), value: 'claude-3-haiku-20240307' },
            { name: 'Claude 3.5 Haiku    ' + c.dim('(balanced)'), value: 'claude-3-5-haiku-20241022' },
            { name: 'Claude 3.5 Sonnet   ' + c.dim('(best quality)'), value: 'claude-3-5-sonnet-20241022' },
            { name: 'Claude Sonnet 4     ' + c.dim('(latest)'), value: 'claude-sonnet-4-20250514' },
          ],
          default: currentConfig.llmProvider === 'anthropic' ? currentConfig.llmModel : 'claude-3-haiku-20240307',
          theme,
        });
      } else if (answers.llmProvider === 'openai') {
        answers.openaiApiKey = await password({
          message: c.bold('OpenAI API key') + ' ' + c.dim('(leave empty to keep existing)'),
          mask: '•',
          theme,
        });

        answers.llmModel = await select({
          message: c.bold('Model'),
          choices: [
            { name: 'GPT-4o mini         ' + c.dim('(fastest)'), value: 'gpt-4o-mini' },
            { name: 'GPT-4o              ' + c.dim('(balanced)'), value: 'gpt-4o' },
            { name: 'GPT-4 Turbo         ' + c.dim('(best quality)'), value: 'gpt-4-turbo' },
            { name: 'GPT-3.5 Turbo       ' + c.dim('(legacy)'), value: 'gpt-3.5-turbo' },
          ],
          default: currentConfig.llmProvider === 'openai' ? currentConfig.llmModel : 'gpt-4o-mini',
          theme,
        });
      } else if (answers.llmProvider === 'ollama') {
        answers.ollamaHost = await input({
          message: c.bold('Ollama host'),
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
          message: c.bold('Model') + ' ' + c.dim('(e.g., llama3.2, mistral, codellama)'),
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

  startSpinner(text) {
    this.clearProgressBar();

    const adapter = this;
    let frameIndex = 0;
    let interval = null;
    let currentText = text;
    let firstRender = true;
    let hasProgressLines = false;

    let cachedProgressCurrent = -1;
    let cachedProgressTotal = -1;
    let cachedProgressLine = '';

    const LINE_WIDTH = 80;
    const pad = (str, width = LINE_WIDTH) => {
      const len = stripAnsi(str).length;
      return str + ' '.repeat(Math.max(0, width - len));
    };

    const separatorLine = pad('  ' + c.dim(symbols.boxHorizontal.repeat(45)));

    const getProgressLine = () => {
      if (!adapter.progress) return '';
      const { current, total } = adapter.progress;
      if (current !== cachedProgressCurrent || total !== cachedProgressTotal) {
        cachedProgressCurrent = current;
        cachedProgressTotal = total;
        const bar = progressBar(current, total, {
          width: 25,
          showPercent: true,
          showCount: true,
        });
        cachedProgressLine = pad('  ' + c.cyan(symbols.info) + ' Progress ' + bar);
      }
      return cachedProgressLine;
    };

    const render = () => {
      const frame = symbols.spinner[frameIndex];
      const spinnerLine = pad('  ' + c.cyan(frame) + ' ' + currentText);

      let output = '';

      if (firstRender) {
        output = spinnerLine;
        if (adapter.progress) {
          output += `\n${separatorLine}`;
          output += `\n${getProgressLine()}`;
          output += '\x1b[2A';
          hasProgressLines = true;
        }
        firstRender = false;
      } else {
        output = '\r' + spinnerLine;
        if (adapter.progress) {
          output += `\x1b[1B\r${separatorLine}`;
          output += `\x1b[1B\r${getProgressLine()}`;
          output += '\x1b[2A';
          hasProgressLines = true;
        } else if (hasProgressLines) {
          output += '\x1b[1B\r\x1b[K\x1b[1B\r\x1b[K\x1b[2A';
          hasProgressLines = false;
        }
      }

      process.stdout.write(output);
      frameIndex = (frameIndex + 1) % symbols.spinner.length;
    };

    this.spinner = {
      start(newText) {
        if (newText) currentText = newText;
        if (interval) return;
        process.stdout.write('\x1b[?25l');
        interval = setInterval(render, 100);
        render();
      },

      update(newText) {
        currentText = newText;
      },

      stop() {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        let output = '\x1b[?25h\r\x1b[K';
        if (hasProgressLines) {
          output += '\x1b[1B\x1b[K\x1b[1B\x1b[K\x1b[2A';
          hasProgressLines = false;
        }
        if (adapter.progress) {
          adapter.progress.visible = false;
        }
        process.stdout.write(output);
      },

      success(newText) {
        this.stop();
        console.log('  ' + c.green(symbols.success) + ' ' + (newText || currentText));
      },

      fail(newText) {
        this.stop();
        console.log('  ' + c.red(symbols.error) + ' ' + (newText || currentText));
      },

      warn(newText) {
        this.stop();
        console.log('  ' + c.yellow(symbols.warning) + ' ' + (newText || currentText));
      },

      info(newText) {
        this.stop();
        console.log('  ' + c.blue(symbols.info) + ' ' + (newText || currentText));
      },

      step(completedText, newText) {
        let clearOutput = '\r\x1b[K';
        if (hasProgressLines) {
          clearOutput += '\x1b[1B\x1b[K\x1b[1B\x1b[K\x1b[2A';
          hasProgressLines = false;
        }
        process.stdout.write(clearOutput);
        console.log('  ' + c.dim(symbols.success) + ' ' + c.dim(completedText));
        if (newText) {
          currentText = newText;
        }
        firstRender = true;
      },
    };

    this.spinner.start();
  }

  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  stopSpinnerSuccess(text) {
    if (this.spinner) {
      this.spinner.success(text);
      this.spinner = null;
    }
  }

  stopSpinnerFail(text) {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  updateSpinner(text) {
    if (this.spinner) {
      this.spinner.update(text);
    }
  }

  stepSpinner(completedText, newText) {
    if (this.spinner) {
      this.spinner.step(completedText, newText);
    }
  }

  log(message) {
    console.log(message);
  }

  error(message) {
    console.error('  ' + c.red(symbols.error) + ' ' + message);
  }

  success(message) {
    console.log('  ' + c.green(symbols.success) + ' ' + message);
  }

  warn(message) {
    console.warn('  ' + c.yellow(symbols.warning) + ' ' + message);
  }

  info(message) {
    console.log('  ' + c.blue(symbols.info) + ' ' + message);
  }

  dim(message) {
    console.log('  ' + c.dim(message));
  }

  processing(filename) {
    console.log('\n  ' + c.cyan(symbols.arrowRight) + ' ' + filename);
  }

  renamed(from, to, dryRun = false) {
    if (dryRun) {
      console.log('  ' + c.yellow(symbols.arrowRight) + ' ' + c.dim('Would rename:') + ' ' + from);
      console.log('               ' + c.dim(symbols.arrowRight) + ' ' + c.green(to));
    } else {
      console.log('  ' + c.green(symbols.success) + ' ' + c.dim('Renamed:') + ' ' + from);
      console.log('            ' + c.dim(symbols.arrowRight) + ' ' + c.green(to));
    }
  }

  skipped(filename, reason = '') {
    console.log('  ' + c.dim(symbols.bullet + ' Skipped: ' + filename + (reason ? ` (${reason})` : '')));
  }

  async confirmRestore(currentName, originalName) {
    console.log('');
    console.log(box(
      c.dim('From') + '  ' + currentName + '\n' + c.dim('To') + '    ' + c.yellow(originalName),
      { title: 'RESTORE', padding: 1 },
    ));
    console.log('');

    const shouldRestore = await confirm({
      message: c.bold('Restore to original name?'),
      default: true,
      theme: {
        prefix: c.cyan('❯'),
      },
    });

    return shouldRestore;
  }

  restored(from, to, dryRun = false) {
    if (dryRun) {
      console.log('  ' + c.yellow(symbols.arrowRight) + ' ' + c.dim('Would restore:') + ' ' + from);
      console.log('                ' + c.dim(symbols.arrowRight) + ' ' + c.yellow(to));
    } else {
      console.log('  ' + c.green(symbols.success) + ' ' + c.dim('Restored:') + ' ' + from);
      console.log('             ' + c.dim(symbols.arrowRight) + ' ' + c.yellow(to));
    }
  }

  async confirmMemorizeVendor(from, to) {
    console.log('');
    const shouldMemorize = await confirm({
      message: c.bold('Remember') + ' ' + c.dim(`"${from}"`) + ' ' + symbols.arrowRight + ' ' + c.cyan(`"${to}"`) + ' ' + c.dim('for future receipts?'),
      default: true,
      theme: {
        prefix: '  ' + c.magenta(symbols.info),
      },
    });

    return shouldMemorize;
  }

  startProgress(total) {
    this.progress = { current: 0, total };
  }

  updateProgress(current) {
    if (!this.progress) return;
    this.progress.current = current;
  }

  printProgressBar() {
    if (!this.progress) return;
    const { current, total } = this.progress;
    const bar = progressBar(current, total, {
      width: 25,
      showPercent: true,
      showCount: true,
    });
    console.log('  ' + c.dim(symbols.boxHorizontal.repeat(45)));
    console.log('  ' + c.cyan(symbols.info) + ' Progress ' + bar);
    this.progress.visible = true;
  }

  clearProgressBar() {
    if (!this.progress?.visible) return;
    process.stdout.write('\r\x1b[2A\x1b[0J');
    this.progress.visible = false;
  }

  hideProgress() {
    this.clearProgressBar();
  }

  stopProgress() {
    this.clearProgressBar();
    this.progress = null;
  }
}
