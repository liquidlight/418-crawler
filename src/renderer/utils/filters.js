/**
 * Filters a list of pages by status code
 * Supports both individual codes (301) and grouped codes (3XX)
 */
export function filterByStatusCode(pages, statusCodes) {
  if (!statusCodes || statusCodes.length === 0) {
    return pages
  }

  return pages.filter(page => {
    const pageStatus = page.statusCode
    if (!pageStatus) return false

    return statusCodes.some(code => {
      // If code is grouped (e.g., "3XX"), check if page status falls in that range
      if (code.endsWith('XX')) {
        const hundreds = parseInt(code)
        const pageHundreds = Math.floor(pageStatus / 100)
        return hundreds === pageHundreds
      }
      // If code is specific (e.g., 301), match exactly
      return code === pageStatus
    })
  })
}

/**
 * Filters a list of pages by file type
 */
export function filterByFileType(pages, fileTypes) {
  if (!fileTypes || fileTypes.length === 0) {
    return pages
  }
  return pages.filter(page => fileTypes.includes(page.fileType))
}

/**
 * Filters pages by search term (URL or title)
 */
export function filterBySearch(pages, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return pages
  }

  const term = searchTerm.toLowerCase()
  return pages.filter(page =>
    page.url.toLowerCase().includes(term) ||
    (page.title && page.title.toLowerCase().includes(term))
  )
}

/**
 * Applies multiple filters in sequence
 */
export function applyFilters(pages, filters) {
  let result = pages

  if (filters.statusCodes) {
    result = filterByStatusCode(result, filters.statusCodes)
  }

  if (filters.fileTypes) {
    result = filterByFileType(result, filters.fileTypes)
  }

  if (filters.searchTerm) {
    result = filterBySearch(result, filters.searchTerm)
  }

  return result
}
