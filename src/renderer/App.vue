<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <!-- Header Top -->
      <div class="header-top">
        <div class="logo">
          <div class="logo-icon">🫖</div>
          <div class="logo-text">418 <span>Web Crawler</span></div>
        </div>

        <div v-if="crawlState.rootUrl" class="url-group">
          <CrawlerInput
            :url="crawlState.rootUrl"
            :disabled="crawlState.isActive"
            @crawl="handleStartCrawl"
            :input-only="true"
          />
          <button @click="handleStartCrawl" class="btn btn-primary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Crawl
          </button>
          <button @click="handleStopCrawl" class="btn btn-danger">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/></svg>
            Stop
          </button>
        </div>

        <div class="header-actions">
          <button @click="triggerFileInput" class="btn btn-ghost">Import</button>
          <button v-if="crawlState.rootUrl" @click="handleExport" class="btn btn-primary">Export</button>
          <button v-if="crawlState.rootUrl" @click="handleResetCrawl" class="btn btn-ghost">Reset</button>
        </div>
      </div>

      <!-- Header Bottom (Progress & Stats) -->
      <div v-if="crawlState.rootUrl" class="header-bottom">
        <div class="progress-inline">
          <span class="pulse" v-if="crawlState.isActive"></span>
          <div class="progress-info">
            <div class="progress-top">
              <span class="progress-label">{{ statusLabel }}</span>
              <span class="progress-count" v-if="crawlState.stats.pagesFound > 0">{{ crawlState.stats.pagesCrawled }} / {{ crawlState.stats.pagesFound }} URLs</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-pill">
            <span class="value">{{ crawlState.stats.pagesFound }}</span>
            <span class="label">Found</span>
          </div>
          <div class="stat-pill">
            <span class="value">{{ crawlState.stats.pagesCrawled }}</span>
            <span class="label">Crawled</span>
          </div>
          <div class="stat-pill">
            <span class="value">{{ pendingCount }}</span>
            <span class="label">Pending</span>
          </div>
          <div class="stat-pill error" v-if="crawlState.stats.errors > 0" @click="showErrorModal = true" style="cursor: pointer;">
            <span class="value">{{ crawlState.stats.errors }}</span>
            <span class="label">Errors</span>
          </div>
          <button v-if="crawlState.isActive && !crawlState.isPaused" @click="handlePauseCrawl" class="btn btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            Pause
          </button>
          <button v-if="crawlState.isPaused" @click="handleResumeCrawl" class="btn btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v18l15-9z"/></svg>
            Resume
          </button>
        </div>
      </div>
    </header>

    <div v-if="error" class="error-banner">
      <span>{{ error }}</span>
      <button @click="clearError" class="btn-close">×</button>
    </div>

    <main class="main">
      <div v-if="!crawlState.rootUrl" class="empty-state">
        <div class="hero">
          <div class="hero-icon">🫖</div>
          <h1 class="hero-title">Crawl any website</h1>
          <p class="hero-subtitle">Discover broken links, analyse status codes, and audit your site structure in seconds.</p>
        </div>

        <div class="crawl-input-section">
          <div class="input-wrapper">
            <input v-model="crawlState.rootUrl" type="text" class="url-input" placeholder="https://example.com" @keyup.enter="handleStartCrawl(crawlState.rootUrl)">
            <button @click="handleStartCrawl(crawlState.rootUrl)" class="btn btn-primary btn-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
              Start Crawl
            </button>
          </div>
          <div class="input-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            Enter the full URL including https://
          </div>

          <div class="features">
            <div class="feature">
              <span class="feature-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              Find broken links
            </div>
            <div class="feature">
              <span class="feature-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              Check redirects
            </div>
            <div class="feature">
              <span class="feature-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              Export reports
            </div>
          </div>
        </div>

        <div class="previous-section">
          <PreviousCrawls
            :saved-crawls="savedCrawls"
            :is-loading="false"
            @load="handleLoadSavedCrawl"
            @delete="handleDeleteSavedCrawl"
            @clear-all="handleClearAllCrawls"
          />
        </div>
      </div>

      <div v-else class="content-card">
        <!-- Tabs -->
        <div class="tabs-row">
          <div class="tabs">
            <button class="tab" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
            <button class="tab" :class="{ active: activeTab === 'results' }" @click="activeTab = 'results'">Results <span class="tab-count">{{ filteredPages.length }}</span></button>
            <button class="tab" :class="{ active: activeTab === 'queue' }" @click="activeTab = 'queue'">Pending <span class="tab-count">{{ pendingCount }}</span></button>
            <button class="tab" :class="{ active: activeTab === 'log' }" @click="activeTab = 'log'">Log</button>
          </div>
          <span class="realtime-badge" v-if="crawlState.isActive">
            <span class="realtime-dot"></span>
            Live
          </span>
        </div>

        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="overview-content">
          <!-- Crawl Status -->
          <div class="overview-card">
            <div class="card-header">
              <div class="card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Crawl Status
              </div>
              <span class="card-badge" v-if="crawlState.isActive">Active</span>
              <span class="card-badge" v-else>Complete</span>
            </div>
            <div class="status-row">
              <span class="status-label">Status</span>
              <span class="status-value highlight">{{ statusLabel }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Speed</span>
              <span class="status-value">{{ crawlSpeed.toFixed(2) }} pages/sec</span>
            </div>
            <div class="status-row">
              <span class="status-label">Active Requests</span>
              <span class="status-value">{{ crawlState.inProgressCount }}</span>
            </div>
            <div v-if="crawlState.totalTime > 0" class="status-row">
              <span class="status-label">Elapsed Time</span>
              <span class="status-value">{{ formatTime(crawlState.totalTime) }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Est. Remaining</span>
              <span class="status-value">{{ estimatedRemaining }}</span>
            </div>
          </div>

          <!-- Total Pages / Status Distribution -->
          <ResultsStats :pages="pages" />
        </div>

        <!-- Results Tab -->
        <div v-if="activeTab === 'results'" class="tab-content">
          <!-- Filters Row -->
          <div class="filters-row">
            <input type="text" class="search-input" placeholder="Filter by URL, title, or keyword..." v-model="keywordFilter">
            <div class="filter-divider"></div>
            <div class="filter-group">
              <button class="filter-chip" :class="{ active: statusFilter === null }" @click="statusFilter = null">All</button>
              <button
                v-for="code in statusCodeList"
                :key="code"
                class="filter-chip"
                :class="{ active: statusFilter === code }"
                @click="statusFilter = statusFilter === code ? null : code"
              >
                <span class="dot" :style="getStatusCodeColor(code)"></span>
                {{ code }}
                <span class="count">{{ getStatusCount(code) }}</span>
              </button>
            </div>
            <div class="filter-divider"></div>
            <div class="filter-group">
              <button class="filter-chip" :class="{ active: externalFilter === null }" @click="externalFilter = null">All Types</button>
              <button class="filter-chip" :class="{ active: externalFilter === false }" @click="externalFilter = externalFilter === false ? null : false">
                Internal <span class="count">{{ internalCount }}</span>
              </button>
              <button class="filter-chip" :class="{ active: externalFilter === true }" @click="externalFilter = externalFilter === true ? null : true">
                External <span class="count">{{ externalCount }}</span>
              </button>
            </div>
          </div>

          <!-- Results Table -->
          <div class="table-container">
            <table class="results-table" v-if="filteredPages.length > 0">
              <thead>
                <tr>
                  <th style="width: 65px;">Status</th>
                  <th style="width: 85px;">Type</th>
                  <th class="sortable">URL</th>
                  <th class="sortable">Title</th>
                  <th class="sortable" style="width: 90px;">Time ↓</th>
                  <th style="width: 70px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(page, idx) in filteredPages" :key="page.url" :class="{ 'error-row': page.statusCode >= 400 }">
                  <td><span class="status-badge" :class="getStatusBadgeClass(page.statusCode)">{{ page.statusCode || 'pending' }}</span></td>
                  <td><span class="type-badge" :class="page.isExternal ? 'external' : 'internal'">{{ page.isExternal ? 'External' : 'Internal' }}</span></td>
                  <td class="url-cell"><span class="url-text">{{ page.url }}</span></td>
                  <td class="title-cell"><span class="title-text">{{ page.title || 'No title' }}</span></td>
                  <td class="time-cell">{{ page.responseTime }}ms<div class="time-bar"><div class="time-bar-fill" :class="getTimeBarClass(page.responseTime)" :style="{ width: (page.responseTime / 1000) * 100 + '%' }"></div></div></td>
                  <td><div class="row-actions">
                    <button class="action-btn" @click="selectedPage = page" v-if="page.isCrawled" title="View details">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="action-btn" @click="openExternal(page.url)" title="Open in browser">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                  </div></td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-results">
              No results match your filters
            </div>
          </div>

          <!-- Pagination -->
          <div class="table-footer">
            <div class="pagination">
              <button class="page-btn">←</button>
              <button class="page-btn active">1</button>
              <span class="page-info" v-if="filteredPages.length > 0">Showing 1-{{ Math.min(10, filteredPages.length) }} of {{ filteredPages.length }}</span>
            </div>
            <div class="bulk-actions">
              <span class="bulk-select">0 selected</span>
              <button class="btn btn-ghost">Export Selected</button>
              <button class="btn btn-ghost">Ignore</button>
            </div>
          </div>
        </div>

        <!-- Pending Tab -->
        <div v-if="activeTab === 'queue'" class="tab-content">
          <div class="filters-row">
            <input type="text" class="search-input" placeholder="Filter pending URLs..." v-model="keywordFilter">
          </div>
          <div class="table-container">
            <table class="results-table" v-if="filteredPendingPages.length > 0">
              <thead>
                <tr>
                  <th style="width: 65px;">Row</th>
                  <th class="sortable">URL</th>
                  <th style="width: 70px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(page, idx) in filteredPendingPages" :key="page.url">
                  <td><span class="status-badge">{{ idx + 1 }}</span></td>
                  <td class="url-cell"><span class="url-text">{{ page.url }}</span></td>
                  <td><div class="row-actions">
                    <button class="action-btn" @click="openExternal(page.url)" title="Open in browser">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                  </div></td>
                </tr>
              </tbody>
            </table>
            <div v-else class="no-results">
              No pending URLs
            </div>
          </div>
        </div>

        <!-- Log Tab -->
        <div v-if="activeTab === 'log'" class="tab-content" style="padding: 0; overflow: hidden;">
          <LogViewer />
        </div>
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

    <!-- Error details modal -->
    <ErrorDetailsModal
      :pages="pages"
      :isOpen="showErrorModal"
      @close="showErrorModal = false"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useCrawler } from './composables/useCrawler.js'
import { formatTime } from './utils/timeFormatting.js'
import { groupStatusCodesByHundreds, getStatusBadgeClass } from './utils/statusBadges.js'
import CrawlerInput from './components/CrawlerInput.vue'
import ResultsStats from './components/ResultsStats.vue'
import PageDetailModal from './components/PageDetailModal.vue'
import ErrorDetailsModal from './components/ErrorDetailsModal.vue'
import LogViewer from './components/LogViewer.vue'
import PreviousCrawls from './components/PreviousCrawls.vue'

export default {
  name: 'App',
  components: {
    CrawlerInput,
    ResultsStats,
    PageDetailModal,
    ErrorDetailsModal,
    LogViewer,
    PreviousCrawls
  },
  setup() {
    const crawler = useCrawler()
    const selectedPage = ref(null)
    const error = ref(null)
    const showErrorModal = ref(false)
    const statusFilter = ref(null)
    const externalFilter = ref(null) // null = all, true = external only, false = internal only
    const keywordFilter = ref('')
    const activeTab = ref('overview')

    const savedCrawls = computed(() => crawler.getSavedCrawls())

    const statusCodeList = computed(() => {
      const codes = crawler.pages.value
        .map(page => page.statusCode)
        .filter(code => code !== null && code !== undefined)
      const grouped = groupStatusCodesByHundreds(codes)
      return grouped.map(item => item.group)
    })

    const pendingPages = computed(() =>
      crawler.pages.value.filter(p => !p.isCrawled && !p.isExternal)
    )

    const filteredPendingPages = computed(() => {
      let result = pendingPages.value
      if (keywordFilter.value) {
        const keyword = keywordFilter.value.toLowerCase()
        result = result.filter(p => p.url.toLowerCase().includes(keyword))
      }
      return result
    })

    const pendingCount = computed(() => pendingPages.value.length)

    const externalCount = computed(() =>
      crawler.pages.value.filter(p => p.isExternal).length
    )

    const internalCount = computed(() =>
      crawler.pages.value.filter(p => !p.isExternal).length
    )

    const filteredPages = computed(() => {
      let result = crawler.pages.value

      // Exclude pending links (only show crawled pages in Results tab)
      result = result.filter(p => p.isCrawled)

      // Apply status filter
      if (statusFilter.value) {
        // Handle grouped status codes (e.g., "3XX")
        if (statusFilter.value.endsWith('XX')) {
          const hundreds = parseInt(statusFilter.value)
          result = result.filter(p => {
            if (!p.statusCode) return false
            return Math.floor(p.statusCode / 100) === hundreds
          })
        } else {
          // Handle specific status codes
          result = result.filter(p => p.statusCode === statusFilter.value)
        }
      }

      // Apply external/internal filter
      if (externalFilter.value !== null) {
        result = result.filter(p => p.isExternal === externalFilter.value)
      }

      // Apply keyword filter
      if (keywordFilter.value) {
        const keyword = keywordFilter.value.toLowerCase()
        result = result.filter(p => p.url.toLowerCase().includes(keyword) || p.title?.toLowerCase().includes(keyword))
      }

      return result
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

    const estimatedRemaining = computed(() => {
      const state = crawler.crawlState.value
      if (!state.isActive || state.stats.pagesFound === 0) return '~0m'

      const elapsed = Date.now() - state.startTime
      const pagesCrawled = state.stats.pagesCrawled
      const pagesRemaining = state.stats.pagesFound - pagesCrawled

      if (pagesCrawled === 0) return '~calculating...'

      const avgTimePerPage = elapsed / pagesCrawled
      const estimatedMs = pagesRemaining * avgTimePerPage

      const minutes = Math.floor(estimatedMs / 60000)
      const seconds = Math.floor((estimatedMs % 60000) / 1000)

      if (minutes === 0) return `~${seconds}s`
      return `~${minutes}m ${seconds}s`
    })

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

    async function handleContinueAnyway() {
      try {
        await crawler.continueAnyway()
      } catch (e) {
        error.value = e.message
      }
    }

    async function handleSaveProgress() {
      try {
        const result = await crawler.saveProgress()
        if (result.success) {
          error.value = null
        } else {
          error.value = 'Save failed: ' + result.error
        }
      } catch (e) {
        error.value = 'Save failed: ' + e.message
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
        const result = await crawler.saveToFile()
        if (result.success) {
          error.value = null
        } else {
          error.value = 'Export failed: ' + result.error
        }
      } catch (e) {
        error.value = 'Export failed: ' + e.message
      }
    }

    async function handleImport(file) {
      try {
        const result = await crawler.loadFromFile(file)
        if (result.success) {
          error.value = null
        } else {
          error.value = 'Import failed: ' + result.error
        }
      } catch (e) {
        error.value = 'Import failed: ' + e.message
      }
    }

    function triggerFileInput() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          handleImport(file)
        }
      }
      input.click()
    }

    async function handleLoadSavedCrawl(crawlId) {
      try {
        const result = await crawler.loadFromAppStorage(crawlId)
        if (result.success) {
          error.value = null
        } else {
          error.value = 'Failed to load crawl: ' + result.error
        }
      } catch (e) {
        error.value = 'Failed to load crawl: ' + e.message
      }
    }

    function handleDeleteSavedCrawl(crawlId) {
      try {
        crawler.deleteSavedCrawl(crawlId)
        error.value = null
      } catch (e) {
        error.value = 'Failed to delete crawl: ' + e.message
      }
    }

    function handleClearAllCrawls() {
      try {
        const crawls = crawler.getSavedCrawls()
        crawls.forEach(crawl => {
          crawler.deleteSavedCrawl(crawl.id)
        })
        error.value = null
      } catch (e) {
        error.value = 'Failed to clear crawls: ' + e.message
      }
    }

    function handleNavigateToPage(url) {
      selectedPage.value = crawler.pages.value.find(p => p.url === url)
    }

    async function handleExportFiltered() {
      try {
        let filterDesc = ''
        if (statusFilter.value) {
          filterDesc += statusFilter.value
        }
        if (externalFilter.value !== null) {
          if (filterDesc) filterDesc += '-'
          filterDesc += externalFilter.value ? 'external' : 'internal'
        }
        const result = await crawler.exportFilteredResults(filteredPages.value, filterDesc)
        if (result.success) {
          error.value = null
        } else {
          error.value = 'Export failed: ' + result.error
        }
      } catch (e) {
        error.value = 'Export failed: ' + e.message
      }
    }

    function handleStatusFilterClick(code) {
      statusFilter.value = statusFilter.value === code ? null : code
      activeTab.value = 'results'
    }

    function handleLinkTypeFilterClick(isExternal) {
      externalFilter.value = externalFilter.value === isExternal ? null : isExternal
      activeTab.value = 'results'
    }

    function handleClearFilters() {
      statusFilter.value = null
      externalFilter.value = null
      keywordFilter.value = ''
    }

    function clearError() {
      error.value = null
    }

    function getStatusCount(code) {
      // Handle grouped status codes (e.g., "3XX")
      if (code.endsWith('XX')) {
        const hundreds = parseInt(code)
        return crawler.pages.value.filter(p => {
          if (!p.statusCode) return false
          return Math.floor(p.statusCode / 100) === hundreds
        }).length
      }
      // Handle specific status codes
      return crawler.pages.value.filter(p => p.statusCode === code).length
    }

    function getStatusCodeColor(code) {
      if (code.startsWith('2')) return 'background: var(--accent-green);'
      if (code.startsWith('3')) return 'background: var(--accent-amber);'
      if (code.startsWith('4')) return 'background: var(--accent-red);'
      if (code.startsWith('5')) return 'background: var(--accent-purple);'
      return 'background: var(--text-muted);'
    }

    function getTimeBarClass(time) {
      if (time > 1000) return 'very-slow'
      if (time > 500) return 'slow'
      return ''
    }

    function openExternal(url) {
      window.open(url, '_blank')
    }

    return {
      crawler,
      selectedPage,
      error,
      showErrorModal,
      statusFilter,
      externalFilter,
      keywordFilter,
      activeTab,
      savedCrawls,
      statusCodeList,
      getStatusCount,
      getStatusCodeColor,
      getTimeBarClass,
      getStatusBadgeClass,
      crawlState: crawler.crawlState,
      pages: crawler.pages,
      filteredPages,
      filteredPendingPages,
      pendingPages,
      pendingCount,
      externalCount,
      internalCount,
      queueUrls: crawler.queueUrls,
      progressPercent,
      crawlSpeed,
      statusLabel,
      statusColorClass,
      estimatedRemaining,
      isBackoffMaxReached: crawler.isBackoffMaxReached,
      formatTime,
      openExternal,
      handleStartCrawl,
      handlePauseCrawl,
      handleResumeCrawl,
      handleStopCrawl,
      handleContinueAnyway,
      handleSaveProgress,
      handleResetCrawl,
      handleExport,
      handleImport,
      triggerFileInput,
      handleLoadSavedCrawl,
      handleDeleteSavedCrawl,
      handleClearAllCrawls,
      handleNavigateToPage,
      handleStatusFilterClick,
      handleLinkTypeFilterClick,
      handleExportFiltered,
      handleClearFilters,
      clearError
    }
  }
}
</script>

