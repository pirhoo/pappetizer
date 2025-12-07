import Tesseract from 'tesseract.js';
import { OcrPort } from '../../domain/ports/OcrPort.js';

/**
 * Tesseract.js OCR adapter implementation
 */
export class OcrAdapter extends OcrPort {
  constructor() {
    super();
    this.worker = null;
  }

  /**
   * Initialize the Tesseract worker
   */
  async initialize() {
    if (this.worker) return;

    this.worker = await Tesseract.createWorker('eng', 1, {
      logger: () => {}, // Silent logging
    });
  }

  /**
   * Extract text from an image buffer
   * @param {Buffer} imageBuffer - Image data
   * @returns {Promise<string>}
   */
  async extractText(imageBuffer) {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      const { data: { text } } = await this.worker.recognize(imageBuffer);
      return text || '';
    } catch (error) {
      console.error('OCR error:', error.message);
      return '';
    }
  }

  /**
   * Cleanup Tesseract resources
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
