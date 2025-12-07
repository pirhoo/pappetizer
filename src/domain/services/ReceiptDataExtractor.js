import { InventoryLoader } from './InventoryLoader.js';
import { CurrencyService } from './CurrencyService.js';
import { MonthService } from './MonthService.js';

/**
 * Service to extract receipt data (vendor, date, amount, currency) from text
 * Uses multiple heuristics and pattern matching for accurate extraction
 */
export class ReceiptDataExtractor {
  constructor() {
    this.knownVendors = InventoryLoader.loadVendors();
    this.monthService = new MonthService();
    this.currencyService = new CurrencyService();
  }

  /**
   * Extract receipt data from OCR text
   */
  extract(text) {
    const currency = this.extractCurrency(text);
    return {
      vendor: this.extractVendor(text),
      date: this.extractDate(text),
      amount: this.extractAmount(text),
      currency: currency,
    };
  }

  /**
   * Extract vendor name with multiple heuristics
   */
  extractVendor(text) {
    if (!text) return null;

    const normalizedText = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // 1. Check against known vendors database first (most reliable)
    const knownVendor = this.matchKnownVendor(normalizedText);
    if (knownVendor) return knownVendor;

    // 2. Look for explicit vendor labels
    const labeledVendor = this.extractLabeledVendor(text);
    if (labeledVendor) return this.cleanVendorName(labeledVendor);

    // 3. Look for business name patterns (LLC, Inc, Ltd, etc.)
    const businessName = this.extractBusinessName(text);
    if (businessName) return this.cleanVendorName(businessName);

    // 4. Look for logo/header text (usually first meaningful lines)
    const headerVendor = this.extractFromHeader(lines);
    if (headerVendor) return this.cleanVendorName(headerVendor);

    // 5. Look for website/email domains
    const domainVendor = this.extractFromDomain(text);
    if (domainVendor) return this.cleanVendorName(domainVendor);

    // 6. Look for "Thank you for shopping at" patterns
    const thankYouVendor = this.extractFromThankYou(text);
    if (thankYouVendor) return this.cleanVendorName(thankYouVendor);

    // 7. Look for "Store #" patterns with preceding name
    const storeVendor = this.extractFromStoreNumber(text);
    if (storeVendor) return this.cleanVendorName(storeVendor);

    return null;
  }

  matchKnownVendor(normalizedText) {
    for (const vendor of this.knownVendors) {
      for (const pattern of vendor.patterns) {
        if (normalizedText.includes(pattern.toLowerCase())) {
          return vendor.name;
        }
      }
    }
    return null;
  }