<style>
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
  --accent-green-soft: rgba(5, 150, 105, 0.1);
  --accent-amber: #d97706;
  --accent-amber-soft: rgba(217, 119, 6, 0.1);
  --accent-red: #dc2626;
  --accent-red-soft: rgba(220, 38, 38, 0.08);
  --accent-purple: #7c3aed;
  --accent-purple-soft: rgba(124, 58, 237, 0.1);
  --accent-slate: #64748b;
  --accent-slate-soft: rgba(100, 116, 139, 0.1);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}
</style>

<style scoped>
.app {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  color: var(--text-primary);
}

/* Header */
.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-subtle);
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
}

.logo-text {
  font-weight: 700;
  font-size: 15px;
  color: var(--text-primary);
}

.logo-text span {
  color: var(--text-muted);
  font-weight: 400;
}

.url-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.header-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--bg-tertiary);
}

.progress-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pulse {
  width: 8px;
  height: 8px;
  background: var(--accent-green);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
  box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.2);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.progress-bar {
  width: 200px;
  height: 4px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
  transition: width 0.3s ease;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.stat-pill .value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-pill .label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stat-pill.error {
  background: var(--accent-red-soft);
  border-color: rgba(220, 38, 38, 0.15);
  cursor: pointer;
}

.stat-pill.error:hover {
  background: rgba(220, 38, 38, 0.12);
}

.stat-pill.error .value {
  color: var(--accent-red);
}

/* Main Content */
.main {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  flex: 1;
  overflow: hidden;
  width: 100%;
}

.content-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Tabs */
.tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.tabs {
  display: flex;
}

.tab {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  transition: color 0.15s ease;
}

.tab:hover {
  color: var(--text-secondary);
}

.tab.active {
  color: var(--accent-blue);
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background: var(--accent-blue);
  border-radius: 2px 2px 0 0;
}

.tab-count {
  margin-left: 5px;
  padding: 2px 7px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
}

.tab.active .tab-count {
  background: var(--accent-blue-soft);
  color: var(--accent-blue);
}

.realtime-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--accent-green-soft);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-green);
}

