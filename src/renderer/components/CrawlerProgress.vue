<template>
  <div class="crawler-progress">
    <div class="status-section">
      <h3>Status</h3>
      <div class="status-indicator">
        <span :class="`badge badge-${statusColor}`">{{ statusText }}</span>
      </div>
    </div>

    <!-- Backoff notification section -->
    <div v-if="state.backoffState?.isInBackoff" class="backoff-section" :class="{ 'max-reached': state.backoffState.maxBackoffReached }">
      <div class="backoff-icon">⚠️</div>
      <div class="backoff-content">
        <h4>Server Overload Detected</h4>
        <p v-if="!state.backoffState.maxBackoffReached">
          Detected {{ state.backoffState.attemptCount === 1 ? '5+' : 'continued' }}
          timeouts. Automatically retrying in <strong>{{ backoffCountdown }}s</strong>
          (Attempt {{ state.backoffState.attemptCount }}/3)
        </p>
        <p v-else class="backoff-max-reached">
          Server consistently overloaded after 3 automatic retry attempts.
          Please check server status or adjust crawl rate.
        </p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Pages Found</span>
        <span class="value">{{ state.stats.pagesFound }}</span>
      </div>

      <div class="stat">
        <span class="label">Pages Crawled</span>
        <span class="value">{{ state.stats.pagesCrawled }}</span>
      </div>

      <div class="stat">
        <span class="label">In Queue</span>
        <span class="value">{{ state.queueSize }}</span>
      </div>

      <div class="stat">
        <span class="label">Errors</span>
        <span class="value" :class="{ 'text-danger': state.stats.errors > 0 }">
          {{ state.stats.errors }}
        </span>
      </div>
    </div>

    <div v-if="state.stats.pagesFound > 0" class="progress-section">
      <div class="progress-labels">
        <span class="crawled">{{ state.stats.pagesCrawled }} crawled</span>
        <span class="pending">{{ pendingCount }} pending</span>
        <span class="percentage">{{ progressPercent }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <div v-if="state.isActive && crawlSpeed > 0" class="performance-metrics">
      <div class="metric">
        <span class="label">Crawl Speed</span>
        <span class="value">{{ crawlSpeed.toFixed(2) }} pages/sec</span>
      </div>
      <div class="metric">
        <span class="label">Concurrent</span>
        <span class="value">{{ state.inProgressCount }}</span>
      </div>
    </div>

    <div v-if="state.queueSize > 0" class="queue-section">
      <h4>Queue ({{ state.queueSize }} waiting)</h4>
      <div class="queue-preview">
        <div v-if="queuePreview.length > 0" class="queue-urls">
          <div v-for="(url, idx) in queuePreview" :key="idx" class="queue-item">
            <span class="queue-index">{{ idx + 1 }}.</span>
            <span class="queue-url" :title="url">{{ truncateUrl(url) }}</span>
          </div>
          <div v-if="state.queueSize > 3" class="queue-more">
            +{{ state.queueSize - 3 }} more in queue
          </div>
        </div>
        <div v-else class="queue-loading">
          Loading queue...
        </div>
      </div>
    </div>

    <div v-if="state.totalTime > 0" class="timing">
      Total time: {{ formatTime(state.totalTime) }}
    </div>

    <div v-if="pagesCount > 0" class="pages-count">
      <strong>{{ pagesCount }}</strong> pages stored in database
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { formatTime } from '../utils/timeFormatting.js'
import { truncateUrl } from '../utils/textFormatting.js'

export default {
  name: 'CrawlerProgress',
  props: {
    state: Object,
    pagesCount: Number,
    queueUrls: Array
  },
  setup(props) {
    const backoffCountdown = ref(0)

    const statusColor = computed(() => {
      // Check for backoff state first
      if (props.state.backoffState?.isInBackoff) {
        return props.state.backoffState.maxBackoffReached ? 'danger' : 'warning'
      }
      if (props.state.isActive && props.state.isPaused) return 'warning'
      if (props.state.isActive) return 'info'
      if (props.state.stats.errors > 0) return 'danger'
      if (props.state.stats.pagesCrawled > 0) return 'success'
      return 'secondary'
    })

    const statusText = computed(() => {
      // Check for backoff state first
      if (props.state.backoffState?.isInBackoff) {
        if (props.state.backoffState.maxBackoffReached) {
          return 'Server Overloaded - Manual Action Needed'
        }
        return `Server Overloaded (${props.state.backoffState.attemptCount}/3) - Retry in ${backoffCountdown.value}s`
      }
      if (props.state.isActive && props.state.isPaused) return 'Paused'
      if (props.state.isActive) return 'Crawling...'
      if (props.state.stats.pagesCrawled > 0) return 'Complete'
      return 'Idle'
    })

    // Update countdown timer when in backoff
    watch(
      () => props.state.backoffState?.isInBackoff,
      (isInBackoff) => {
        if (isInBackoff) {
          const updateCountdown = () => {
            if (props.state.backoffState?.backoffEndTime) {
              const remaining = Math.max(0, Math.ceil((props.state.backoffState.backoffEndTime - Date.now()) / 1000))
              backoffCountdown.value = remaining

              if (remaining > 0) {
                setTimeout(updateCountdown, 1000)
              }
            }
          }
          updateCountdown()
        }
      },
      { immediate: true }
    )

    const progressPercent = computed(() => {
      const total = props.state.stats.pagesFound
      const crawled = props.state.stats.pagesCrawled
      return total > 0 ? Math.round((crawled / total) * 100) : 0
    })

    const pendingCount = computed(() => {
      return props.state.stats.pagesFound - props.state.stats.pagesCrawled
    })

    const crawlSpeed = computed(() => {
      if (props.state.totalTime <= 0 || props.state.stats.pagesCrawled === 0) return 0
      const seconds = props.state.totalTime / 1000
      return props.state.stats.pagesCrawled / seconds
    })

    const queuePreview = computed(() => {
      return (props.queueUrls || []).slice(0, 3)
    })

    return {
      statusColor,
      statusText,
      progressPercent,
      pendingCount,
      crawlSpeed,
      queuePreview,
      backoffCountdown,
      formatTime,
      truncateUrl
    }
  }
}
</script>

<style scoped>
.crawler-progress {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.status-section {
  margin-bottom: 1rem;
}

.status-section h3 {
  margin: 0 0 0.35rem 0;
  color: #333;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-indicator {
  display: flex;
  gap: 0.5rem;
}

/* Component-specific badge styling */
.badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Badge color variants are imported from shared badges.css */

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat {
  background: #f9f9f9;
  padding: 0.5rem 0.6rem;
  border-radius: 4px;
  text-align: center;
  border: 1px solid #eee;
}

.label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.15rem;
  font-weight: 500;
}

.value {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
  color: #333;
}

.text-danger {
  color: #e74c3c;
}

.progress-section {
  margin-bottom: 1rem;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.35rem;
  color: #666;
}

.progress-labels .crawled {
  color: #388e3c;
  font-weight: 600;
}

.progress-labels .pending {
  color: #f57c00;
  font-weight: 600;
}

.progress-labels .percentage {
  color: #1976d2;
  font-weight: 700;
}

.progress-bar {
  background: #eee;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  height: 100%;
  transition: width 0.3s ease;
}

.performance-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f0f7ff;
  border-radius: 4px;
  border-left: 3px solid #667eea;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.metric .label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.metric .value {
  font-size: 1rem;
  font-weight: 700;
  color: #1976d2;
}

