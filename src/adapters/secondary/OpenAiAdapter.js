import { LlmPort } from '../../domain/ports/LlmPort.js';

/**
 * LLM adapter using OpenAI's ChatGPT API for receipt data extraction
 */
export class OpenAiAdapter extends LlmPort {
  constructor(apiKey = null, model = 'gpt-4o-mini') {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  /**
   * Check if LLM is available and configured
   * @returns {boolean}
   */
  isAvailable() {
    return this.apiKey !== null && this.apiKey !== '';
  }

  /**
   * Extract receipt data using ChatGPT
   * @param {string} text - OCR text from receipt
   * @param {object} vendorAliases - Optional vendor aliases for context
   * @returns {Promise<{vendor: string|null, date: Date|null, amount: number|null, currency: string|null}>}
   */
  async extractReceiptData(text, vendorAliases = {}) {
    if (!this.isAvailable()) {
      throw new Error('LLM not configured. Please provide an OpenAI API key.');
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 256,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Unexpected response format from OpenAI');
      }

      return this.parseResponse(content);
    } catch (error) {
      if (error.message.includes('Invalid OpenAI API key') ||
          error.message.includes('Rate limit exceeded')) {
        throw error;
      }
      throw new Error(`OpenAI API error: ${error.message}`);
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
