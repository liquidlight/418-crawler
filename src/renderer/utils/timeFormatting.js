/**
 * Utility functions for time formatting and display
 * Used across components to maintain consistent time representation
 */

/**
 * Format milliseconds into human-readable time string
 * Converts to minutes and seconds format (e.g., "5m 32s" or "45s")
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted time string
 */
export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}
