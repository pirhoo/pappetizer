/**
 * Validation utilities for extraction
 */

/**
 * Check if a string is a valid vendor name
 * @param {string} name
 * @returns {boolean}
 */
export function isValidVendorName(name) {
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

/**
 * Check if a line looks like a business name
 * @param {string} line
 * @returns {boolean}
 */
export function looksLikeBusinessName(line) {
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

/**
 * Check if a date object is valid
 * @param {Date} date
 * @returns {boolean}
 */
export function isValidDate(date) {
  if (!date || isNaN(date.getTime())) return false;

  const year = date.getFullYear();
  // Accept dates from 1990 to next year
  const nextYear = new Date().getFullYear() + 1;
  return year >= 1990 && year <= nextYear;
}
