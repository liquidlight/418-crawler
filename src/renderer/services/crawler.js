import { fetchWithRetry } from './fetcher.js'
import { parsePage } from './parser.js'
import { normalizeUrl, isSameDomain, extractDomain } from '../utils/url.js'
import { CRAWLER_DEFAULTS } from '../utils/constants.js'
import { CrawlState } from '../models/CrawlState.js'
import { BackoffManager } from './BackoffManager.js'

/**
 * Main Crawler class - implements BFS crawling with concurrent fetching
 */
export class Crawler {
  constructor(rootUrl, options = {}) {
    // Normalize the root URL
    this.rootUrl = normalizeUrl(rootUrl)

    // Validate that root URL was normalized successfully
    if (!this.rootUrl) {
      throw new Error(`Invalid root URL: "${rootUrl}"`)
    }

    this.baseDomain = extractDomain(this.rootUrl)

    if (!this.baseDomain) {
      throw new Error(`Could not extract domain from URL: "${this.rootUrl}"`)
    }

    this.state = new CrawlState({
      rootUrl: this.rootUrl,
      baseDomain: this.baseDomain
    })

    this.maxConcurrent = options.maxConcurrent || CRAWLER_DEFAULTS.MAX_CONCURRENT
    this.requestDelay = options.requestDelay || CRAWLER_DEFAULTS.REQUEST_DELAY
    this.requestTimeout = options.requestTimeout || CRAWLER_DEFAULTS.REQUEST_TIMEOUT
    this.crawlResources = options.crawlResources !== undefined ? options.crawlResources : CRAWLER_DEFAULTS.CRAWL_RESOURCES
    this.cookies = options.cookies || []

    // Event handlers
    this.onProgress = options.onProgress || (() => {})
    this.onPageProcessed = options.onPageProcessed || (() => {})
    this.onError = options.onError || (() => {})
    this.onComplete = options.onComplete || (() => {})

    // Track orphaned URL checking to prevent infinite loops
    this.orphanedCheckAttempts = 0
    this.maxOrphanedCheckAttempts = 3

    // Initialize backoff manager
    this.backoffManager = new BackoffManager({
      enabled: options.enableBackoff !== false,
      timeoutThreshold: options.backoffTimeoutThreshold || CRAWLER_DEFAULTS.BACKOFF_TIMEOUT_THRESHOLD || 5,
      windowDuration: options.backoffWindowDuration || CRAWLER_DEFAULTS.BACKOFF_WINDOW_DURATION || 30000,
      backoffLevels: options.backoffLevels || CRAWLER_DEFAULTS.BACKOFF_LEVELS || [30000, 60000, 120000],
      onBackoffStart: (info) => this.handleBackoffStart(info),
      onBackoffEnd: () => this.handleBackoffEnd(),
      onUserNotificationNeeded: (info) => this.handleUserNotification(info)
    })

    // Initialize page progress tracking (ephemeral UI state)
    this.pageProgress = new Map()

    // Initialize queue with root URL
    this.state.addToQueue(this.rootUrl, 0)
  }

