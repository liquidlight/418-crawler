<template>
  <div v-if="displayPage" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Page Details</h2>
        <button @click="$emit('close')" class="btn-close">×</button>
      </div>

      <div class="modal-body">
        <div class="detail-section">
          <h3>URL</h3>
          <a :href="displayPage.url" target="_blank" rel="noopener noreferrer" class="url-link">
            {{ displayPage.url }}
          </a>
        </div>

        <div class="detail-section">
          <div class="detail-row">
            <div class="detail-col">
              <h4>Status</h4>
              <span :class="getStatusBadgeClass(displayPage.statusCode)" class="badge">
                {{ displayPage.statusCode }}
              </span>
            </div>
            <div class="detail-col">
              <h4>File Type</h4>
              <span class="badge badge-info">{{ displayPage.fileType }}</span>
            </div>
            <div class="detail-col">
              <h4>Response Time</h4>
              <span>{{ displayPage.responseTime }}ms</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Metadata</h3>
          <div class="metadata-item">
            <strong>Title:</strong> {{ displayPage.title || '(none)' }}
          </div>
          <div class="metadata-item">
            <strong>H1:</strong> {{ displayPage.h1 || '(none)' }}
          </div>
          <div class="metadata-item">
            <strong>Description:</strong> {{ displayPage.metaDescription || '(none)' }}
          </div>
        </div>

        <div class="detail-section">
          <h3>In-Links ({{ (displayPage.inLinks || []).length }})</h3>
          <div v-if="(displayPage.inLinks || []).length > 0" class="links-list">
            <div v-for="link in displayPage.inLinks" :key="link" class="link-item">
              <button @click="navigateToPage(link)" class="link-button">
                {{ truncateUrl(link) }}
              </button>
            </div>
          </div>
          <p v-else class="no-items">No in-links found</p>
        </div>

        <div class="detail-section">
          <h3>Out-Links ({{ (displayPage.outLinks || []).length }})</h3>
          <div v-if="(displayPage.outLinks || []).length > 0" class="links-list">
            <div v-for="link in displayPage.outLinks" :key="link" class="link-item">
              <button @click="navigateToPage(link)" class="link-button">
                {{ truncateUrl(link) }}
              </button>
            </div>
          </div>
          <p v-else class="no-items">No out-links found</p>
        </div>

        <div v-if="(displayPage.externalLinks || []).length > 0" class="detail-section">
          <h3>External Links ({{ (displayPage.externalLinks || []).length }})</h3>
          <div class="links-list">
            <div v-for="link in (displayPage.externalLinks || []).slice(0, 10)" :key="link" class="link-item">
              <a :href="link" target="_blank" rel="noopener noreferrer" class="external-link">
                {{ truncateUrl(link) }}
              </a>
            </div>
            <p v-if="(displayPage.externalLinks || []).length > 10" class="more-items">
              and {{ (displayPage.externalLinks || []).length - 10 }} more external links...
            </p>
          </div>
        </div>

        <div v-if="(displayPage.assets || []).length > 0" class="detail-section">
          <h3>Assets ({{ (displayPage.assets || []).length }})</h3>
          <div class="links-list">
            <div v-for="asset in (displayPage.assets || []).slice(0, 10)" :key="asset" class="link-item">
              <a :href="asset" target="_blank" rel="noopener noreferrer" class="asset-link">
                {{ truncateUrl(asset) }}
              </a>
            </div>
            <p v-if="(displayPage.assets || []).length > 10" class="more-items">
              and {{ (displayPage.assets || []).length - 10 }} more assets...
            </p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import { useDatabase } from '../composables/useDatabase.js'

export default {
  name: 'PageDetailModal',
  props: {
    page: Object,
    pages: Array
  },
  emits: ['close', 'navigate'],
  setup(props, { emit }) {
    const db = useDatabase()
    const displayPage = ref(props.page)

    // Reload page from database when modal opens to ensure latest inlinks
    onMounted(async () => {
      if (props.page && props.page.url) {
        try {
          const freshPage = await db.getPage(props.page.url)
          if (freshPage) {
            displayPage.value = freshPage
          }
        } catch (error) {
          console.error('Failed to load fresh page data:', error)
        }
      }
    })

    // Update displayPage when props.page changes
    watch(() => props.page, (newPage) => {
      displayPage.value = newPage
    })

    function getStatusBadgeClass(status) {
      if (status >= 200 && status < 300) return 'badge-success'
      if (status >= 300 && status < 400) return 'badge-info'
      if (status >= 400 && status < 500) return 'badge-warning'
      if (status >= 500) return 'badge-danger'
      return 'badge-secondary'
    }

    function truncateUrl(url) {
      if (url.length > 70) {
        return url.substring(0, 67) + '...'
      }
      return url
    }

    function navigateToPage(url) {
      emit('navigate', url)
    }

    return {
      displayPage,
      getStatusBadgeClass,
      truncateUrl,
      navigateToPage
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

.modal {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: white;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #eee;
}

.detail-section:last-of-type {
  border-bottom: none;
}

.detail-section h3 {
  margin: 0 0 0.75rem 0;
  color: #333;
  font-size: 1rem;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.detail-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-col h4 {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  font-weight: 600;
}

.url-link {
  color: #667eea;
  text-decoration: none;
  word-break: break-all;
  font-family: monospace;
  font-size: 0.9rem;
}

.url-link:hover {
  text-decoration: underline;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  width: fit-content;
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

.metadata-item {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.metadata-item strong {
  color: #666;
  min-width: 100px;
  display: inline-block;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.link-item {
  padding: 0.5rem;
  background: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #eee;
}

.link-button {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: none;
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
  text-align: left;
}

.link-button:hover {
  text-decoration: underline;
  color: #764ba2;
}

.external-link {
  color: #667eea;
  text-decoration: none;
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.external-link:hover {
  text-decoration: underline;
}

.asset-link {
  color: #999;
  text-decoration: none;
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.asset-link:hover {
  text-decoration: underline;
  color: #667eea;
}

.no-items {
  margin: 0;
  color: #999;
  font-style: italic;
  font-size: 0.9rem;
}

.more-items {
  margin: 0;
  color: #999;
  font-size: 0.9rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  position: sticky;
  bottom: 0;
  background: white;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}
</style>
