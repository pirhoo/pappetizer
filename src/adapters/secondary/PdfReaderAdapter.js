import pdf from 'pdf-parse';
import { pdf as pdfToImg } from 'pdf-to-img';
import { PdfReaderPort } from '../../domain/ports/PdfReaderPort.js';

/**
 * Suppress noisy pdf.js warnings during PDF operations
 */
function suppressPdfWarnings(fn) {
  return async (...args) => {
    const originalWarn = console.warn;
    console.warn = (...warnArgs) => {
      const msg = warnArgs[0]?.toString() || '';
      // Suppress pdf.js internal warnings (TT font warnings, etc.)
      if (msg.includes('Warning: TT:') || msg.includes('Warning: Unimplemented') || msg.includes('Warning: Unknown type')) {
        return;
      }
      originalWarn.apply(console, warnArgs);
    };
    try {
      return await fn(...args);
    } finally {
      console.warn = originalWarn;
    }
  };
}

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
    return suppressPdfWarnings(async () => {
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
    })();
  }

  /**
   * Extract images from a PDF (converts PDF pages to PNG images)
   * @param {Buffer} pdfBuffer - PDF file data
   * @returns {Promise<Buffer[]>}
   */
  async extractImages(pdfBuffer) {
    return suppressPdfWarnings(async () => {
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
    })();
  }

  /**
   * Check if PDF contains searchable text
   * @param {Buffer} pdfBuffer - PDF file data
   * @returns {Promise<boolean>}
   */
  async hasText(pdfBuffer) {
    return suppressPdfWarnings(async () => {
      try {
        const data = await pdf(pdfBuffer);
        return data.text && data.text.trim().length > 0;
      } catch {
        return false;
      }
    })();
  }
}
