/**
 * Port interface for user interaction/prompts
 */
export class UserPromptPort {
  /**
   * Prompt user for rename confirmation
   * @param {string} _originalName - Original filename
   * @param {string} _suggestedName - Suggested new filename
   * @param {object} _extractedData - Extracted receipt data (vendor, date, amount, currency)
   * @returns {Promise<{action: 'accept'|'acceptAll'|'editFields'|'manual'|'skip', customName?: string, editedFields?: object}>}
   */
  async promptForRename(_originalName, _suggestedName, _extractedData) {
    throw new Error('Method not implemented');
  }

  /**
   * Display a message to the user
   * @param {string} _message - Message to display
   * @returns {void}
   */
  log(_message) {
    throw new Error('Method not implemented');
  }

  /**
   * Display an error to the user
   * @param {string} _message - Error message
   * @returns {void}
   */
  error(_message) {
    throw new Error('Method not implemented');
  }

  /**
   * Display a success message
   * @param {string} _message - Success message
   * @returns {void}
   */
  success(_message) {
    throw new Error('Method not implemented');
  }

  /**
   * Confirm memorizing a vendor alias
   * @param {string} _from - Original vendor name
   * @param {string} _to - Corrected vendor name
   * @returns {Promise<boolean>}
   */
  async confirmMemorizeVendor(_from, _to) {
    throw new Error('Method not implemented');
  }
}
