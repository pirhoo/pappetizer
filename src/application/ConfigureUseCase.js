import { Configuration } from '../domain/entities/Configuration.js';

/**
 * Use case for configuring Pappetizer interactively
 */
export class ConfigureUseCase {
  constructor({ configAdapter, promptAdapter }) {
    this.config = configAdapter;
    this.prompt = promptAdapter;
  }

  /**
   * Run the interactive configuration wizard
   * @returns {Promise<Configuration>}
   */
  async execute() {
    // Load existing config or defaults
    const existingConfig = await this.config.loadOrDefault();
    const configExists = await this.config.exists();

    if (configExists) {
      this.prompt.log(`Existing configuration found at: ${this.config.getConfigPath()}`);
      this.prompt.log('Current values will be shown as defaults.');
      this.prompt.log('');
    } else {
      this.prompt.log('No existing configuration found. Using default values.');
      this.prompt.log('');
    }

    // Collect configuration through prompts
    const answers = await this.prompt.promptConfiguration(existingConfig);

    // Handle API key - keep existing if not provided
    const anthropicApiKey = answers.anthropicApiKey || existingConfig.anthropicApiKey;

    // Create new configuration
    const newConfig = new Configuration({
      dateFormat: answers.dateFormat,
      nameSeparator: answers.nameSeparator,
      nameTemplate: answers.nameTemplate,
      defaultCurrency: answers.defaultCurrency.toUpperCase(),
      dateLocale: answers.dateLocale,
      autoAcceptAll: answers.autoAcceptAll,
      supportedExtensions: this.parseExtensions(answers.supportedExtensions),
      ocrLanguage: answers.ocrLanguage,
      minFileSize: parseInt(answers.minFileSize, 10),
      vendorAliases: existingConfig.vendorAliases, // Keep existing aliases
      skipDirectories: this.parseList(answers.skipDirectories),
      recursive: answers.recursive,
      dryRun: answers.dryRun,
      useLlm: answers.useLlm,
      anthropicApiKey: anthropicApiKey,
      llmModel: answers.llmModel || existingConfig.llmModel,
    });

    // Validate
    const validation = newConfig.validate();
    if (!validation.valid) {
      this.prompt.error('Configuration validation failed:');
      for (const error of validation.errors) {
        this.prompt.error(`  - ${error}`);
      }
      throw new Error('Invalid configuration');
    }

    // Save configuration
    await this.config.save(newConfig);

    this.prompt.log('');
    this.prompt.success(`Configuration saved to: ${this.config.getConfigPath()}`);
    this.prompt.log('');
    this.prompt.log('You can now run: pappetizer clean <directory>');
    this.prompt.log('');

    return newConfig;
  }

  /**
   * Parse comma-separated extensions into array
   */
  parseExtensions(input) {
    if (Array.isArray(input)) return input;

    return input
      .split(',')
      .map(ext => ext.trim().toLowerCase())
      .filter(ext => ext)
      .map(ext => ext.startsWith('.') ? ext : `.${ext}`);
  }

  /**
   * Parse comma-separated list into array
   */
  parseList(input) {
    if (Array.isArray(input)) return input;

    return input
      .split(',')
      .map(item => item.trim())
      .filter(item => item);
  }
}