  extractLabeledVendor(text) {
    const patterns = [
      /(?:vendor|merchant|store|shop|restaurant|retailer|seller|sold by|purchased (?:from|at)|billed by|payee)[\s:]+([^\n\r,;]+)/i,
      /(?:from|at)[\s:]+([A-Z][A-Za-z0-9\s&'\-\.]+?)(?:\s*(?:\n|,|$))/,
      /(?:receipt from|invoice from|bill from)[\s:]+([^\n\r]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (this.isValidVendorName(vendor)) {
          return vendor;
        }
      }
    }
    return null;
  }

  extractBusinessName(text) {
    const patterns = [
      // Business suffixes
      /([A-Z][A-Za-z0-9\s&'\-\.]+?)\s*(?:LLC|L\.L\.C\.|Inc\.?|INC|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|GmbH|AG|SA|SAS|SARL|BV|NV|PLC|Pty|Co\.?|Company)\b/i,
      // "DBA" (Doing Business As)
      /(?:d\.?b\.?a\.?|doing business as)[\s:]+([^\n\r,]+)/i,
      // Registered trademark or service mark
      /([A-Z][A-Za-z0-9\s&'\-]+?)[\s]*[®™©]/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (this.isValidVendorName(name)) {
          return name;
        }
      }
    }
    return null;
  }

  extractFromHeader(lines) {
    // Skip receipt title lines and look for meaningful business names
    const skipPatterns = [
      /^(receipt|invoice|bill|order|transaction|confirmation|payment)/i,
      /^(tax|vat|gst)\s*(receipt|invoice)/i,
      /^\*+$/,
      /^-+$/,
      /^=+$/,
      /^#{1,}/,
      /^\d+$/,
      /^(tel|phone|fax|email|web|www|http)/i,
      /^(customer|cashier|register|terminal|trans)/i,
    ];

    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i];

      // Skip lines matching skip patterns
      let shouldSkip = false;
      for (const pattern of skipPatterns) {
        if (pattern.test(line)) {
          shouldSkip = true;
          break;
        }
      }
      if (shouldSkip) continue;

      // Skip if it looks like a date, amount, or address
      if (!this.isValidVendorName(line)) continue;

      // Check if it looks like a business name (capitalized, reasonable length)
      if (this.looksLikeBusinessName(line)) {
        return line;
      }
    }

    return null;
  }

  looksLikeBusinessName(line) {
    // Too short or too long
    if (line.length < 2 || line.length > 60) return false;

    const letterCount = (line.match(/[a-zA-Z]/g) || []).length;

    if (letterCount === 0) return false;

    // At least some letters and not mostly numbers
    const digitCount = (line.match(/\d/g) || []).length;
    if (digitCount > letterCount) return false;

    // Starts with a letter
    if (!/^[A-Za-z]/.test(line)) return false;

    return true;
  }

  extractFromDomain(text) {
    // Look for website URLs or email domains
    const patterns = [
      /(?:www\.)?([a-z0-9\-]+)\.(?:com|org|net|co|io|shop|store|biz)/i,
      /(?:@)([a-z0-9\-]+)\.(?:com|org|net|co)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const domain = match[1];
        // Check if it's a known vendor
        const known = this.matchKnownVendor(domain.toLowerCase());
        if (known) return known;

        // Otherwise return capitalized domain
        if (domain.length > 2 && domain.length < 30) {
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }
    }
    return null;
  }

  extractFromThankYou(text) {
    const patterns = [
      /thank(?:s|\s*you)?(?:\s+for)?(?:\s+(?:shopping|visiting|dining|choosing|your (?:purchase|order|business)))?\s+(?:at|with)\s+([^\n\r!.]+)/i,
      /welcome\s+to\s+([A-Z][A-Za-z0-9\s&'\-]+)/i,
      /(?:visit|see)\s+(?:us|again)\s+(?:at|soon)\s+([A-Z][A-Za-z0-9\s&'\-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (this.isValidVendorName(vendor)) {
          return vendor;
        }
      }
    }
    return null;
  }

  extractFromStoreNumber(text) {
    // Look for patterns like "STORENAME Store #123" or "STORENAME #123"
    const patterns = [
      /([A-Z][A-Za-z0-9\s&'\-]+?)\s+(?:store|location|branch|outlet)?\s*#\s*\d+/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (this.isValidVendorName(vendor)) {
          return vendor;
        }
      }
    }
    return null;
  }

  isValidVendorName(name) {
    if (!name || name.length < 2 || name.length > 60) return false;

    // Skip if looks like a date
    if (/^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/.test(name)) return false;

    // Skip if looks like an amount
    if (/^[\$\€\£\¥₣₹]?\s*[\d,]+\.?\d*\s*$/.test(name)) return false;

    // Skip if looks like an address
    if (/\b(street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd|drive|dr\.|lane|ln\.|way|place|pl\.|court|ct\.)\b/i.test(name)) return false;

    // Skip if looks like phone number
    if (/^[\d\s\-\(\)\.+]{7,}$/.test(name)) return false;

    // Skip if looks like a time
    if (/^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i.test(name)) return false;

    // Skip if it's mostly numbers
    const digitRatio = (name.match(/\d/g) || []).length / name.length;
    if (digitRatio > 0.6) return false;

    // Skip common receipt words
    const skipWords = [
      'receipt', 'invoice', 'total', 'subtotal', 'tax', 'change', 'cash', 'credit',
      'debit', 'card', 'payment', 'amount', 'balance', 'due', 'paid', 'qty', 'quantity',
      'item', 'items', 'description', 'price', 'unit', 'discount', 'saving', 'saved',
      'customer', 'cashier', 'register', 'terminal', 'transaction', 'date', 'time',
      'copy', 'duplicate', 'original', 'void', 'refund', 'return', 'exchange',
    ];
    const lowerName = name.toLowerCase();
    for (const word of skipWords) {
      if (lowerName === word) return false;
    }

    return true;
  }

  cleanVendorName(name) {
    if (!name) return null;

    return name
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid filename chars
      .replace(/[®™©]/g, '') // Remove trademark symbols
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[\s\-\.]+|[\s\-\.]+$/g, '') // Trim special chars
      .trim()
      .substring(0, 50);
  }

  /**
   * Extract date with comprehensive pattern matching
   */
  extractDate(text) {
    if (!text) return null;

    // 1. First look for labeled dates (most reliable)
    const labeledDate = this.extractLabeledDate(text);
    if (labeledDate) return labeledDate;

    // 2. Try various date formats
    const allDates = this.findAllDates(text);

    if (allDates.length === 0) return null;

    // 3. Prefer dates that are recent (within last 2 years) and not in future
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    const validDates = allDates.filter(d =>
      d && d.getTime() <= now.getTime() && d.getTime() >= twoYearsAgo.getTime(),
    );

    if (validDates.length > 0) {
      // Return the most recent valid date
      return validDates.sort((a, b) => b.getTime() - a.getTime())[0];
    }

    // 4. Fallback to first found date if no valid recent dates
    return allDates[0];
  }

  extractLabeledDate(text) {
    const labelPatterns = [
      /(?:date|dated|issued|invoice\s*date|receipt\s*date|order\s*date|purchase\s*date|transaction\s*date|trans\.?\s*date|payment\s*date|bill\s*date|sale\s*date)[\s:]+([^\n\r]{5,30})/i,
      /(?:date\s*of\s*(?:purchase|sale|transaction|issue|invoice|receipt))[\s:]+([^\n\r]{5,30})/i,
    ];

    for (const pattern of labelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = this.parseFlexibleDate(match[1].trim());
        if (parsed) return parsed;
      }
    }

    return null;
  }

  findAllDates(text) {
    const dates = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // ISO format: YYYY-MM-DD
      const isoMatch = line.match(/\b(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})\b/);
      if (isoMatch) {
        const date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        if (this.isValidDate(date)) dates.push(date);
      }

      // European/US format: DD/MM/YYYY or MM/DD/YYYY
      const slashMatch = line.match(/\b(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})\b/);
      if (slashMatch) {
        const parsedDates = this.parseAmbiguousDate(
          parseInt(slashMatch[1]),
          parseInt(slashMatch[2]),
          parseInt(slashMatch[3]),
        );
        dates.push(...parsedDates.filter(d => this.isValidDate(d)));
      }

      // Short year: DD/MM/YY or MM/DD/YY
      const shortYearMatch = line.match(/\b(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2})\b/);
      if (shortYearMatch) {
        const year = this.expandYear(parseInt(shortYearMatch[3]));
        const parsedDates = this.parseAmbiguousDate(
          parseInt(shortYearMatch[1]),
          parseInt(shortYearMatch[2]),
          year,
        );
        dates.push(...parsedDates.filter(d => this.isValidDate(d)));
      }

