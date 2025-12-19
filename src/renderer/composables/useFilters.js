import { ref, computed, toRaw } from 'vue'
import { applyFilters } from '../utils/filters.js'

export function useFilters(pages) {
  const selectedStatusCodes = ref([])
  const selectedFileTypes = ref([])
  const searchTerm = ref('')

  // Get unique status codes from pages
  const availableStatusCodes = computed(() => {
    const codes = new Set()
    pages.value.forEach(page => {
      if (page.statusCode) {
        codes.add(page.statusCode)
      }
    })
    return Array.from(codes).sort((a, b) => a - b)
  })

  // Get unique file types from pages
  const availableFileTypes = computed(() => {
    const types = new Set()
    pages.value.forEach(page => {
      if (page.fileType) {
        types.add(page.fileType)
      }
    })
    return Array.from(types).sort()
  })

  // Apply all filters
  const filteredPages = computed(() => {
    return applyFilters(pages.value, {
      statusCodes: selectedStatusCodes.value.length > 0 ? selectedStatusCodes.value : null,
      fileTypes: selectedFileTypes.value.length > 0 ? selectedFileTypes.value : null,
      searchTerm: searchTerm.value
    })
  })

  /**
   * Toggle a status code filter
   */
  function toggleStatusCode(code) {
    const index = selectedStatusCodes.value.indexOf(code)
    if (index > -1) {
      selectedStatusCodes.value.splice(index, 1)
    } else {
      selectedStatusCodes.value.push(code)
    }
  }

  /**
   * Toggle a file type filter
   */
  function toggleFileType(type) {
    const index = selectedFileTypes.value.indexOf(type)
    if (index > -1) {
      selectedFileTypes.value.splice(index, 1)
    } else {
      selectedFileTypes.value.push(type)
    }
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    selectedStatusCodes.value = []
    selectedFileTypes.value = []
    searchTerm.value = ''
  }

  /**
   * Check if a status code is selected
   */
  function isStatusCodeSelected(code) {
    return selectedStatusCodes.value.includes(code)
  }

  /**
   * Check if a file type is selected
   */
  function isFileTypeSelected(type) {
    return selectedFileTypes.value.includes(type)
  }

  /**
   * Get count of pages with a specific status
   */
  const statusCount = computed(() => {
    const counts = {}
    pages.value.forEach(page => {
      const code = page.statusCode
      counts[code] = (counts[code] || 0) + 1
    })
    return toRaw(counts)
  })

  /**
   * Get count of pages with a specific file type
   */
  const fileTypeCount = computed(() => {
    const counts = {}
    pages.value.forEach(page => {
      const type = page.fileType
      counts[type] = (counts[type] || 0) + 1
    })
    return toRaw(counts)
  })

  return {
    // State
    selectedStatusCodes,
    selectedFileTypes,
    searchTerm,

    // Computed
    availableStatusCodes,
    availableFileTypes,
    filteredPages,
    statusCount,
    fileTypeCount,

    // Methods
    toggleStatusCode,
    toggleFileType,
    clearFilters,
    isStatusCodeSelected,
    isFileTypeSelected
  }
}