.queue-section {
  background: #f9f9f9;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #eee;
  margin-bottom: 1rem;
}

.queue-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: #333;
  font-weight: 600;
}

.queue-preview {
  max-height: 150px;
  overflow-y: auto;
}

.queue-urls {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.queue-item {
  display: flex;
  gap: 0.4rem;
  padding: 0.35rem 0.5rem;
  background: white;
  border-radius: 3px;
  border: 1px solid #eee;
  font-size: 0.8rem;
}

.queue-index {
  font-weight: 600;
  color: #999;
  min-width: 1.2rem;
  font-size: 0.75rem;
}

.queue-url {
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  font-size: 0.75rem;
}

.queue-more {
  padding: 0.35rem;
  color: #999;
  font-size: 0.7rem;
  text-align: center;
  font-style: italic;
}

.queue-loading {
  text-align: center;
  color: #999;
  font-size: 0.9rem;
  padding: 1rem;
}

.timing {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.35rem;
}

.pages-count {
  font-size: 0.8rem;
  color: #666;
  padding-top: 0.35rem;
  border-top: 1px solid #eee;
}

/* Backoff notification styles */
.backoff-section {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 6px;
  margin-bottom: 1rem;
  align-items: flex-start;
}

.backoff-section.max-reached {
  background: #f8d7da;
  border-color: #e74c3c;
}

.backoff-icon {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
}

.backoff-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #856404;
  font-weight: 700;
}

.backoff-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #856404;
  line-height: 1.4;
}

.backoff-max-reached {
  color: #721c24 !important;
  font-weight: 600;
}

.backoff-section.max-reached .backoff-content h4 {
  color: #721c24;
}

.backoff-section.max-reached .backoff-content p {
  color: #721c24;
}
</style>
