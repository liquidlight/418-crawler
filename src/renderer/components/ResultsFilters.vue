<template>
  <div class="results-filters">
    <h3>Filters</h3>

    <div class="filters-grid">
      <!-- Status Code Filter -->
      <div class="filter-group">
        <label class="filter-label">Status Codes</label>
        <div class="filter-options">
          <label
            v-for="code in availableStatusCodes"
            :key="code"
            class="checkbox-label"
          >
            <input
              type="checkbox"
              :checked="selectedStatusCodes.includes(code)"
              @change="$emit('toggle-status', code)"
              class="checkbox"
            />
            <span class="label-text">{{ code }} ({{ getStatusCodeCount(code) }})</span>
          </label>
        </div>
      </div>

      <!-- File Type Filter -->
      <div class="filter-group">
        <label class="filter-label">File Types</label>
        <div class="filter-options">
          <label
            v-for="type in availableFileTypes"
            :key="type"
            class="checkbox-label"
          >
            <input
              type="checkbox"
              :checked="selectedFileTypes.includes(type)"
              @change="$emit('toggle-type', type)"
              class="checkbox"
            />
            <span class="label-text">{{ type }} ({{ getFileTypeCount(type) }})</span>
          </label>
        </div>
      </div>

      <!-- Search Filter -->
      <div class="filter-group">
        <label class="filter-label">Search</label>
        <input
          type="text"
          :value="searchTerm"
          @input="$emit('search', $event.target.value)"
          placeholder="Search URLs or titles..."
          class="search-input"
        />
      </div>
    </div>

    <button
      @click="$emit('clear')"
      :disabled="!hasActiveFilters"
      class="btn btn-clear"
    >
      Clear All Filters
    </button>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ResultsFilters',
  props: {
    pages: Array,
    selectedStatusCodes: Array,
    selectedFileTypes: Array,
    searchTerm: String
  },
  emits: ['toggle-status', 'toggle-type', 'search', 'clear'],
  setup(props) {
    const hasActiveFilters = computed(() => {
      return (
        props.selectedStatusCodes.length > 0 ||
        props.selectedFileTypes.length > 0 ||
        props.searchTerm !== ''
      )
    })

    // Compute unique status codes from pages
    const availableStatusCodes = computed(() => {
      const codes = new Set()
      props.pages.forEach(page => {
        if (page.statusCode) {
          codes.add(page.statusCode)
        }
      })
      return Array.from(codes).sort((a, b) => a - b)
    })

    // Compute unique file types from pages
    const availableFileTypes = computed(() => {
      const types = new Set()
      props.pages.forEach(page => {
        if (page.fileType) {
          types.add(page.fileType)
        }
      })
      return Array.from(types).sort()
    })

    // Compute status counts directly from pages
    const computedStatusCount = computed(() => {
      const counts = {}
      props.pages.forEach(page => {
        if (page.statusCode) {
          counts[page.statusCode] = (counts[page.statusCode] || 0) + 1
        }
      })
      return counts
    })

    // Compute file type counts directly from pages
    const computedFileTypeCount = computed(() => {
      const counts = {}
      props.pages.forEach(page => {
        if (page.fileType) {
          counts[page.fileType] = (counts[page.fileType] || 0) + 1
        }
      })
      return counts
    })

    // Methods to get counts for a specific code/type
    function getStatusCodeCount(code) {
      const counts = {}
      props.pages.forEach(page => {
        if (page.statusCode) {
          counts[page.statusCode] = (counts[page.statusCode] || 0) + 1
        }
      })
      return counts[code] || 0
    }

    function getFileTypeCount(type) {
      const counts = {}
      props.pages.forEach(page => {
        if (page.fileType) {
          counts[page.fileType] = (counts[page.fileType] || 0) + 1
        }
      })
      return counts[type] || 0
    }

    return {
      hasActiveFilters,
      availableStatusCodes,
      availableFileTypes,
      getStatusCodeCount,
      getFileTypeCount
    }
  }
}
</script>

<style scoped>
.results-filters {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.results-filters h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  user-select: none;
}

.checkbox {
  cursor: pointer;
  accent-color: #667eea;
}

.label-text {
  color: #666;
}

.checkbox:checked + .label-text {
  color: #333;
  font-weight: 600;
}

.search-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: monospace;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-clear {
  width: 100%;
  padding: 0.75rem;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover:not(:disabled) {
  background: #efefef;
  border-color: #999;
}

.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
