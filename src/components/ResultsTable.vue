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
            <th>Type</th>
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
            :class="{ 'row-pending': !page.isCrawled && !page.isExternal }"
          >
            <td class="status-cell">
              <button v-if="page.isCrawled" :class="getStatusBadgeClass(page.statusCode)" class="badge badge-clickable" @click="$emit('filter-status', page.statusCode)" :title="'Filter by status ' + page.statusCode">
                {{ page.statusCode }}
              </button>
              <span v-else class="badge badge-pending">pending</span>
            </td>
            <td class="type-cell">
              <span class="badge" :class="page.isExternal ? 'badge-external' : 'badge-internal'">
                {{ page.isExternal ? 'external' : 'internal' }}
              </span>
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
import { TABLE_CONFIG } from '../utils/constants.js'
import { getStatusBadgeClass } from '../utils/statusBadges.js'
import { truncateUrl } from '../utils/textFormatting.js'

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
  padding: 0.75rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.results-table h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 0.9rem;
  font-weight: 600;
}

.no-results {
  text-align: center;
  color: #999;
  padding: 1rem;
  font-size: 0.85rem;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.table thead {
  background: #f7f7f7;
  border-bottom: 1px solid #e0e0e0;
}

.table th {
  padding: 0.4rem 0.5rem;
  text-align: left;
  font-weight: 600;
  color: #444;
  font-size: 0.75rem;
  user-select: none;
}

.table th.sortable {
  cursor: pointer;
  user-select: none;
}

.table th.sortable:hover {
  background: #efefef;
}

.sort-indicator {
  margin-left: 0.1rem;
  font-size: 0.6rem;
}

.table td {
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid #f5f5f5;
  font-size: 0.8rem;
}

.table-row:hover {
  background: #fcfcfc;
}

.status-cell {
  width: 55px;
}

.type-cell {
  width: 65px;
}

.url-cell {
  max-width: 260px;
}

.url-col {
  width: 260px;
}

.url-link {
  color: #667eea;
  text-decoration: none;
  word-break: break-all;
  font-size: 0.75rem;
}

.url-link:hover {
  text-decoration: underline;
}

.truncate {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
}

/* Component-specific badge sizing */
.badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 8px;
  font-size: 0.7rem;
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

/* Badge color variants are imported from shared badges.css */

.number {
  text-align: right;
  font-family: monospace;
  font-size: 0.75rem;
}

.actions-col {
  width: 70px;
  text-align: center;
}

.actions-cell {
  text-align: center;
}

.btn-small {
  padding: 0.2rem 0.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 2px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover {
  background: #5568d3;
}

.row-pending {
  opacity: 0.6;
  background: #fafafa;
}

.badge-pending {
  background: #e0e0e0;
  color: #999;
}

.badge-external {
  background: #e8f4f8;
  color: #0277bd;
}

.badge-internal {
  background: #f0f4ff;
  color: #667eea;
}

.text-muted {
  color: #999;
  font-size: 0.8rem;
}
</style>
