<template>
  <div class="previous-crawls">
    <div class="crawls-header">
      <h3>Previous Crawls</h3>
      <button v-if="crawls.length > 0" @click="clearAllCrawls" class="btn-clear-all">Clear All</button>
    </div>

    <div v-if="crawls.length === 0" class="no-crawls">
      No previous crawls. Start a new crawl to begin.
    </div>

    <div v-else class="crawls-list">
      <div v-for="crawl in crawls" :key="crawl.id" class="crawl-item">
        <div class="crawl-info">
          <div class="crawl-domain">{{ crawl.domain }}</div>
          <div class="crawl-details">
            <span class="page-count">{{ crawl.pageCount }} pages</span>
            <span class="saved-date">{{ formatDate(crawl.savedAt) }}</span>
          </div>
        </div>
        <div class="crawl-actions">
          <button @click="loadCrawl(crawl.id)" class="btn-load" title="Load this crawl">Load</button>
          <button @click="deleteCrawl(crawl.id)" class="btn-delete" title="Delete this crawl">×</button>
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
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
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
.previous-crawls {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.crawls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.crawls-header h3 {
  margin: 0;
  color: #333;
  font-size: 0.9rem;
  font-weight: 600;
}

.btn-clear-all {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  padding: 0.3rem 0.6rem;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-all:hover {
  background: #eee;
  color: #333;
  border-color: #bbb;
}

.no-crawls {
  text-align: center;
  color: #999;
  padding: 1.5rem 1rem;
  font-size: 0.85rem;
}

.crawls-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.crawl-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9f9f9;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.2s;
}

.crawl-item:hover {
  background: #fafafa;
  border-color: #e8e8e8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.crawl-info {
  flex: 1;
  min-width: 0;
}

.crawl-domain {
  font-weight: 600;
  color: #333;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crawl-details {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #999;
  margin-top: 0.25rem;
}

.page-count,
.saved-date {
  white-space: nowrap;
}

.crawl-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-left: 0.75rem;
}

.btn-load,
.btn-delete {
  padding: 0.3rem 0.6rem;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  font-weight: 600;
}

.btn-load {
  background: #667eea;
  color: white;
}

.btn-load:hover {
  background: #5568d3;
}

.btn-delete {
  background: #f5f5f5;
  color: #999;
  padding: 0.25rem 0.4rem;
  font-size: 1rem;
  line-height: 1;
}

.btn-delete:hover {
  background: #ffebee;
  color: #c62828;
}
</style>
