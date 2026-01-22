<template>
  <div style="display: contents">
    <!-- Total Pages -->
    <div class="overview-card">
      <div class="card-header">
        <div class="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Total Pages
        </div>
      </div>
      <div class="big-number">{{ pages.length }}</div>
      <div class="big-number-label">pages discovered</div>
      <div class="progress-chart">
        <div class="chart-bar">
          <div v-for="(count, status) in statusDistribution" :key="status" :style="{ width: getStatusWidth(status) + '%' }" :class="['chart-segment', 's' + status]"></div>
        </div>
        <div class="chart-legend">
          <div class="legend-item"><span class="legend-dot s2xx"></span> 2XX</div>
          <div class="legend-item"><span class="legend-dot s3xx"></span> 3XX</div>
          <div class="legend-item"><span class="legend-dot s4xx"></span> 4XX</div>
          <div class="legend-item"><span class="legend-dot s5xx"></span> 5XX</div>
          <div class="legend-item"><span class="legend-dot s1xx"></span> 1XX</div>
          <div class="legend-item"><span class="legend-dot pending"></span> Pending</div>
        </div>
      </div>
    </div>

    <!-- Status Codes -->
    <div class="overview-card">
      <div class="card-header">
        <div class="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Status Codes
        </div>
      </div>
      <div class="status-code-list">
        <div class="status-code-row" @click="$emit('filter-status', '1XX')" v-if="getStatusCount('1') > 0">
          <div class="status-code-label"><span class="status-code-dot s1xx"></span> 1XX Informational</div>
          <span class="status-code-count">{{ getStatusCount('1') }}</span>
        </div>
        <div class="status-code-row" @click="$emit('filter-status', '2XX')" v-if="getStatusCount('2') > 0">
          <div class="status-code-label"><span class="status-code-dot s2xx"></span> 2XX Success</div>
          <span class="status-code-count">{{ getStatusCount('2') }}</span>
        </div>
        <div class="status-code-row" @click="$emit('filter-status', '3XX')" v-if="getStatusCount('3') > 0">
          <div class="status-code-label"><span class="status-code-dot s3xx"></span> 3XX Redirect</div>
          <span class="status-code-count">{{ getStatusCount('3') }}</span>
        </div>
        <div class="status-code-row" @click="$emit('filter-status', '4XX')" v-if="getStatusCount('4') > 0">
          <div class="status-code-label"><span class="status-code-dot s4xx"></span> 4XX Client Error</div>
          <span class="status-code-count">{{ getStatusCount('4') }}</span>
        </div>
        <div class="status-code-row" @click="$emit('filter-status', '5XX')" v-if="getStatusCount('5') > 0">
          <div class="status-code-label"><span class="status-code-dot s5xx"></span> 5XX Server Error</div>
          <span class="status-code-count">{{ getStatusCount('5') }}</span>
        </div>
        <div class="status-code-row" @click="$emit('filter-status', 'pending')" v-if="pendingCount > 0">
          <div class="status-code-label"><span class="status-code-dot pending"></span> Pending</div>
          <span class="status-code-count">{{ pendingCount }}</span>
        </div>
      </div>
    </div>

    <!-- File Types & External -->
    <div class="overview-card">
      <div class="card-header">
        <div class="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          File Types
        </div>
      </div>
      <div class="file-type-list">
        <div v-for="type in fileTypeList" :key="type" class="file-type-row" @click="$emit('filter-filetype', type)">
          <div class="file-type-label"><span class="file-type-icon" :class="type">{{ getFileTypeAbbr(type) }}</span> {{ getFileTypeLabel(type) }}</div>
          <span class="file-type-count">{{ getTypeCount(type) }}</span>
        </div>
        <div v-if="fileTypeList.length === 0" class="no-file-types">No file types detected</div>
      </div>
      <div class="external-section" @click="$emit('filter-external')">
        <div class="card-title" style="margin-bottom: 12px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          External Links
        </div>
        <div class="big-number secondary" style="font-size: 32px;">{{ externalLinkCount.toLocaleString() }}</div>
        <div class="big-number-label">links to external domains</div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { getFileType } from '../utils/url.js'

