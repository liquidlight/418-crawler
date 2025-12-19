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

/**
 * Convert a specific status code to its grouped form (e.g., 301 -> "3XX")
 * @param {number} status - HTTP status code
 * @returns {string} - Grouped status code (e.g., "3XX")
 */
export function getStatusGroup(status) {
  if (status === null || status === undefined) return null
  const hundreds = Math.floor(status / 100)
  return `${hundreds}XX`
}

/**
 * Group status codes by their hundreds and return grouped codes with counts
 * Only includes groups that have at least one code
 * @param {Array<number>} statuses - Array of HTTP status codes
 * @returns {Array<{group: string, codes: Array<number>, count: number}>} - Grouped status codes
 */
export function groupStatusCodesByHundreds(statuses) {
  const grouped = {}

  statuses.forEach(status => {
    if (status === null || status === undefined) return
    const group = getStatusGroup(status)
    if (!grouped[group]) {
      grouped[group] = new Set()
    }
    grouped[group].add(status)
  })

  return Object.entries(grouped)
    .map(([group, codesSet]) => ({
      group,
      codes: Array.from(codesSet).sort((a, b) => a - b),
      count: statuses.filter(s => getStatusGroup(s) === group).length
    }))
    .sort((a, b) => {
      const aNum = parseInt(a.group)
      const bNum = parseInt(b.group)
      return aNum - bNum
    })
}