  /**
   * Starts the crawling process
   */
  async start() {
    if (this.state.isActive) {
      console.warn('Crawler is already running')
      return
    }

    this.orphanedCheckAttempts = 0 // Reset counter for new crawl
    this.state.isActive = true
    this.state.startTime = Date.now()
    this.emitProgress()

    try {
      while (this.state.isActive) {
        // Handle pause state
        if (this.state.isPaused) {
          await this.waitForResume()
        }

        // Process a batch of URLs concurrently
        await this.processBatch()

        // Continue until both queue is empty AND no requests are in progress
        if (this.state.queue.length === 0 && this.state.inProgress.size === 0) {
          // Double-check: ensure we've visited all discovered pages
          // If pagesFound > visited count, there may be URLs we haven't processed yet
          // Always check for orphaned internal URLs before completing
          // These are pages discovered through in-links but never queued for crawling
          this.orphanedCheckAttempts++

          if (this.orphanedCheckAttempts > this.maxOrphanedCheckAttempts) {
            console.warn(`Reached max orphaned URL check attempts (${this.maxOrphanedCheckAttempts}). Stopping crawler to prevent infinite loop.`)
            break
          }

          const orphanedUrls = await this.getOrphanedUrls()

          if (orphanedUrls && orphanedUrls.length > 0) {
            console.log(`[Orphaned Check #${this.orphanedCheckAttempts}] Found ${orphanedUrls.length} orphaned internal URLs. Queuing them now...`)
            let queuedCount = 0
            let skippedCount = 0
            orphanedUrls.forEach(url => {
              // Check both exact URL and normalized version to handle URL format differences
              const isAlreadyVisited = this.state.isVisited(url)
              const isInQueue = this.state.queue.some(item => item.url === url)

              if (!isAlreadyVisited && !isInQueue) {
                this.state.addToQueue(url, 0)
                // Don't mark as visited here - let processUrl mark it when actually processing
                console.debug(`Queued orphaned URL: ${url}`)
                queuedCount++
              } else {
                skippedCount++
              }
            })

            if (queuedCount > 0) {
              console.log(`Queued ${queuedCount} orphaned URLs, skipped ${skippedCount}`)
              this.emitProgress()
              continue // Continue crawling newly queued URLs
            } else {
              // All orphaned URLs are already visited or queued - we're done
              console.log(`All ${orphanedUrls.length} orphaned URLs already visited or queued. Crawler complete.`)
              break
            }
          }

          // No orphaned URLs found, check consistency
          const unvisitedCount = this.state.stats.pagesFound - this.state.visited.size
          console.debug('BFS queue empty and no requests in progress.', {
            queueLength: this.state.queue.length,
            inProgressSize: this.state.inProgress.size,
            pagesCrawled: this.state.stats.pagesCrawled,
            pagesFound: this.state.stats.pagesFound,
            visitedCount: this.state.visited.size,
            unvisitedCount: unvisitedCount
          })

          if (unvisitedCount <= 0) {
            console.debug('All discovered pages have been visited. Crawl complete.')
            break
          } else {
            // Wait a bit in case new URLs are still being discovered
            await new Promise(resolve => setTimeout(resolve, 500))
            if (this.state.queue.length === 0 && this.state.inProgress.size === 0) {
              console.debug('Still no queue items after wait. Crawl complete.')
              break
            }
          }
        }
      }

      // Crawl complete
      this.state.isActive = false
      this.state.totalTime = Date.now() - this.state.startTime
      this.emitComplete()
    } catch (error) {
      console.error('Crawler error:', error)
      this.state.isActive = false
      this.onError(error)
    }
  }

