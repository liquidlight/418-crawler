/**
 * Filters a list of pages by status code
 */
export function filterByStatusCode(pages, statusCodes) {
  if (!statusCodes || statusCodes.length === 0) {
    return pages
  }
  return pages.filter(page => statusCodes.includes(page.statusCode))
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
