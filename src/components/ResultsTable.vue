<template>
  <div class="results-table">
    <h3>Pages ({{ pages.length }})</h3>

    <div v-if="pages.length === 0" class="no-results">
      No pages to display
    </div>

    <div v-else class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th @click="toggleSort('statusCode')" class="sortable">
              Status
              <span v-if="sortBy === 'statusCode'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
            <th @click="toggleSort('url')" class="sortable url-col">
              URL
              <span v-if="sortBy === 'url'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
            <th>Title</th>
            <th>H1</th>
            <th @click="toggleSort('responseTime')" class="sortable">
              Time (ms)
              <span v-if="sortBy === 'responseTime'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="page in sortedPages"
            :key="page.url"
            class="table-row"
            :class="{ 'row-pending': !page.isCrawled }"
          >
            <td class="status-cell">
              <button v-if="page.isCrawled" :class="getStatusBadgeClass(page.statusCode)" class="badge badge-clickable" @click="$emit('filter-status', page.statusCode)" :title="'Filter by status ' + page.statusCode">
                {{ page.statusCode }}
              </button>
              <span v-else class="badge badge-pending">pending</span>
            </td>
            <td class="url-cell">
              <a :href="page.url" target="_blank" rel="noopener noreferrer" class="url-link">
                {{ truncateUrl(page.url) }}
              </a>
            </td>
            <td class="truncate" :title="page.title">{{ page.title }}</td>
            <td class="truncate" :title="page.h1">{{ page.h1 }}</td>
            <td class="number">{{ page.responseTime || '-' }}</td>
            <td class="actions-cell">
              <button
                v-if="page.isCrawled"
                @click="$emit('select-page', page)"
                class="btn-small"
              >
                Details
              </button>
              <span v-else class="text-muted">waiting...</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'ResultsTable',
  props: {
    pages: Array
  },
  emits: ['select-page', 'filter-status'],
  setup(props) {
    const sortBy = ref('statusCode')
    const sortOrder = ref('asc')

    const sortedPages = computed(() => {
      const sorted = [...props.pages]
      sorted.sort((a, b) => {
        let aVal = a[sortBy.value]
        let bVal = b[sortBy.value]

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = bVal.toLowerCase()
        }

        if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
        if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
        return 0
      })
      return sorted
    })

    function toggleSort(column) {
      if (sortBy.value === column) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortBy.value = column
        sortOrder.value = 'asc'
      }
    }

    function getStatusBadgeClass(status) {
      if (status >= 200 && status < 300) return 'badge-success'
      if (status >= 300 && status < 400) return 'badge-info'
      if (status >= 400 && status < 500) return 'badge-warning'
      if (status >= 500) return 'badge-danger'
      return 'badge-secondary'
    }

    function truncateUrl(url) {
      if (url.length > 60) {
        return url.substring(0, 57) + '...'
      }
      return url
    }

    return {
      sortBy,
      sortOrder,
      sortedPages,
      toggleSort,
      getStatusBadgeClass,
      truncateUrl
    }
  }
}
</script>

<style scoped>
.results-table {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.results-table h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
}

.no-results {
  text-align: center;
  color: #999;
  padding: 1.5rem;
  font-size: 0.9rem;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 4px;
  border: 1px solid #eee;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.table thead {
  background: #f9f9f9;
  border-bottom: 1px solid #ddd;
}

.table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  font-size: 0.8rem;
  user-select: none;
}

.table th.sortable {
  cursor: pointer;
  user-select: none;
}

.table th.sortable:hover {
  background: #f0f0f0;
}

.sort-indicator {
  margin-left: 0.15rem;
  font-size: 0.7rem;
}

.table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.85rem;
}

.table-row:hover {
  background: #fafafa;
}

.status-cell {
  width: 60px;
}

.url-cell {
  max-width: 280px;
}

.url-col {
  width: 280px;
}

.url-link {
  color: #667eea;
  text-decoration: none;
  word-break: break-all;
  font-size: 0.8rem;
}

.url-link:hover {
  text-decoration: underline;
}

.truncate {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-clickable {
  cursor: pointer;
  border: none;
  background-color: inherit;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.badge-clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.badge-success {
  background: #e8f5e9;
  color: #388e3c;
}

.badge-info {
  background: #e3f2fd;
  color: #1976d2;
}

.badge-warning {
  background: #fff3e0;
  color: #f57c00;
}

.badge-danger {
  background: #ffebee;
  color: #c62828;
}

.badge-secondary {
  background: #f5f5f5;
  color: #666;
}

.number {
  text-align: right;
  font-family: monospace;
  font-size: 0.8rem;
}

.actions-col {
  width: 80px;
  text-align: center;
}

.actions-cell {
  text-align: center;
}

.btn-small {
  padding: 0.3rem 0.6rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover {
  background: #5568d3;
}

.row-pending {
  opacity: 0.6;
  background: #f9f9f9;
}

.badge-pending {
  background: #e0e0e0;
  color: #999;
}

.text-muted {
  color: #999;
  font-size: 0.9rem;
}
</style>
