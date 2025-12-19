<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>Errors ({{ errorPages.length }})</h2>
        <button @click="close" class="btn-close">×</button>
      </div>

      <div class="modal-body">
        <div v-if="errorPages.length === 0" class="empty-state">
          <p>No errors found</p>
        </div>

        <div v-else class="error-list">
          <div v-for="page in errorPages" :key="page.url" class="error-item">
            <div class="error-header">
              <span class="error-url">{{ page.url }}</span>
              <span v-if="page.statusCode" class="error-status">
                <span class="badge" :class="getStatusBadgeClass(page.statusCode)">
                  {{ page.statusCode }}
                </span>
              </span>
            </div>
            <div v-if="page.errorMessage" class="error-message">
              {{ page.errorMessage }}
            </div>
            <div class="error-meta">
              <span v-if="page.responseTime > 0" class="meta-item">
                Response time: {{ page.responseTime }}ms
              </span>
              <span v-if="page.crawledAt" class="meta-item">
                Crawled: {{ formatDate(page.crawledAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn btn-primary">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { getStatusBadgeClass } from '../utils/statusBadges.js'

export default {
  name: 'ErrorDetailsModal',
  props: {
    pages: Array,
    isOpen: Boolean
  },
  emits: ['close'],
  setup(props, { emit }) {
    const errorPages = computed(() => {
      if (!props.pages) return []
      return props.pages.filter(page => page.errorMessage || (page.statusCode && page.statusCode >= 400))
    })

    function formatDate(dateStr) {
      if (!dateStr) return ''
      try {
        return new Date(dateStr).toLocaleString()
      } catch {
        return dateStr
      }
    }

    function close() {
      emit('close')
    }

    return {
      errorPages,
      getStatusBadgeClass,
      formatDate,
      close
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e1e4e8;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #d9534f;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #666;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-item {
  border: 1px solid #ffb3b3;
  border-radius: 6px;
  padding: 1rem;
  background: #fff5f5;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.error-url {
  flex: 1;
  word-break: break-all;
  font-family: monospace;
  font-size: 0.85rem;
  color: #333;
}

.error-status {
  flex-shrink: 0;
}

.error-message {
  color: #d9534f;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #d9534f;
  padding-left: 0.75rem;
}

.error-meta {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #666;
}

.meta-item {
  display: flex;
  align-items: center;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e1e4e8;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5da;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #0366d6;
  color: white;
  border-color: #0366d6;
}

.btn-primary:hover {
  background: #0256c7;
}
</style>
