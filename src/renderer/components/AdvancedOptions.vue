<template>
  <div class="advanced-options">
    <button @click="expanded = !expanded" class="toggle-btn" :disabled="disabled">
      <span>Advanced Options</span>
      <svg
        class="chevron"
        :class="{ 'chevron-up': expanded }"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M4.427 9.573l3.396-3.396a.25.25 0 01.354 0l3.396 3.396a.25.25 0 01-.177.427H4.604a.25.25 0 01-.177-.427z"/>
      </svg>
    </button>

    <div v-if="expanded" class="options-panel">
      <!-- Cookie Authentication Section -->
      <div class="option-group">
        <h4>Cookie Authentication</h4>
        <p class="option-description">
          Open the target site in a browser to log in. Cookies from your
          session will be sent with every crawl request.
        </p>

        <button
          @click="handleLaunchBrowser"
          :disabled="!url || disabled || isLaunchingBrowser || !isElectron"
          class="btn btn-secondary"
        >
          {{ isLaunchingBrowser ? 'Browser open...' : 'Launch Browser to Authenticate' }}
        </button>

        <!-- Web mode notice -->
        <p v-if="!isElectron" class="web-mode-notice">
          Cookie authentication requires the desktop app
        </p>

        <!-- Cookie status indicator -->
        <div v-if="cookieCount > 0" class="cookie-status">
          <span class="cookie-badge">
            {{ cookieCount }} cookie{{ cookieCount !== 1 ? 's' : '' }} stored for {{ cookieDomain }}
          </span>
          <button @click="handleClearCookies" class="btn-link">Clear</button>
        </div>

        <!-- Error message -->
        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'AdvancedOptions',
  props: {
    url: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['cookies-updated', 'cookies-cleared'],
  setup(props, { emit }) {
    const expanded = ref(false)
    const cookieCount = ref(0)
    const cookieDomain = ref('')
    const isLaunchingBrowser = ref(false)
    const errorMessage = ref('')
    const storedCookies = ref([])

    // Check if running in Electron
    const isElectron = computed(() => {
      return typeof window !== 'undefined' && window.electronAPI?.openAuthBrowser
    })

    async function handleLaunchBrowser() {
      if (!props.url || !isElectron.value) {
        return
      }

      try {
        errorMessage.value = ''
        isLaunchingBrowser.value = true

        // Normalize URL (add https:// if missing)
        let targetUrl = props.url.trim()
        if (!targetUrl.match(/^https?:\/\//i)) {
          targetUrl = 'https://' + targetUrl
        }
        // Upgrade http to https
        else if (targetUrl.match(/^http:\/\//i)) {
          targetUrl = 'https:' + targetUrl.substring(5)
        }

        // Validate URL
        try {
          new URL(targetUrl)
        } catch (e) {
          throw new Error(`Invalid URL: ${e.message}`)
        }

        // Open auth browser and wait for cookies
        const result = await window.electronAPI.openAuthBrowser(targetUrl)

        if (result.error) {
          throw new Error(result.error)
        }

        // Store cookies and update UI
        storedCookies.value = result.cookies || []
        cookieCount.value = result.count
        cookieDomain.value = result.domain

        // Emit event with cookies
        emit('cookies-updated', {
          cookies: storedCookies.value,
          domain: result.domain,
          count: result.count
        })

        console.log(`[AdvancedOptions] Captured ${result.count} cookies for ${result.domain}`)
      } catch (error) {
        console.error('[AdvancedOptions] Error launching auth browser:', error)
        errorMessage.value = error.message || 'Failed to open authentication browser'
      } finally {
        isLaunchingBrowser.value = false
      }
    }

    async function handleClearCookies() {
      try {
        if (isElectron.value) {
          await window.electronAPI.clearStoredCookies()
        }

        storedCookies.value = []
        cookieCount.value = 0
        cookieDomain.value = ''
        errorMessage.value = ''

        emit('cookies-cleared')

        console.log('[AdvancedOptions] Cookies cleared')
      } catch (error) {
        console.error('[AdvancedOptions] Error clearing cookies:', error)
        errorMessage.value = 'Failed to clear cookies'
      }
    }

    return {
      expanded,
      cookieCount,
      cookieDomain,
      isLaunchingBrowser,
      errorMessage,
      isElectron,
      handleLaunchBrowser,
      handleClearCookies
    }
  }
}
</script>

<style scoped>
.advanced-options {
  margin-top: 1rem;
  width: 100%;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #586069;
  transition: all 0.2s;
  width: fit-content;
}

.toggle-btn:hover:not(:disabled) {
  background: #f6f8fa;
  border-color: #0366d6;
  color: #0366d6;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chevron {
  transition: transform 0.2s;
  transform: rotate(180deg);
}

.chevron-up {
  transform: rotate(0deg);
}

.options-panel {
  margin-top: 1rem;
  padding: 1rem;
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-group h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #24292e;
}

.option-description {
  margin: 0;
  font-size: 0.85rem;
  color: #586069;
  line-height: 1.5;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
  width: fit-content;
}

.btn-secondary {
  background: #ffffff;
  color: #24292e;
  border: 1px solid #e1e4e8;
}

.btn-secondary:hover:not(:disabled) {
  background: #f6f8fa;
  border-color: #0366d6;
  color: #0366d6;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cookie-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  width: fit-content;
}

.cookie-badge {
  font-size: 0.85rem;
  color: #155724;
  font-weight: 500;
}

.btn-link {
  background: transparent;
  border: none;
  color: #155724;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
  font-weight: 500;
}

.btn-link:hover {
  color: #0c3d1a;
}

.web-mode-notice {
  margin: 0;
  font-size: 0.85rem;
  color: #6a737d;
  font-style: italic;
}

.error-message {
  margin: 0;
  font-size: 0.85rem;
  color: #d73a49;
  background: #ffeef0;
  border: 1px solid #fdaeb7;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}
</style>