  /**
   * Processes a batch of URLs concurrently
   */
  async processBatch() {
    // Calculate how many URLs we can process
    const availableSlots = this.maxConcurrent - this.state.inProgress.size
    const batch = this.state.queue.splice(0, availableSlots)

    if (batch.length === 0) {
      // If queue is empty but we have in-progress requests, wait for them to complete
      if (this.state.inProgress.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      } else {
        // Queue is empty and no in-progress requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return
    }

    // Process batch concurrently
    const promises = batch.map(item => this.processUrl(item))
    const results = await Promise.allSettled(promises)

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to process ${batch[index].url}:`, result.reason)
      }
    })

    // Auto-save state periodically
    if (this.state.stats.pagesCrawled % CRAWLER_DEFAULTS.AUTO_SAVE_INTERVAL === 0) {
      console.debug(`Progress: crawled=${this.state.stats.pagesCrawled}, found=${this.state.stats.pagesFound}, queue=${this.state.queue.length}, inProgress=${this.state.inProgress.size}`)
      this.emitProgress()
    }
  }

  /**
   * Processes a single URL
   */
  async processUrl(item) {
    const { url, depth } = item

    // Check if already visited
    if (this.state.isVisited(url)) {
      return
    }

    try {
      this.state.markVisited(url)
      this.state.markInProgress(url)
      // Stage 1 (25%): URL queued/about to be crawled
      this.pageProgress.set(url, { stage: 1, timestamp: Date.now() })

      // Fetch the page
      const response = await fetchWithRetry(url, {
        timeout: this.requestTimeout,
        delay: this.requestDelay,
        cookies: this.cookies
      })

      if (!response) {
        throw new Error('No response received from fetcher')
      }

      // Stage 2 (50%): Page fetch complete
      this.pageProgress.set(url, { stage: 2, timestamp: Date.now() })

      // Check if stopped during fetch
      if (!this.state.isActive) {
        return
      }

      // Track timeouts for backoff detection (internal links only)
      const isTimeout = response.status === -1 && /timeout/i.test(response.error || '')
      const isInternal = isSameDomain(url, this.rootUrl, this.baseDomain)

      if (isTimeout) {
        this.backoffManager.recordTimeout(url, isInternal)
      } else if (response.ok) {
        // Track successful fetches to detect server recovery
        this.backoffManager.recordSuccess(url, isInternal)
      }

      // Parse the page
      const page = parsePage(url, response, this.baseDomain, depth)

      // Stage 3 (75%): HTML parsed
      this.pageProgress.set(url, { stage: 3, timestamp: Date.now() })

      // Emit page processed event (and wait for it to complete - important for database saves)
      await this.onPageProcessed(page)
      this.state.stats.pagesCrawled++

      // Stage 4 (100%): Processing complete
      this.pageProgress.set(url, { stage: 4, timestamp: Date.now() })

      if (response.error) {
        this.state.stats.errors++
      }

      // Handle redirects: if this is a 3xx response, extract and queue the Location header
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers?.location
        if (location) {
          const redirectTarget = normalizeUrl(location, url)
          if (redirectTarget) {
            // Add redirect target to appropriate list
            if (isSameDomain(redirectTarget, url, this.baseDomain)) {
              if (!page.outLinks.includes(redirectTarget)) {
                page.outLinks.push(redirectTarget)
              }
            } else {
              if (!page.externalLinks.includes(redirectTarget)) {
                page.externalLinks.push(redirectTarget)
              }
            }
          }
        }
      }

      // Extract and queue links based on page type
      // Internal pages: extract and queue all their outLinks (unlimited depth within same domain)
      // External pages: don't extract their links
      const linksToQueue = page.isExternal ? [] : page.outLinks

      if (linksToQueue.length > 0) {
        let discoveredCount = 0
        for (const link of linksToQueue) {
          const normalizedLink = normalizeUrl(link, url)
          // Only add to queue if not already in visited or queue
          if (normalizedLink && !this.state.isVisited(normalizedLink)) {
            // Check if already in queue
            const alreadyInQueue = this.state.queue.some(item => item.url === normalizedLink)
            if (!alreadyInQueue) {
              // Don't mark as visited yet - will be marked when actually processing
              this.state.addToQueue(normalizedLink, depth + 1)
              this.state.stats.pagesFound++
              discoveredCount++
              // Emit discovered URL (internal link) - wait for database save to complete
              await this.onPageProcessed({
                type: 'url-discovered',
                url: normalizedLink,
                depth: depth + 1,
                isExternal: false
              })
            }
          }
        }
        // Emit progress after discovering new URLs so UI updates pending count
        if (discoveredCount > 0) {
          this.emitProgress()
          if (discoveredCount > 1 || this.state.stats.pagesCrawled % 20 === 0) {
            console.debug(`Discovered ${discoveredCount} URLs from ${url}. Total in queue: ${this.state.queue.length}, Total found: ${this.state.stats.pagesFound}`)
          }
        }
      } else if (page.isExternal) {
        console.debug(`External page crawled: ${url} (${page.statusCode}) - metadata logged, links not extracted`)
      } else {
        console.debug(`No links found in ${url}`)
      }

      // Update in-links for all discovered URLs (both internal outLinks and externalLinks)
      // This also awaits the onPageProcessed calls for in-links
      await this.updateInLinks(url, page.outLinks, page.externalLinks)

      // Queue external links just to get their status codes - don't parse their content
      if (!page.isExternal && page.externalLinks.length > 0) {
        let externalQueuedCount = 0
        for (const externalLink of page.externalLinks) {
          const normalizedLink = normalizeUrl(externalLink, url)
          if (normalizedLink && !this.state.isVisited(normalizedLink)) {
            // Check if already in queue
            const alreadyInQueue = this.state.queue.some(item => item.url === normalizedLink)
            if (!alreadyInQueue) {
              // Queue external links for crawling to get their status codes (but don't parse their links)
              this.state.addToQueue(normalizedLink, depth + 1)
              this.state.stats.pagesFound++
              externalQueuedCount++
              // Emit discovered external URL event - wait for database save to complete
              await this.onPageProcessed({
                type: 'url-discovered',
                url: normalizedLink,
                depth: depth + 1,
                isExternal: true
              })
            }
          }
        }
        if (externalQueuedCount > 0) {
          console.debug(`Queued ${externalQueuedCount} external links from ${url} (for status codes only)`)
          this.emitProgress()
        }
      }

      // Crawl resources if enabled
      if (this.crawlResources && page.assets && page.assets.length > 0) {
        let resourceQueuedCount = 0
        for (const assetUrl of page.assets) {
          if (!this.state.isVisited(assetUrl)) {
            const alreadyInQueue = this.state.queue.some(item => item.url === assetUrl)
            if (!alreadyInQueue) {
              this.state.addToQueue(assetUrl, depth + 1)
              this.state.stats.pagesFound++
              resourceQueuedCount++
              // Emit discovered resource event - wait for database save to complete
              await this.onPageProcessed({
                type: 'url-discovered',
                url: assetUrl,
                depth: depth + 1,
                isExternal: false,
                isResource: true
              })
            }
          }
        }
        if (resourceQueuedCount > 0) {
          console.debug(`Queued ${resourceQueuedCount} resources from ${url}`)
          this.emitProgress()
        }
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error)
      this.state.stats.errors++
      this.onError(error)

      // Notify UI about the failed page to remove it from pending
      // This handles cases where the error occurred before parsePage/onPageProcessed
      const isExternal = !isSameDomain(url, `https://${this.baseDomain}`, this.baseDomain)
      const failedPage = {
        url,
        normalizedUrl: normalizeUrl(url) || url,
        domain: this.baseDomain,
        statusCode: -1, // Use -1 to indicate system error
        errorMessage: error.message || 'Processing error',
        fileType: 'error',
        contentType: '',
        responseTime: 0,
        size: 0,
        outLinks: [],
        inLinks: [],
        externalLinks: [],
        assets: [],
        isCrawled: true,
        isExternal,
        depth,
        crawledAt: new Date().toISOString()
      }
      try {
        await this.onPageProcessed(failedPage)
      } catch (e) {
        console.error('Error reporting failed page:', e)
      }
    } finally {
      this.state.removeInProgress(url)
      // Clean up progress tracking
      this.pageProgress.delete(url)
    }
  }

