import pdf from 'pdf-parse';
import { pdf as pdfToImg } from 'pdf-to-img';
import { PdfReaderPort } from '../../domain/ports/PdfReaderPort.js';

/**
 * PDF reader adapter using pdf-parse for text and pdf-to-img for images
 */
export class PdfReaderAdapter extends PdfReaderPort {
  /**
   * Extract text content from a PDF
   * @param {Buffer} pdfBuffer - PDF file data
   * @returns {Promise<string>}
   */
  async extractText(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer);
      return data.text || '';
    } catch (error) {
      // pdf-parse can fail on some PDFs, return empty string
      if (error.message && !error.message.includes('Invalid')) {
        console.error('PDF parsing error:', error.message);
      }
      return '';
    }
  }

  /**
   * Extract images from a PDF (converts PDF pages to PNG images)
   * @param {Buffer} pdfBuffer - PDF file data
   * @returns {Promise<Buffer[]>}
   */
  async extractImages(pdfBuffer) {
    const images = [];

    try {
      const document = await pdfToImg(pdfBuffer, { scale: 2.0 });

      for await (const page of document) {
        images.push(Buffer.from(page));
      }
    } catch (error) {
      console.error('PDF to image conversion error:', error.message);
    }

    return images;
  }

  /**
   * Check if PDF contains searchable text
   * @param {Buffer} pdfBuffer - PDF file data
   * @returns {Promise<boolean>}
   */
  async hasText(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer);
      return data.text && data.text.trim().length > 0;
    } catch {
      return false;
    }
  }
}
