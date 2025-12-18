<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-left">
        <h1>Site Crawler</h1>
      </div>
      <div class="header-right">
        <span v-if="crawlState.rootUrl" class="status-text">{{ statusLabel }}</span>
        <button v-if="crawlState.rootUrl" @click="handleExport" class="btn btn-primary">Export</button>
        <button v-if="crawlState.rootUrl" @click="handleResetCrawl" class="btn btn-secondary">Reset</button>
      </div>
    </header>

    <!-- URL Input Section at Top -->
    <div class="top-section">
      <CrawlerInput
        :url="crawlState.rootUrl"
        :disabled="crawlState.isActive"
        @crawl="handleStartCrawl"
      />
    </div>

    <div v-if="error" class="error-banner">
      <span>{{ error }}</span>
      <button @click="clearError" class="btn-close">×</button>
    </div>

    <main class="app-main">
      <div v-if="!crawlState.rootUrl" class="empty-state">
        <div class="empty-content">
          <h2>Website Crawler</h2>
          <p class="empty-subtitle">Crawl websites locally and analyze their structure</p>
          <p class="empty-instruction">Enter a website URL above to start crawling</p>
        </div>
      </div>

      <div v-else class="layout-grid">
        <!-- Left Sidebar -->
        <aside class="sidebar">
          <div class="controls-compact">
            <button v-if="!crawlState.isActive && !crawlState.isPaused" @click="handleStartCrawl" class="btn btn-sm btn-primary">Start</button>
            <button v-if="crawlState.isActive && !crawlState.isPaused" @click="handlePauseCrawl" class="btn btn-sm btn-warning">Pause</button>
            <button v-if="crawlState.isPaused" @click="handleResumeCrawl" class="btn btn-sm btn-primary">Resume</button>
            <button v-if="crawlState.isActive || crawlState.isPaused" @click="handleStopCrawl" class="btn btn-sm btn-danger">Stop</button>
          </div>

          <!-- Stats Cards -->
          <div class="stats-sidebar">
            <div class="stat-card">
              <div class="stat-label">Found</div>
              <div class="stat-value">{{ crawlState.stats.pagesFound }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Crawled</div>
              <div class="stat-value">{{ crawlState.stats.pagesCrawled }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Pending</div>
              <div class="stat-value">{{ pendingCount }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Errors</div>
              <div class="stat-value" :class="{ 'text-danger': crawlState.stats.errors > 0 }">{{ crawlState.stats.errors }}</div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div v-if="crawlState.stats.pagesFound > 0" class="progress-compact">
            <div class="progress-bar-wrapper">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              </div>
              <div class="progress-text">{{ progressPercent }}%</div>
            </div>
          </div>


        </aside>

        <!-- Main Content -->
        <section class="main-content">
          <!-- Tabs -->
          <div class="tabs-header">
            <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
            <button class="tab-btn" :class="{ active: activeTab === 'results' }" @click="activeTab = 'results'">Results ({{ pages.length }})</button>
            <button class="tab-btn" :class="{ active: activeTab === 'queue' }" @click="activeTab = 'queue'">Pending ({{ pendingCount }})</button>
          </div>

          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'" class="tab-content">
            <div class="overview-grid">
              <div class="overview-card">
                <h3>Crawl Status</h3>
                <div class="overview-stat">
                  <span class="label">Status:</span>
                  <span class="value" :class="statusColorClass">{{ statusLabel }}</span>
                </div>
                <div class="overview-stat">
                  <span class="label">Speed:</span>
                  <span class="value">{{ crawlSpeed.toFixed(2) }} pages/sec</span>
                </div>
                <div class="overview-stat">
                  <span class="label">Active:</span>
                  <span class="value">{{ crawlState.inProgressCount }} requests</span>
                </div>
                <div v-if="crawlState.totalTime > 0" class="overview-stat">
                  <span class="label">Total Time:</span>
                  <span class="value">{{ formatTime(crawlState.totalTime) }}</span>
                </div>
              </div>

              <ResultsStats :pages="pages" />
            </div>
          </div>

          <!-- Results Tab -->
          <div v-if="activeTab === 'results'" class="tab-content">
            <!-- Filter Section -->
            <div v-if="statusFilter" class="filter-section">
              <div class="filter-header">
                <span class="filter-label">Filtering by Status:</span>
                <button
                  @click="statusFilter = null"
                  class="filter-btn clear-btn"
                >
                  Clear Filter ({{ statusFilter }})
                </button>
              </div>
            </div>

            <ResultsTable
              :pages="filteredPages"
              @select-page="selectedPage = $event"
              @filter-status="statusFilter = $event"
            />
          </div>

          <!-- Pending Tab -->
          <div v-if="activeTab === 'queue'" class="tab-content">
            <div class="queue-list">
              <div v-if="pendingPages.length > 0">
                <div v-for="(page, idx) in pendingPages" :key="page.url" class="queue-item-full">
                  <span class="queue-num">{{ idx + 1 }}</span>
                  <span class="queue-url">{{ page.url }}</span>
                </div>
              </div>
              <div v-else class="empty-queue">
                No pending URLs
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Page detail modal -->
    <PageDetailModal
      v-if="selectedPage"
      :page="selectedPage"
      :pages="pages"
      @close="selectedPage = null"
      @navigate="handleNavigateToPage"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useCrawler } from './composables/useCrawler.js'
import CrawlerInput from './components/CrawlerInput.vue'
import ResultsStats from './components/ResultsStats.vue'
import ResultsTable from './components/ResultsTable.vue'
import PageDetailModal from './components/PageDetailModal.vue'

export default {
  name: 'App',
  components: {
    CrawlerInput,
    ResultsStats,
    ResultsTable,
    PageDetailModal
  },
  setup() {
    const crawler = useCrawler()
    const selectedPage = ref(null)
    const error = ref(null)
    const statusFilter = ref(null)
    const activeTab = ref('overview')

    const statusCounts = computed(() => crawler.statusCounts)
    const fileTypeCounts = computed(() => crawler.fileTypeCounts)

    const pendingPages = computed(() =>
      crawler.pages.value.filter(p => !p.isCrawled)
    )

    const pendingCount = computed(() => pendingPages.value.length)

    const filteredPages = computed(() => {
      if (!statusFilter.value) {
        return crawler.pages.value
      }
      return crawler.pages.value.filter(p => p.statusCode === statusFilter.value)
    })

    const progressPercent = computed(() => {
      const total = crawler.crawlState.value.stats.pagesFound
      const crawled = crawler.crawlState.value.stats.pagesCrawled
      return total > 0 ? Math.round((crawled / total) * 100) : 0
    })

    const crawlSpeed = computed(() => {
      const pagesCrawled = crawler.crawlState.value.stats.pagesCrawled
      if (pagesCrawled === 0) return 0

      let elapsedMs
      if (crawler.crawlState.value.isActive) {
        // During active crawl: real-time elapsed time
        elapsedMs = Date.now() - crawler.crawlState.value.startTime
      } else {
        // After completion: use final totalTime
        elapsedMs = crawler.crawlState.value.totalTime
      }

      if (elapsedMs <= 0) return 0
      const seconds = elapsedMs / 1000
      return pagesCrawled / seconds
    })

    const statusLabel = computed(() => {
      const state = crawler.crawlState.value
      if (state.isActive && state.isPaused) return 'Paused'
      if (state.isActive) return `Crawling... (${state.stats.pagesCrawled}/${state.stats.pagesFound} URLs)`
      if (state.stats.pagesCrawled > 0) return 'Complete'
      return 'Idle'
    })

    const statusColorClass = computed(() => {
      const state = crawler.crawlState.value
      if (state.isActive && state.isPaused) return 'status-warning'
      if (state.isActive) return 'status-info'
      if (state.stats.errors > 0) return 'status-danger'
      if (state.stats.pagesCrawled > 0) return 'status-success'
      return 'status-secondary'
    })

    function formatTime(ms) {
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`
      }
      return `${remainingSeconds}s`
    }

    onMounted(async () => {
      try {
        await crawler.initialize()
      } catch (e) {
        error.value = 'Failed to initialize: ' + e.message
        console.error('Initialization error:', e)
      }
    })

    async function handleStartCrawl(url) {
      try {
        error.value = null
        selectedPage.value = null
        await crawler.startCrawl(url)
      } catch (e) {
        error.value = e.message
      }
    }

    async function handlePauseCrawl() {
      try {
        await crawler.pauseCrawl()
      } catch (e) {
        error.value = e.message
      }
    }

    async function handleResumeCrawl() {
      try {
        await crawler.resumeCrawl()
      } catch (e) {
        error.value = e.message
      }
    }

    async function handleStopCrawl() {
      try {
        await crawler.stopCrawl()
      } catch (e) {
        error.value = e.message
      }
    }

    async function handleResetCrawl() {
      try {
        await crawler.resetCrawl()
      } catch (e) {
        error.value = e.message
      }
    }

    async function handleExport() {
      try {
        const data = await crawler.exportResults()
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `crawl-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      } catch (e) {
        error.value = 'Export failed: ' + e.message
      }
    }

    function handleNavigateToPage(url) {
      selectedPage.value = crawler.pages.value.find(p => p.url === url)
    }

    function clearError() {
      error.value = null
    }

    return {
      crawler,
      selectedPage,
      error,
      statusFilter,
      activeTab,
      statusCounts,
      fileTypeCounts,
      crawlState: crawler.crawlState,
      pages: crawler.pages,
      filteredPages,
      pendingPages,
      pendingCount,
      queueUrls: crawler.queueUrls,
      progressPercent,
      crawlSpeed,
      statusLabel,
      statusColorClass,
      formatTime,
      handleStartCrawl,
      handlePauseCrawl,
      handleResumeCrawl,
      handleStopCrawl,
      handleResetCrawl,
      handleExport,
      handleNavigateToPage,
      clearError
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}

.app-header {
  background: white;
  border-bottom: 1px solid #e0e4e8;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #24292e;
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-text {
  font-size: 0.9rem;
  color: #586069;
  padding: 0.5rem 1rem;
  background: #f6f8fa;
  border-radius: 4px;
}

.top-section {
  background: white;
  border-bottom: 1px solid #e0e4e8;
  padding: 0.5rem 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}


.error-banner {
  background: #ffeaea;
  border-bottom: 1px solid #ffb3b3;
  color: #d9534f;
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.btn-close {
  background: none;
  border: none;
  color: #d9534f;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
}

.app-main {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.layout-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  height: 100%;
}

.sidebar {
  background: white;
  border-radius: 6px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  max-height: calc(100vh - 150px);
}

.controls-compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.stats-sidebar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-card {
  background: #f6f8fa;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: center;
  border: 1px solid #e1e4e8;
}

.stat-label {
  font-size: 0.75rem;
  color: #586069;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #24292e;
}

.text-danger {
  color: #d9534f;
}

.progress-compact {
  margin: 0.5rem 0;
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e1e4e8;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #24292e;
  min-width: 35px;
  text-align: right;
}

.status-breakdown {
  border-top: 1px solid #e1e4e8;
  padding-top: 1rem;
  margin-top: 1rem;
}

.breakdown-title {
  font-size: 0.75rem;
  color: #24292e;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.status-filters {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.status-filter-btn {
  padding: 0.4rem 0.6rem;
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 3px;
  font-size: 0.75rem;
  color: #24292e;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-weight: 500;
}

.status-filter-btn:hover {
  background: #e1e4e8;
  border-color: #d1d5da;
}

.status-filter-btn.active {
  background: #0366d6;
  color: white;
  border-color: #0366d6;
}

.status-count {
  float: right;
  color: inherit;
  opacity: 0.8;
}

.sidebar-section {
  border-top: 1px solid #e1e4e8;
  padding-top: 1rem;
}

.sidebar-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.8rem;
  color: #24292e;
  font-weight: 600;
  text-transform: uppercase;
}

.filter-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.filter-btn {
  flex: 1;
  padding: 0.5rem;
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 3px;
  font-size: 0.85rem;
  color: #24292e;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.filter-btn:hover {
  background: #e1e4e8;
}

.filter-btn.active {
  background: #0366d6;
  color: white;
  border-color: #0366d6;
}

.clear-btn {
  width: 100%;
  background: white;
  border-color: #d9534f;
  color: #d9534f;
}

.clear-btn:hover {
  background: #ffeaea;
}

.count {
  font-size: 0.75rem;
  color: #6a737d;
  font-weight: 600;
  background: #f6f8fa;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  min-width: 30px;
  text-align: center;
}

.main-content {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #e1e4e8;
  padding: 0 1rem;
  gap: 2rem;
  background: #fafbfc;
  border-radius: 6px 6px 0 0;
}

.tab-btn {
  padding: 0.75rem 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #586069;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #24292e;
}

.tab-btn.active {
  color: #0366d6;
  border-bottom-color: #0366d6;
}

.tab-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.overview-card {
  background: #f6f8fa;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e1e4e8;
}

.overview-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #24292e;
}

.overview-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e1e4e8;
}

.overview-stat:last-child {
  border-bottom: none;
}

.overview-stat .label {
  font-size: 0.85rem;
  color: #586069;
  font-weight: 500;
}

.overview-stat .value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #24292e;
}

.status-success {
  color: #28a745;
}

.status-danger {
  color: #d9534f;
}

.status-warning {
  color: #ffc107;
}

.status-info {
  color: #0366d6;
}

.status-secondary {
  color: #6a737d;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 600px;
  overflow-y: auto;
}

.queue-item-full {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: #f6f8fa;
  border-radius: 4px;
  border: 1px solid #e1e4e8;
  font-size: 0.85rem;
  align-items: flex-start;
}

.queue-num {
  font-weight: 600;
  color: #6a737d;
  min-width: 30px;
}

.queue-url {
  color: #0366d6;
  word-break: break-all;
}

.empty-queue {
  padding: 2rem 1rem;
  text-align: center;
  color: #6a737d;
  font-size: 0.9rem;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.empty-content {
  text-align: center;
  width: 100%;
  max-width: 900px;
}

.empty-content h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  color: #24292e;
  font-weight: 700;
}

.empty-subtitle {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #586069;
}

.empty-instruction {
  margin: 0;
  font-size: 0.95rem;
  color: #6a737d;
}

.filter-section {
  padding: 1rem;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
  margin-bottom: 1rem;
  border-radius: 4px;
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-label {
  font-weight: 600;
  color: #24292e;
  font-size: 0.9rem;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.4rem 0.8rem;
  background: white;
  border: 1px solid #d1d5da;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #24292e;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #e1e4e8;
  border-color: #0366d6;
}

.filter-btn.active {
  background: #0366d6;
  color: white;
  border-color: #0366d6;
}

.filter-btn.clear-btn {
  background: white;
  border-color: #d9534f;
  color: #d9534f;
}

.filter-btn.clear-btn:hover {
  background: #ffeaea;
}

/* Button styles */
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5da;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #0366d6;
  color: white;
  border-color: #0366d6;
}

.btn-primary:hover {
  background: #0256c7;
}

.btn-secondary {
  background: #f6f8fa;
  color: #24292e;
}

.btn-secondary:hover {
  background: #e1e4e8;
}

.btn-danger {
  background: #d9534f;
  color: white;
  border-color: #d9534f;
}

.btn-danger:hover {
  background: #c94440;
}

.btn-warning {
  background: #ffc107;
  color: #24292e;
  border-color: #ffc107;
}

.btn-warning:hover {
  background: #ffb300;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

@media (max-width: 1200px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .sidebar {
    max-height: auto;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