  /**
   * Updates in-links for discovered URLs (batch)
   */
  async updateInLinks(fromUrl, outLinks, externalLinks) {
    // All discovered links should have their in-links updated
    const allLinks = [...outLinks, ...externalLinks]

    if (allLinks.length === 0) {
      return
    }

    try {
      // Emit single batch event for all links
      // This will be used to update pages in the database in one pass
      await this.onPageProcessed({
        type: 'inlinks-batch',
        fromUrl,
        toUrls: allLinks
      })
    } catch (error) {
      console.error(`Error updating in-links for ${fromUrl}:`, error)
    }
  }

  /**
   * Get list of orphaned internal URLs (discovered but not queued)
   * Communicates with UI layer to check database
   */
  async getOrphanedUrls() {
    return new Promise((resolve) => {
      this.onPageProcessed({
        type: 'get-orphaned-urls',
        callback: (urls) => resolve(urls || [])
      })
    })
  }

  /**
   * Pauses the crawler
   */
  pause() {
    this.state.isPaused = true
    this.state.pauseTime = Date.now()
    this.emitProgress()
  }

  /**
   * Resumes the crawler
   */
  resume() {
    this.state.isPaused = false
    this.emitProgress()
  }

  /**
   * Stops the crawler
   */
  stop() {
    this.state.isActive = false
    this.emitProgress()
  }

