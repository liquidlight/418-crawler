/**
 * BackoffManager - Manages automatic pause/backoff when server is overloaded
 *
 * Features:
 * - Tracks timeout events in a sliding 30-second window
 * - Detects 5+ internal link timeouts within 30s
 * - Implements progressive backoff: 30s → 1m → 2m
 * - Auto-resumes after backoff period
 * - Resets on successful fetches (server recovery detection)
 */
export class BackoffManager {
  constructor(options = {}) {
    this.enabled = options.enabled !== false
    this.timeoutThreshold = options.timeoutThreshold || 5
    this.windowDuration = options.windowDuration || 30000 // 30 seconds
    this.backoffLevels = options.backoffLevels || [30000, 60000, 120000] // 30s, 1m, 2m

    // State
    this.timeoutEvents = [] // Circular buffer of timeout events
    this.currentLevel = 0
    this.attemptCount = 0
    this.isInBackoff = false
    this.backoffEndTime = null
    this.backoffTimer = null

    // Callbacks
    this.onBackoffStart = options.onBackoffStart || (() => {})
    this.onBackoffEnd = options.onBackoffEnd || (() => {})
    this.onUserNotificationNeeded = options.onUserNotificationNeeded || (() => {})
  }

  /**
   * Records a timeout event for tracking
   */
  recordTimeout(url, isInternal) {
    if (!this.enabled || !isInternal) return

    const now = Date.now()
    this.timeoutEvents.push({ url, timestamp: now, isInternal })
    this.cleanOldEvents(now)

    // Check if threshold exceeded
    if (this.shouldTriggerBackoff()) {
      this.triggerBackoff()
    }
  }

  /**
   * Records a successful fetch (resets backoff on recovery)
   */
  recordSuccess(url, isInternal) {
    if (!this.enabled || !isInternal) return

    // If we're recovering from backoff, reset the level
    if (this.isInBackoff || this.currentLevel > 0) {
      console.log('Server recovered: successful fetch after timeout issues')
      this.reset()
    }
  }

  /**
   * Removes events older than the sliding window
   */
  cleanOldEvents(now = Date.now()) {
    const cutoff = now - this.windowDuration
    this.timeoutEvents = this.timeoutEvents.filter(e => e.timestamp > cutoff)
  }

  /**
   * Checks if we should trigger a backoff
   */
  shouldTriggerBackoff() {
    const now = Date.now()
    this.cleanOldEvents(now)

    const recentTimeouts = this.timeoutEvents.filter(e => e.isInternal)
    return recentTimeouts.length >= this.timeoutThreshold
  }

  /**
   * Triggers a backoff pause
   */
  triggerBackoff() {
    if (this.isInBackoff) return // Already in backoff

    // Determine backoff duration
    const duration = this.backoffLevels[this.currentLevel] || this.backoffLevels[this.backoffLevels.length - 1]

    this.isInBackoff = true
    this.attemptCount++
    this.backoffEndTime = Date.now() + duration

    console.log(`Backoff triggered: level ${this.currentLevel + 1}, duration ${duration}ms, attempt ${this.attemptCount}`)

    // Notify crawler to pause
    this.onBackoffStart({
      level: this.currentLevel,
      attemptCount: this.attemptCount,
      duration,
      endTime: this.backoffEndTime
    })

    // Schedule auto-resume
    this.backoffTimer = setTimeout(() => {
      this.endBackoff()
    }, duration)
  }

  /**
   * Ends the backoff period and resumes crawling
   */
  endBackoff() {
    if (!this.isInBackoff) return

    console.log('Backoff ended, resuming crawl...')

    this.isInBackoff = false
    this.backoffEndTime = null

    // Clear timeout events to give server fresh start
    this.timeoutEvents = []

    // Increment backoff level for next time (if needed)
    if (this.currentLevel < this.backoffLevels.length - 1) {
      this.currentLevel++
    } else {
      // Max level reached, notify user
      this.onUserNotificationNeeded({
        message: 'Server consistently overloaded after 3 attempts',
        attemptCount: this.attemptCount
      })
    }

    this.onBackoffEnd()
  }

  /**
   * Resets backoff state (server recovered)
   */
  reset() {
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer)
      this.backoffTimer = null
    }

    this.currentLevel = 0
    this.attemptCount = 0
    this.isInBackoff = false
    this.backoffEndTime = null
    this.timeoutEvents = []
  }

  /**
   * Gets current backoff state for persistence
   */
  getState() {
    return {
      enabled: this.enabled,
      currentLevel: this.currentLevel,
      attemptCount: this.attemptCount,
      isInBackoff: this.isInBackoff,
      backoffEndTime: this.backoffEndTime,
      timeoutCount: this.timeoutEvents.length
    }
  }

  /**
   * Manually cancel backoff (user intervention)
   */
  cancelBackoff() {
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer)
      this.backoffTimer = null
    }

    this.isInBackoff = false
    this.backoffEndTime = null
    this.timeoutEvents = []
    // Keep currentLevel to continue progression if timeouts persist
  }
}
