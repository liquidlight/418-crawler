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
    console.log('exportPagesToCSV: Converting', pages.length, 'pages to CSV')
    const csv = pagesToCSV(pages)
    console.log('exportPagesToCSV: CSV length:', csv.length)

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    console.log('exportPagesToCSV: Blob created, size:', blob.size)

    const url = URL.createObjectURL(blob)
    console.log('exportPagesToCSV: Object URL created:', url)

    const link = document.createElement('a')
    link.href = url
    const downloadName = fileName || `crawl-export-${Date.now()}.csv`
    link.download = downloadName
    console.log('exportPagesToCSV: Link created with download:', downloadName)

    document.body.appendChild(link)
    console.log('exportPagesToCSV: Link appended to body')

    link.click()
    console.log('exportPagesToCSV: Link clicked')

    document.body.removeChild(link)
    console.log('exportPagesToCSV: Link removed')

    URL.revokeObjectURL(url)
    console.log('exportPagesToCSV: URL revoked')

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
