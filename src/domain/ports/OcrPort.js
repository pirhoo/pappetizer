/**
 * Port interface for OCR operations
 */
export class OcrPort {
  /**
   * Extract text from an image buffer
   * @param {Buffer} _imageBuffer - Image data
   * @returns {Promise<string>} - Extracted text
   */
  async extractText(_imageBuffer) {
    throw new Error('Method not implemented');
  }

  /**
   * Initialize the OCR engine
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method not implemented');
  }

  /**
   * Cleanup OCR resources
   * @returns {Promise<void>}
   */
  async terminate() {
    throw new Error('Method not implemented');
  }
}
