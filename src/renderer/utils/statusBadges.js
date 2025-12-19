/**
 * Utility functions for status badge styling
 * Used across components to maintain consistent status color coding
 */

/**
 * Get CSS class name for HTTP status code badges
 * Maps status codes to Bootstrap badge color classes
 * @param {number} status - HTTP status code
 * @returns {string} - CSS class name (e.g., 'badge-success', 'badge-warning')
 */
export function getStatusBadgeClass(status) {
  if (status >= 200 && status < 300) return 'badge-success'
  if (status >= 300 && status < 400) return 'badge-info'
  if (status >= 400 && status < 500) return 'badge-warning'
  if (status >= 500) return 'badge-danger'
  return 'badge-secondary'
}