      // Month name formats
      const monthNameDates = this.extractMonthNameDates(line);
      dates.push(...monthNameDates.filter(d => this.isValidDate(d)));

      // German format: DD. Month YYYY or DD.MM.YYYY
      const germanMatch = line.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})\b/);
      if (germanMatch) {
        let year = parseInt(germanMatch[3]);
        if (year < 100) year = this.expandYear(year);
        const date = new Date(year, parseInt(germanMatch[2]) - 1, parseInt(germanMatch[1]));
        if (this.isValidDate(date)) dates.push(date);
      }
    }

    // Remove duplicates
    const uniqueDates = [];
    const seen = new Set();
    for (const date of dates) {
      const key = date.toISOString().split('T')[0];
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDates.push(date);
      }
    }

    return uniqueDates;
  }

  extractMonthNameDates(text) {
    const dates = [];

    // Build month pattern from all recognized month names
    const monthNames = this.monthService.getAllMonthNames();
    const monthPattern = monthNames.join('|');

    // Month DD, YYYY or Month DD YYYY
    const mdyRegex = new RegExp(`\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]+(\\d{4})\\b`, 'gi');
    let match;
    while ((match = mdyRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[1]);
      if (month !== null) {
        const date = new Date(parseInt(match[3]), month, parseInt(match[2]));
        dates.push(date);
      }
    }

    // DD Month YYYY
    const dmyRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${monthPattern})\\.?[,\\s]+(\\d{4})\\b`, 'gi');
    while ((match = dmyRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[2]);
      if (month !== null) {
        const date = new Date(parseInt(match[3]), month, parseInt(match[1]));
        dates.push(date);
      }
    }

    // DD Month YY (short year)
    const dmyShortRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${monthPattern})\\.?[,\\s]+(\\d{2})\\b`, 'gi');
    while ((match = dmyShortRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[2]);
      if (month !== null) {
        const year = this.expandYear(parseInt(match[3]));
        const date = new Date(year, month, parseInt(match[1]));
        dates.push(date);
      }
    }

    // Month YYYY (no day, assume 1st)
    const myRegex = new RegExp(`\\b(${monthPattern})\\.?[,\\s]+(\\d{4})\\b`, 'gi');
    while ((match = myRegex.exec(text)) !== null) {
      const month = this.monthService.getMonthIndex(match[1]);
      if (month !== null) {
        const date = new Date(parseInt(match[2]), month, 1);
        dates.push(date);
      }
    }

    return dates;
  }

  parseAmbiguousDate(a, b, year) {
    const dates = [];

    // Try DD/MM/YYYY (European)
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
      dates.push(new Date(year, b - 1, a));
    }

    // Try MM/DD/YYYY (American)
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      dates.push(new Date(year, a - 1, b));
    }

    return dates;
  }

  expandYear(shortYear) {
    // Assume years 00-50 are 2000s, 51-99 are 1900s
    if (shortYear <= 50) {
      return 2000 + shortYear;
    } else {
      return 1900 + shortYear;
    }
  }

  isValidDate(date) {
    if (!date || isNaN(date.getTime())) return false;

    const year = date.getFullYear();
    // Accept dates from 1990 to next year
    const nextYear = new Date().getFullYear() + 1;
    return year >= 1990 && year <= nextYear;
  }

  parseFlexibleDate(dateStr) {
    if (!dateStr) return null;

    // Clean up the string
    dateStr = dateStr.trim().replace(/\s+/g, ' ');

    // Try native parsing first
    const nativeParsed = new Date(dateStr);
    if (this.isValidDate(nativeParsed)) {
      return nativeParsed;
    }

    // Try our pattern matching
    const dates = this.findAllDates(dateStr);
    return dates.length > 0 ? dates[0] : null;
  }

  /**
   * Extract amount with improved heuristics
   */
  extractAmount(text) {
    if (!text) return null;

    // 1. Look for explicit total labels (highest priority)
    const labeledAmount = this.extractLabeledAmount(text);
    if (labeledAmount !== null) return labeledAmount;

    // 2. Look for amount patterns at end of lines (common in receipts)
    const lineEndAmounts = this.extractLineEndAmounts(text);

    // 3. Find all monetary amounts in text
    const allAmounts = this.findAllAmounts(text);

    // 4. Combine and find the likely total
    const candidates = [...lineEndAmounts, ...allAmounts];

    if (candidates.length === 0) return null;

    // Filter out very small amounts (likely per-item prices) if we have larger ones
    const maxAmount = Math.max(...candidates);
    const minReasonableTotal = maxAmount * 0.3; // Total should be at least 30% of max

    const reasonableAmounts = candidates.filter(a => a >= minReasonableTotal);

    // The total is often the largest amount, but not always
    // Look for amounts that appear after "total" text position
    return reasonableAmounts.length > 0 ? Math.max(...reasonableAmounts) : maxAmount;
  }

  extractLabeledAmount(text) {
    // Patterns ordered by specificity
    const patterns = [
      // Grand total (highest priority)
      /(?:grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*amount|net\s*total|final\s*total)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Regular total
      /(?:^|\n)\s*total[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/im,
      // Total with currency after
      /(?:^|\n)\s*total[\s:]*\s*([\d,]+\.?\d*)\s*(?:usd|eur|gbp|chf|cad|aud)/im,
      // "To pay" / "You pay"
      /(?:to\s*pay|you\s*pay|amount\s*paid|paid\s*amount)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Card/payment amount
      /(?:card|visa|mastercard|amex|debit|credit)\s*(?:amount|payment)?[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Sum
      /(?:sum|summe|somme|suma|totale)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = this.parseAmount(match[1]);
        if (amount !== null && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }

  extractLineEndAmounts(text) {
    const amounts = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for amounts at the end of lines
      const patterns = [
        /[\$€£¥₣₹]\s*([\d,]+\.\d{2})\s*$/,
        /([\d,]+\.\d{2})\s*[\$€£¥₣₹]?\s*$/,
        /([\d,]+\.\d{2})\s*(?:usd|eur|gbp|chf)?$/i,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const amount = this.parseAmount(match[1]);
          if (amount !== null && amount > 0) {
            amounts.push(amount);
            break;
          }
        }
      }
    }

    return amounts;
  }

  findAllAmounts(text) {
    const amounts = [];

    // Pattern for various amount formats
    const patterns = [
      /[\$€£¥₣₹]\s*([\d,]+\.\d{2})/g,
      /[\$€£¥₣₹]\s*([\d,]+)/g,
      /([\d,]+\.\d{2})\s*(?:usd|eur|gbp|chf|cad|aud|jpy|cny)/gi,
      // European format (comma as decimal)
      /([\d.]+,\d{2})\s*[€£]/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = this.parseAmount(match[1]);
        if (amount !== null && amount > 0) {
          amounts.push(amount);
        }
      }
    }

    return [...new Set(amounts)]; // Remove duplicates
  }

  parseAmount(amountStr) {
    if (!amountStr) return null;

    // Handle European format (1.234,56)
    if (/^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(amountStr)) {
      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
    }
    // Handle standard format (1,234.56)
    else {
      amountStr = amountStr.replace(/,/g, '');
    }

    const amount = parseFloat(amountStr);
    return isNaN(amount) ? null : amount;
  }

  /**
   * Extract currency with comprehensive detection
   */
  extractCurrency(text) {
    if (!text) return null;

    // 1. Look for explicit currency labels
    const labeledCurrency = this.extractLabeledCurrency(text);
    if (labeledCurrency) return labeledCurrency;

    // 2. Check for currency codes (most specific)
    const codeCurrency = this.extractCurrencyCode(text);
    if (codeCurrency) return codeCurrency;

    // 3. Check for currency symbols (need context to disambiguate $)
    const symbolCurrency = this.extractCurrencySymbol(text);
    if (symbolCurrency) return symbolCurrency;

    // 4. Check for currency words
    const wordCurrency = this.extractCurrencyWord(text);
    if (wordCurrency) return wordCurrency;

    // 5. Try to infer from country/region hints
    const inferredCurrency = this.currencyService.inferCurrencyFromRegion(text);
    if (inferredCurrency) return inferredCurrency;

    return null;
  }

  extractLabeledCurrency(text) {
    const patterns = [
      /(?:currency|curr\.?|devise)[\s:]+([A-Z]{3})/i,
      /(?:paid\s*in|payment\s*in|amount\s*in)[\s:]+([A-Z]{3})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const code = match[1].toUpperCase();
        if (this.currencyService.isValidCode(code)) {
          return code;
        }
      }
    }
    return null;
  }

  extractCurrencyCode(text) {
    // Get all valid currency codes from the service
    const codes = this.currencyService.getAllCodes();
    const codePattern = new RegExp(`\\b(${codes.join('|')})\\b`, 'i');
    const match = text.match(codePattern);
    if (match) {
      return match[1].toUpperCase();
    }
    return null;
  }

  extractCurrencySymbol(text) {
    const symbolMap = this.currencyService.getSymbolMap();

    // Check compound symbols FIRST (before $ which would match NT$, HK$, etc.)
    // US$ must come before S$ to avoid matching S$ in US$
    const compoundSymbols = ['CHF', 'Fr.', 'SFr.', 'HK$', 'US$', 'S$', 'A$', 'C$', 'NZ$', 'NT$', 'RM'];
    for (const symbol of compoundSymbols) {
      if (text.includes(symbol)) {
        const currencies = symbolMap[symbol];
        if (currencies) {
          return currencies[0];
        }
      }
    }

    // Then check unique symbols and ambiguous $ last
    const symbolOrder = ['€', '£', '¥', '₣', '₹', '₽', '₩', '฿', '₫', '₪', '₴', 'R$', 'zł', 'Kč', 'Ft', '$'];

    for (const symbol of symbolOrder) {
      if (text.includes(symbol)) {
        const currencies = symbolMap[symbol];
        if (currencies && currencies.length === 1) {
          return currencies[0];
        }

        // For ambiguous symbols like $, try to determine from context
        if (symbol === '$') {
          return this.currencyService.disambiguateDollar(text);
        }
      }
    }

    return null;
  }

  extractCurrencyWord(text) {
    const lowerText = text.toLowerCase();
    const wordMap = this.currencyService.getWordMap();

    for (const [word, currency] of Object.entries(wordMap)) {
      const pattern = new RegExp(`\\b${word}s?\\b`, 'i');
      if (pattern.test(lowerText)) {
        return currency;
      }
    }
    return null;
  }
}
