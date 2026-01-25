/**
 * CSV export utilities for crawler results
 */

/**
 * Convert pages array to CSV format
 */
function pagesToCSV(pages) {
  if (!pages || pages.length === 0) {
    return 'URL,Status Code,Title,Response Time (ms),File Type\n'
  }

  // CSV headers
  const headers = ['URL', 'Status Code', 'Title', 'Response Time (ms)', 'File Type', 'External', 'Crawled At']
  const csv = [headers.map(h => `"${h}"`).join(',')]

  // Convert pages to CSV rows
  for (const page of pages) {
    const row = [
      `"${(page.url || '').replace(/"/g, '""')}"`, // URL with escaped quotes
      page.statusCode || '',
      `"${(page.title || '').replace(/"/g, '""')}"`, // Title with escaped quotes
      page.responseTime || 0,
      page.fileType || '',
      page.isExternal ? 'Yes' : 'No',
      page.crawledAt ? new Date(page.crawledAt).toISOString() : ''
    ]
    csv.push(row.join(','))
  }

  return csv.join('\n')
}

/**
 * Export pages to CSV file
 */
function exportPagesToCSV(pages, fileName) {
  try {
    const csv = pagesToCSV(pages)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const downloadName = fileName || `crawl-export-${Date.now()}.csv`
    link.download = downloadName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true, fileName: downloadName }
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate CSV filename from filter info
 */
function generateCSVFileName(domain, filterInfo = '') {
  const timestamp = new Date().toISOString().split('T')[0]
  const suffix = filterInfo ? `-${filterInfo}` : ''
  return `crawl-${domain}${suffix}-${timestamp}.csv`
}

export { pagesToCSV, exportPagesToCSV, generateCSVFileName }