  /**
   * Resets the crawler state
   */
  reset() {
    this.backoffManager.reset()
    this.state = new CrawlState({
      rootUrl: this.rootUrl,
      baseDomain: this.baseDomain
    })
    this.state.addToQueue(this.rootUrl, 0)
  }

  /**
   * Waits for resume signal
   */
  async waitForResume() {
    while (this.state.isPaused && this.state.isActive) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  /**
   * Gets current state
   */
  getState() {
    return {
      isActive: this.state.isActive,
      isPaused: this.state.isPaused,
      rootUrl: this.state.rootUrl,
      baseDomain: this.state.baseDomain,
      queueSize: this.state.getQueueSize(),
      visitedCount: this.state.visited.size,
      inProgressCount: this.state.inProgress.size,
      startTime: this.state.startTime,
      totalTime: this.state.totalTime,
      stats: this.state.stats,
      backoffState: this.state.backoffState || null,
      backoffManagerState: this.backoffManager.getState(),
      pageProgress: Array.from(this.pageProgress.entries()).map(([url, data]) => ({
        url,
        stage: data.stage,
        timestamp: data.timestamp
      }))
    }
  }

  /**
   * Gets the list of URLs currently in the queue
   */
  getQueueUrls() {
    return this.state.queue.map(item => item.url)
  }

  /**
   * Loads crawler state (for resume functionality)
   */
  loadState(savedState) {
    this.state = CrawlState.fromDB(savedState)
  }

  /**
   * Gets serializable state for persistence
   */
  getSaveableState() {
    return this.state.toJSON()
  }

  /**
   * Emits progress event
   */
  emitProgress() {
    this.onProgress(this.getState())
  }

  /**
   * Emits complete event
   */
  emitComplete() {
    this.onComplete({
      ...this.getState(),
      isActive: false,
      totalTime: this.state.totalTime
    })
  }

  /**
   * Handle backoff start event
   */
  handleBackoffStart(info) {
    console.log('Backoff started:', info)

    // Update state with backoff info
    this.state.backoffState = {
      level: info.level,
      attemptCount: info.attemptCount,
      isInBackoff: true,
      backoffEndTime: info.endTime,
      duration: info.duration,
      reason: 'timeout-overload'
    }

    // Pause the crawler
    this.pause()

    // Emit progress to update UI
    this.emitProgress()
  }

  /**
   * Handle backoff end event
   */
  handleBackoffEnd() {
    console.log('Backoff ended, resuming crawl')

    // Clear backoff state
    if (this.state.backoffState) {
      this.state.backoffState.isInBackoff = false
      this.state.backoffState.backoffEndTime = null
    }

    // Resume the crawler
    this.resume()

    // Emit progress to update UI
    this.emitProgress()
  }

  /**
   * Handle user notification needed event (max backoff reached)
   */
  handleUserNotification(info) {
    console.warn('User notification needed:', info)

    // Update state to indicate max backoff reached
    if (this.state.backoffState) {
      this.state.backoffState.maxBackoffReached = true
    }

    // Emit special event through onError callback with notification flag
    this.onError({
      type: 'backoff-max-reached',
      message: info.message,
      attemptCount: info.attemptCount,
      requiresUserAction: true
    })

    // Keep crawler paused until user decides
    this.pause()
    this.emitProgress()
  }
}
