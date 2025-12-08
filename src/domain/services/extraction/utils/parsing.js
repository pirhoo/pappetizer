/**
 * Parsing utilities for extraction
 */

/**
 * Parse an amount string into a number
 * @param {string} amountStr
 * @returns {number|null}
 */
export function parseAmount(amountStr) {
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
 * Expand a 2-digit year to 4 digits
 * @param {number} shortYear
 * @returns {number}
 */
export function expandYear(shortYear) {
  // Assume years 00-50 are 2000s, 51-99 are 1900s
  if (shortYear <= 50) {
    return 2000 + shortYear;
  } else {
    return 1900 + shortYear;
  }
}

/**
 * Parse an ambiguous date (DD/MM or MM/DD)
 * @param {number} a - First number
 * @param {number} b - Second number
 * @param {number} year
 * @returns {Date[]}
 */
export function parseAmbiguousDate(a, b, year) {
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

/**
 * Parse a flexible date string
 * @param {string} dateStr
 * @param {function} findAllDates - Function to find dates in text
 * @param {function} isValidDate - Function to validate dates
 * @returns {Date|null}
 */
export function parseFlexibleDate(dateStr, findAllDates, isValidDate) {
  if (!dateStr) return null;

  // Clean up the string
  dateStr = dateStr.trim().replace(/\s+/g, ' ');

  // Try native parsing first
  const nativeParsed = new Date(dateStr);
  if (isValidDate(nativeParsed)) {
    return nativeParsed;
  }

  // Try pattern matching
  const dates = findAllDates(dateStr);
  return dates.length > 0 ? dates[0] : null;
}
