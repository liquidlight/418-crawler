<template>
  <div class="results-stats">
    <h2>Results Summary</h2>

    <div class="stats-container">
      <div class="stat-card">
        <h3>Total Pages</h3>
        <p class="stat-value">{{ pages.length }}</p>
      </div>

      <div class="stat-card">
        <h3>Status Codes</h3>
        <div class="status-breakdown" v-if="sortedStatuses && sortedStatuses.length > 0">
          <div v-for="item in statusItems" :key="`status-${item.code}`" class="breakdown-item">
            <span class="label">{{ item.code }}:</span>
            <span class="badge" :class="getBadgeClass(item.code)">{{ item.count }}</span>
          </div>
          <div v-if="pendingCount > 0" class="breakdown-item">
            <span class="label">Pending:</span>
            <span class="badge badge-secondary">{{ pendingCount }}</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <h3>File Types</h3>
        <div class="type-breakdown">
          <div v-for="type in sortedTypes" :key="type" class="breakdown-item">
            <span class="label">{{ type }}:</span>
            <span class="count">{{ getTypeCount(type) }}</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <h3>External Links</h3>
        <p class="stat-value">{{ externalLinkCount }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, toRaw } from 'vue'
import { getStatusBadgeClass } from '../utils/statusBadges.js'

export default {
  name: 'ResultsStats',
  props: {
    pages: Array
  },
  setup(props) {
    const externalLinkCount = computed(() => {
      return props.pages.reduce((sum, page) => sum + (page.externalLinks?.length || 0), 0)
    })

    // Compute status counts directly from pages
    const computedStatusCounts = computed(() => {
      const counts = {}
      props.pages.forEach(page => {
        const code = page.statusCode
        counts[code] = (counts[code] || 0) + 1
      })
      return counts
    })

    const pendingCount = computed(() => {
      // Count all pages that haven't been crawled yet
      return props.pages.filter(p => !p.isCrawled).length
    })

    // Get sorted list of status codes (exclude null/pending)
    const sortedStatuses = computed(() => {
      const codes = []
      Object.keys(computedStatusCounts.value).forEach(code => {
        if (code !== 'null' && code !== 'undefined') {
          const num = parseInt(code)
          if (!isNaN(num)) {
            codes.push(num)
          }
        }
      })
      return codes.sort((a, b) => a - b)
    })

    // Create plain array of status items for rendering (avoid reactive issues)
    const statusItems = computed(() => {
      const counts = toRaw(computedStatusCounts.value)
      return sortedStatuses.value.map(code => ({
        code: code,
        count: counts[code] || 0
      }))
    })

    // Compute file type counts directly from pages
    const computedFileCounts = computed(() => {
      const counts = {}
      props.pages.forEach(page => {
        const type = page.fileType
        counts[type] = (counts[type] || 0) + 1
      })
      return counts
    })

    // Get sorted list of file types
    const sortedTypes = computed(() => {
      return Object.keys(computedFileCounts.value).sort()
    })

    function getBadgeClass(status) {
      return getStatusBadgeClass(status)
    }

    function getTypeCount(type) {
      return computedFileCounts.value[type] || 0
    }

    return {
      externalLinkCount,
      pendingCount,
      sortedStatuses,
      statusItems,
      sortedTypes,
      getBadgeClass,
      getTypeCount
    }
  }
}
</script>

<style scoped>
.results-stats {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.results-stats h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.3rem;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 1rem;
}

.stat-card h3 {
  margin: 0 0 0.75rem 0;
  color: #666;
  font-size: 0.95rem;
  font-weight: 600;
}

.stat-value {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: #667eea;
}

.status-breakdown,
.type-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.label {
  color: #666;
}

.count {
  font-weight: 600;
  color: #333;
}

</style>
