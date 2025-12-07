/**
 * Port interface for LLM-based data extraction
 */
export class LlmPort {
  /**
   * Extract receipt data using LLM
   * @param {string} _text - OCR text from receipt
   * @returns {Promise<{vendor: string|null, date: Date|null, amount: number|null, currency: string|null}>}
   */
  async extractReceiptData(_text) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if LLM is available and configured
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error('Method not implemented');
  }
}
