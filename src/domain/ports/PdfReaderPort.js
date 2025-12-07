/**
 * Port interface for PDF reading operations
 */
export class PdfReaderPort {
  /**
   * Extract text content from a PDF
   * @param {Buffer} _pdfBuffer - PDF file data
   * @returns {Promise<string>} - Extracted text
   */
  async extractText(_pdfBuffer) {
    throw new Error('Method not implemented');
  }

  /**
   * Extract images from a PDF
   * @param {Buffer} _pdfBuffer - PDF file data
   * @returns {Promise<Buffer[]>} - Array of image buffers
   */
  async extractImages(_pdfBuffer) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if PDF contains searchable text
   * @param {Buffer} _pdfBuffer - PDF file data
   * @returns {Promise<boolean>}
   */
  async hasText(_pdfBuffer) {
    throw new Error('Method not implemented');
  }
}
