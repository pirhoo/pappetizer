import Anthropic from '@anthropic-ai/sdk';
import { LlmPort } from '../../domain/ports/LlmPort.js';

/**
 * LLM adapter using Anthropic's Claude API for receipt data extraction
 */
export class LlmAdapter extends LlmPort {
  constructor(apiKey = null, model = 'claude-3-haiku-20240307') {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.client = null;

    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  /**
   * Check if LLM is available and configured
   * @returns {boolean}
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * Extract receipt data using Claude
   * @param {string} text - OCR text from receipt
   * @param {object} vendorAliases - Optional vendor aliases for context
   * @returns {Promise<{vendor: string|null, date: Date|null, amount: number|null, currency: string|null}>}
   */
  async extractReceiptData(text, vendorAliases = {}) {
    if (!this.isAvailable()) {
      throw new Error('LLM not configured. Please provide an Anthropic API key.');
    }

    // Build vendor aliases context if available
    let aliasesContext = '';
    const aliasEntries = Object.entries(vendorAliases);
    if (aliasEntries.length > 0) {
      const aliasesList = aliasEntries
        .map(([from, to]) => `- "${from}" should be "${to}"`)
        .join('\n');
      aliasesContext = `\n\nUser-preferred vendor name mappings (apply these when relevant):\n${aliasesList}`;
    }

    const systemPrompt = `You are a receipt data extraction assistant. Your task is to extract structured data from receipt text.

Extract the following fields:
- vendor: The business/store name (clean, standardized name)
- date: The transaction date in ISO format (YYYY-MM-DD)
- amount: The total amount paid (as a number, without currency symbol)
- currency: The 3-letter currency code (e.g., USD, EUR, CHF, GBP)

Respond ONLY with valid JSON in this exact format:
{
  "vendor": "Store Name" or null,
  "date": "YYYY-MM-DD" or null,
  "amount": 123.45 or null,
  "currency": "USD" or null
}

Important rules:
- For vendor, extract the main business name, not addresses or store numbers
- For date, look for transaction/purchase date, not print date
- For amount, extract the TOTAL or final amount paid, not subtotals or individual items
- For currency, infer from symbols ($, €, £, Fr., CHF) or context
- If you cannot confidently determine a value, use null
- Do not include any explanation, only the JSON object${aliasesContext}`;

    const userPrompt = `Extract receipt data from this text:\n\n${text}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 256,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from LLM');
      }

      const result = this.parseResponse(content.text);
      return result;
    } catch (error) {
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key');
      }
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Parse LLM response into structured data
   * @param {string} responseText - Raw text response from LLM
   * @returns {{vendor: string|null, date: Date|null, amount: number|null, currency: string|null}}
   */
  parseResponse(responseText) {
    // Try to extract JSON from response
    let jsonStr = responseText.trim();

    // Handle case where LLM wraps JSON in markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      return {
        vendor: parsed.vendor || null,
        date: parsed.date ? new Date(parsed.date) : null,
        amount: typeof parsed.amount === 'number' ? parsed.amount : null,
        currency: parsed.currency || null,
      };
    } catch {
      // If parsing fails, return all nulls
      return {
        vendor: null,
        date: null,
        amount: null,
        currency: null,
      };
    }
  }
}
