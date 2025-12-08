/**
 * Cleaning utilities for extraction
 */

/**
 * Clean a vendor name for use in filenames
 * @param {string} name
 * @returns {string|null}
 */
export function cleanVendorName(name) {
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
