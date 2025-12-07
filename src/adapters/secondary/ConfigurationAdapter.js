import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ConfigurationPort } from '../../domain/ports/ConfigurationPort.js';
import { Configuration } from '../../domain/entities/Configuration.js';

const CONFIG_FILENAME = '.pappetizer.config.json';

/**
 * Configuration adapter for reading/writing config to filesystem
 */
export class ConfigurationAdapter extends ConfigurationPort {
  constructor(configDir = null) {
    super();
    // Default to user's home directory
    this.configDir = configDir || os.homedir();
  }

  /**
   * Get the full path to the configuration file
   */
  getConfigPath() {
    return path.join(this.configDir, CONFIG_FILENAME);
  }

  /**
   * Load configuration from file
   * @returns {Promise<Configuration|null>}
   */
  async load() {
    const configPath = this.getConfigPath();

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const json = JSON.parse(content);
      return Configuration.fromJSON(json);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // Config doesn't exist yet
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Save configuration to file
   * @param {Configuration} config
   */
  async save(config) {
    const configPath = this.getConfigPath();

    // Validate before saving
    const validation = config.validate();
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const content = JSON.stringify(config.toJSON(), null, 2);
    await fs.writeFile(configPath, content, 'utf-8');
  }

  /**
   * Check if configuration file exists
   */
  async exists() {
    const configPath = this.getConfigPath();

    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load configuration or return defaults
   * @returns {Promise<Configuration>}
   */
  async loadOrDefault() {
    const config = await this.load();
    return config || Configuration.getDefaults();
  }
}
