/**
 * Utility functions for text formatting and display
 * Used across components to maintain consistent text handling
 */

/**
 * Truncate a URL to a maximum display length
 * Adds ellipsis if URL exceeds the limit
 * @param {string} url - URL to truncate
 * @param {number} maxLength - Maximum display length (default: 70)
 * @returns {string} - Truncated URL
 */
export function truncateUrl(url, maxLength = 70) {
  if (url.length > maxLength) {
    return url.substring(0, maxLength - 3) + '...'
  }
  return url
}
