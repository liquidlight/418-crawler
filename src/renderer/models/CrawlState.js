/**
 * CrawlState model representing the current crawler state
 */
export class CrawlState {
  constructor(options = {}) {
    this.id = 'current'
    this.rootUrl = options.rootUrl || ''
    this.baseDomain = options.baseDomain || ''
    this.isActive = options.isActive !== undefined ? options.isActive : false
    this.isPaused = options.isPaused !== undefined ? options.isPaused : false
    this.queue = options.queue || []
    this.visited = new Set(options.visited || [])
    this.inProgress = new Set(options.inProgress || [])
    this.startTime = options.startTime || null
    this.pauseTime = options.pauseTime || null
    this.totalTime = options.totalTime || 0
    this.stats = {
      pagesFound: options.stats?.pagesFound || 0,
      pagesCrawled: options.stats?.pagesCrawled || 0,
      queueSize: options.stats?.queueSize || 0,
      errors: options.stats?.errors || 0,
      ...options.stats
    }
  }

  /**
   * Creates a CrawlState from a database object
   */
  static fromDB(obj) {
    return new CrawlState({
      ...obj,
      visited: obj.visited || [],
      inProgress: obj.inProgress || []
    })
  }

  /**
   * Converts to a database-storable object (serializes Sets to Arrays)
   */
  toJSON() {
    return {
      id: this.id,
      rootUrl: this.rootUrl,
      baseDomain: this.baseDomain,
      isActive: this.isActive,
      isPaused: this.isPaused,
      queue: this.queue,
      visited: Array.from(this.visited),
      inProgress: Array.from(this.inProgress),
      startTime: this.startTime,
      pauseTime: this.pauseTime,
      totalTime: this.totalTime,
      stats: this.stats
    }
  }

  /**
   * Adds a URL to the queue
   */
  addToQueue(url, depth = 0) {
    if (!this.visited.has(url)) {
      this.queue.push({ url, depth })
    }
  }

  /**
   * Marks a URL as visited
   */
  markVisited(url) {
    this.visited.add(url)
  }

  /**
   * Marks a URL as in-progress
   */
  markInProgress(url) {
    this.inProgress.add(url)
  }

  /**
   * Removes a URL from in-progress
   */
  removeInProgress(url) {
    this.inProgress.delete(url)
  }

  /**
   * Checks if URL has been visited
   */
  isVisited(url) {
    return this.visited.has(url)
  }

  /**
   * Gets the next URL to crawl from queue
   */
  getNextFromQueue() {
    return this.queue.shift()
  }

  /**
   * Gets queue size
   */
  getQueueSize() {
    return this.queue.length
  }
}