.realtime-dot {
  width: 6px;
  height: 6px;
  background: var(--accent-green);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

/* Overview Content */
.overview-content {
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.overview-card {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 20px;
  border: 1px solid var(--border-subtle);
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

.card-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  background: var(--accent-green-soft);
  color: var(--accent-green);
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.status-row:last-child {
  border-bottom: none;
}

.status-label {
  font-size: 13px;
  color: var(--text-muted);
}

.status-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
}

.status-value.highlight {
  color: var(--accent-blue);
}

/* Filters */
.filters-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-wrap: wrap;
  flex-shrink: 0;
  background: var(--bg-secondary);
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 320px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 12px 9px 36px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text-primary);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b929e' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 11px center;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  background-color: var(--bg-secondary);
}

.filter-divider {
  width: 1px;
  height: 24px;
  background: var(--border);
}

.filter-group {
  display: flex;
  gap: 6px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-chip:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.filter-chip.active {
  background: var(--accent-blue-soft);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.filter-chip .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.filter-chip .count {
  padding: 1px 5px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  font-size: 10px;
}

.filter-chip.active .count {
  background: rgba(37, 99, 235, 0.2);
}

/* Results Table */
.table-container {
  flex: 1;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.results-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
}

.results-table th.sortable {
  cursor: pointer;
}

.results-table th.sortable:hover {
  color: var(--text-secondary);
}

.results-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.results-table tbody tr {
  transition: background 0.1s ease;
  cursor: pointer;
}

.results-table tbody tr:hover {
  background: var(--bg-tertiary);
}

.results-table tbody tr.error-row {
  background: var(--accent-red-soft);
}

.results-table tbody tr.error-row:hover {
  background: rgba(220, 38, 38, 0.1);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 4px 9px;
  border-radius: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.s2xx { background: var(--accent-green-soft); color: var(--accent-green); }
.status-badge.s3xx { background: var(--accent-amber-soft); color: var(--accent-amber); }
.status-badge.s4xx { background: var(--accent-red-soft); color: var(--accent-red); }
.status-badge.s5xx { background: var(--accent-purple-soft); color: var(--accent-purple); }
.status-badge.s1xx { background: var(--accent-slate-soft); color: var(--accent-slate); }

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.type-badge.internal { background: var(--accent-blue-soft); color: var(--accent-blue); }
.type-badge.external { background: var(--accent-purple-soft); color: var(--accent-purple); }

.url-cell { max-width: 300px; }

.url-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

tr:hover .url-text { color: var(--accent-blue); }

.title-cell { max-width: 200px; }

.title-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.time-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
}

.time-bar {
  width: 50px;
  height: 3px;
  background: var(--bg-elevated);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.time-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent-green);
}

.time-bar-fill.slow { background: var(--accent-amber); }
.time-bar-fill.very-slow { background: var(--accent-red); }

.row-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
  display: flex;
  gap: 4px;
}