export default {
  name: 'ResultsStats',
  props: {
    pages: Array
  },
  emits: ['filter-status', 'filter-filetype', 'filter-external'],
  setup(props) {
    const externalLinkCount = computed(() => {
      return props.pages.reduce((sum, page) => sum + (page.externalLinks?.length || 0), 0)
    })

    const pendingCount = computed(() => {
      return props.pages.filter(p => !p.isCrawled).length
    })

    const fileTypeList = computed(() => {
      const types = new Set()
      props.pages.forEach(page => {
        if (page.isCrawled) {
          const type = getFileType(page.url, page.contentType || '')
          if (type) types.add(type)
        }
      })
      return Array.from(types).sort()
    })

    const statusDistribution = computed(() => {
      const dist = {
        '1xx': 0,
        '2xx': 0,
        '3xx': 0,
        '4xx': 0,
        '5xx': 0,
        pending: 0
      }

      props.pages.forEach(page => {
        if (!page.isCrawled) {
          dist.pending++
        } else if (page.statusCode) {
          const hundreds = Math.floor(page.statusCode / 100)
          if (hundreds === 1) dist['1xx']++
          else if (hundreds === 2) dist['2xx']++
          else if (hundreds === 3) dist['3xx']++
          else if (hundreds === 4) dist['4xx']++
          else if (hundreds === 5) dist['5xx']++
        }
      })

      return dist
    })

    function getStatusWidth(status) {
      const total = props.pages.length || 1
      const count = statusDistribution.value[status] || 0
      return (count / total) * 100
    }

    function getStatusCount(statusHundreds) {
      const hundred = parseInt(statusHundreds)
      return props.pages.filter(p => {
        if (!p.isCrawled || !p.statusCode) return false
        return Math.floor(p.statusCode / 100) === hundred
      }).length
    }

    function getTypeCount(type) {
      return props.pages.filter(p => {
        return p.isCrawled && getFileType(p.url, p.contentType || '') === type
      }).length
    }

    function getFileTypeLabel(type) {
      const labels = {
        html: 'HTML Pages',
        pdf: 'PDF Documents',
        css: 'CSS Files',
        js: 'JavaScript Files',
        image: 'Images',
        other: 'Other Files'
      }
      return labels[type] || type
    }

    function getFileTypeAbbr(type) {
      const abbrs = {
        html: 'HTML',
        pdf: 'PDF',
        css: 'CSS',
        js: 'JS',
        image: 'IMG',
        other: 'OTH'
      }
      return abbrs[type] || type.toUpperCase()
    }

    return {
      externalLinkCount,
      pendingCount,
      statusDistribution,
      fileTypeList,
      getStatusWidth,
      getStatusCount,
      getTypeCount,
      getFileTypeLabel,
      getFileTypeAbbr
    }
  }
}
</script>

<style scoped>
:root {
  --bg-primary: #f8f9fb;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f3f6;
  --bg-elevated: #e8ebf0;
  --border: #dde1e8;
  --border-subtle: #e8ecf1;

  --text-primary: #1a1d26;
  --text-secondary: #5c6370;
  --text-muted: #8b929e;

  --accent-blue: #2563eb;
  --accent-green: #059669;
  --accent-amber: #d97706;
  --accent-red: #dc2626;
  --accent-purple: #7c3aed;
  --accent-slate: #64748b;

  --radius-sm: 6px;
  --radius-md: 10px;
}

.overview-card {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 20px;
  border: 1px solid var(--border-subtle);
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title svg {
  color: var(--text-muted);
}

.big-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
  color: var(--accent-blue);
}

.big-number.secondary {
  color: var(--accent-purple);
}

.big-number-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

.progress-chart {
  margin-top: 16px;
}

.chart-bar {
  height: 10px;
  border-radius: 5px;
  background: var(--bg-secondary);
  overflow: hidden;
  display: flex;
}

.chart-segment {
  height: 100%;
}

.chart-segment.s2xx { background: var(--accent-green); }
.chart-segment.s3xx { background: var(--accent-amber); }
.chart-segment.s4xx { background: var(--accent-red); }
.chart-segment.s5xx { background: var(--accent-purple); }
.chart-segment.s1xx { background: var(--accent-slate); }
.chart-segment.pending { background: #d1d5db; }

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.s2xx { background: var(--accent-green); }
.legend-dot.s3xx { background: var(--accent-amber); }
.legend-dot.s4xx { background: var(--accent-red); }
.legend-dot.s5xx { background: var(--accent-purple); }
.legend-dot.s1xx { background: var(--accent-slate); }
.legend-dot.pending { background: #d1d5db; }

.status-code-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.status-code-row:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-blue);
}

.status-code-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-code-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-code-dot.s1xx { background: var(--accent-slate); }
.status-code-dot.s2xx { background: var(--accent-green); }
.status-code-dot.s3xx { background: var(--accent-amber); }
.status-code-dot.s4xx { background: var(--accent-red); }
.status-code-dot.s5xx { background: var(--accent-purple); }
.status-code-dot.pending { background: var(--text-muted); }

.status-code-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.file-type-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-type-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.file-type-row:hover {
  background: var(--bg-elevated);
  border-color: var(--accent-blue);
}

.file-type-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.file-type-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.file-type-icon.html { background: #fef3c7; color: #b45309; }
.file-type-icon.pdf { background: #fee2e2; color: #dc2626; }
.file-type-icon.css { background: #dbeafe; color: #0369a1; }
.file-type-icon.js { background: #fef08a; color: #9a3412; }
.file-type-icon.image { background: #f0fdf4; color: #166534; }
.file-type-icon.other { background: #e0e7ff; color: #4f46e5; }

.no-file-types {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.file-type-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.external-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.external-section:hover {
  opacity: 0.8;
}
</style>
