import { LlmPort } from '../../domain/ports/LlmPort.js';

/**
 * LLM adapter using Ollama for local receipt data extraction
 */
export class OllamaAdapter extends LlmPort {
  constructor(host = 'http://localhost:11434', model = 'llama3.2') {
    super();
    this.host = host ? host.replace(/\/$/, '') : ''; // Remove trailing slash
    this.model = model;
    this._available = null; // Cached availability check
  }

  /**
   * Check if LLM is available and configured
   * @returns {boolean}
   */
  isAvailable() {
    // Return cached result if we have one, otherwise assume available
    // Real check happens in extractReceiptData
    return this.host !== null && this.host !== '';
  }

  /**
   * Check if Ollama server is reachable
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Extract receipt data using Ollama
   * @param {string} text - OCR text from receipt
   * @param {object} vendorAliases - Optional vendor aliases for context
   * @returns {Promise<{vendor: string|null, date: Date|null, amount: number|null, currency: string|null}>}
   */
  async extractReceiptData(text, vendorAliases = {}) {
    if (!this.isAvailable()) {
      throw new Error('Ollama not configured. Please provide a valid host.');
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
      const response = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          format: 'json',
          options: {
            temperature: 0,
            num_predict: 256,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Model '${this.model}' not found. Please pull it with: ollama pull ${this.model}`);
        }
        const errorText = await response.text().catch(() => '');
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // Check for error in response
      if (data.error) {
        throw new Error(data.error);
      }

      // Ollama chat API returns { message: { role: "assistant", content: "..." }, done: true }
      // Ollama generate API returns { response: "..." }
      let content = data.response;

      if (data.message) {
        // message can be { role, content, thinking } or just a string in some versions
        // Some models put output in 'thinking' field instead of 'content'
        if (typeof data.message === 'string') {
          content = data.message;
        } else {
          content = data.message.content || data.message.thinking;
        }
      }

      if (!content) {
        // Check if the response indicates it's still processing
        if (data.done === false) {
          throw new Error('Ollama returned incomplete response');
        }
        // Provide more context about what we received
        const messageInfo = data.message
          ? `message keys: ${Object.keys(data.message).join(', ')}`
          : 'no message';
        throw new Error(`Ollama returned empty content. ${messageInfo}`);
      }

      return this.parseResponse(content);
    } catch (error) {
      if (error.cause?.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.host}. Is it running?`);
      }
      if (error.message.includes('Model') || error.message.includes('Cannot connect') || error.message.includes('Unexpected response')) {
        throw error;
      }
      throw new Error(`Ollama API error: ${error.message}`);
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

    // Ollama models sometimes include extra text before/after JSON
    // Try to find JSON object in the response
    const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      jsonStr = jsonObjectMatch[0];
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