.results-table tbody tr:hover .row-actions { opacity: 1; }

.action-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
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

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-info {
  font-size: 12px;
  color: var(--text-muted);
}

.page-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
}

.page-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.page-btn.active {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: white;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bulk-select {
  font-size: 12px;
  color: var(--text-muted);
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tab Content */
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

.empty-content {
  text-align: center;
  width: 100%;
  max-width: 900px;
  margin: auto;
  padding: 2rem 1.5rem;
}

.previous-section {
  border-top: 1px solid var(--border-subtle);
  padding: 1.5rem;
  background: var(--bg-secondary);
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.empty-content h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  color: var(--text-primary);
  font-weight: 700;
}

.empty-subtitle {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.empty-instruction {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.error-banner {
  background: var(--accent-red-soft);
  border-bottom: 1px solid rgba(220, 38, 38, 0.2);
  color: var(--accent-red);
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.btn-close {
  background: none;
  border: none;
  color: var(--accent-red);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
}

/* Button styles */
.btn {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--accent-blue);
  color: white;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-danger {
  background: var(--accent-red-soft);
  color: var(--accent-red);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.btn-danger:hover {
  background: var(--accent-red);
  color: white;
}

/* Hero Section */
.hero {
  text-align: center;
  margin-bottom: 48px;
}

.hero-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin: 0 auto 24px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 480px;
  margin: 0 auto;
}

/* URL Input Section */
.crawl-input-section {
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  margin-bottom: 40px;
  max-width: 100%;
  width: 90%;
  margin-left: auto;
  margin-right: auto;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.url-input {
  flex: 1;
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.url-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  background: var(--bg-secondary);
  box-shadow: 0 0 0 4px var(--accent-blue-soft);
}

.url-input::placeholder {
  color: var(--text-muted);
}

.btn-lg {
  padding: 14px 28px;
  font-size: 15px;
  border-radius: var(--radius-md);
}

.input-hint {
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
}

.input-hint svg {
  flex-shrink: 0;
}

/* Features List */
.features {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-subtle);
}

.feature {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.feature-icon {
  width: 20px;
  height: 20px;
  background: var(--accent-green-soft);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-green);
  flex-shrink: 0;
}

.accent-green-soft {
  background: rgba(5, 150, 105, 0.1);
}

.accent-green {
  color: #059669;
}
</style>
