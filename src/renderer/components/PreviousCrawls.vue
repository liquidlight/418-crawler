<template>
  <div>
    <div class="section-header">
      <div class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        Previous Crawls
        <span v-if="crawls.length > 0" class="section-count">{{ crawls.length }}</span>
      </div>
      <a v-if="crawls.length > 0" @click="clearAllCrawls" class="clear-link">Clear all</a>
    </div>

    <div v-if="crawls.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
      </div>
      <div class="empty-title">No previous crawls</div>
      <div class="empty-text">Your crawl history will appear here</div>
    </div>

    <div v-else class="crawl-list">
      <div v-for="crawl in crawls" :key="crawl.id" class="crawl-card" @click="loadCrawl(crawl.id)">
        <div class="crawl-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        </div>
        <div class="crawl-info">
          <div class="crawl-url">{{ crawl.domain }}</div>
          <div class="crawl-meta">
            <span>{{ formatDate(crawl.savedAt) }}</span>
            <span class="crawl-stat success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              {{ crawl.pageCount }} pages
            </span>
            <span v-if="crawl.errorCount && crawl.errorCount > 0" class="crawl-stat error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              {{ crawl.errorCount }} errors
            </span>
            <span v-else class="crawl-stat success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              No errors
            </span>
          </div>
        </div>
        <div class="crawl-actions">
          <button class="action-btn" @click.stop="loadCrawl(crawl.id)" title="Re-crawl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </button>
          <button class="action-btn delete" @click.stop="deleteCrawl(crawl.id)" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  savedCrawls: Array,
  isLoading: Boolean
})

const emit = defineEmits(['load', 'delete', 'clear-all'])

const crawls = computed(() => props.savedCrawls || [])

function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    const daysAgo = Math.floor((today - date) / (1000 * 60 * 60 * 24))
    if (daysAgo < 7) return `${daysAgo} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function loadCrawl(crawlId) {
  emit('load', crawlId)
}

function deleteCrawl(crawlId) {
  if (confirm('Delete this crawl?')) {
    emit('delete', crawlId)
  }
}

function clearAllCrawls() {
  if (confirm('Delete all saved crawls? This cannot be undone.')) {
    emit('clear-all')
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
  --accent-blue-soft: rgba(37, 99, 235, 0.1);
  --accent-green: #059669;
  --accent-red: #dc2626;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-count {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  color: var(--text-muted);
}

.clear-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.clear-link:hover {
  color: var(--accent-red);
}

/* Empty State */
.empty-state {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  text-align: center;
  border: 1px dashed var(--border);
}

.empty-icon {
  width: 48px;
  height: 48px;
  background: var(--bg-tertiary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: var(--text-muted);
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.empty-text {
  font-size: 13px;
  color: var(--text-muted);
}

/* Crawl Cards */
.crawl-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.crawl-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.crawl-card:hover {
  border-color: var(--accent-blue);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.1);
}

.crawl-icon {
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.crawl-icon svg {
  color: var(--text-muted);
}

.crawl-info {
  flex: 1;
  min-width: 0;
}

.crawl-url {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.crawl-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.crawl-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.crawl-stat.success { color: var(--accent-green); }
.crawl-stat.error { color: var(--accent-red); }

.crawl-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.crawl-card:hover .crawl-actions {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--accent-blue-soft);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.action-btn.delete:hover {
  background: rgba(220, 38, 38, 0.1);
  border-color: transparent;
  color: var(--accent-red);
}
</style>
