<template>
  <div class="crawler-input">
    <div class="input-group">
      <label for="url-input">Website URL</label>
      <div class="input-wrapper">
        <input
          id="url-input"
          v-model="inputUrl"
          @keyup.enter="handleSubmit"
          placeholder="https://example.com"
          type="text"
          :disabled="disabled"
          class="url-input"
        />
        <button
          @click="handleSubmit"
          :disabled="disabled || !inputUrl || !inputUrl.trim()"
          class="btn btn-primary"
        >
          Crawl
        </button>
      </div>
    </div>
    <p v-if="extractedDomain" class="domain-info">
      Base domain: <strong>{{ extractedDomain }}</strong>
    </p>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { extractDomain } from '../utils/url.js'

export default {
  name: 'CrawlerInput',
  props: {
    url: String,
    disabled: Boolean
  },
  emits: ['crawl'],
  setup(props, { emit }) {
    // Use prop as initial value, but maintain independent local state
    const inputUrl = ref(props.url || '')

    const extractedDomain = computed(() => {
      if (inputUrl.value) {
        try {
          return extractDomain(inputUrl.value)
        } catch {
          return null
        }
      }
      return null
    })

    function handleSubmit() {
      if (!props.disabled && inputUrl.value && inputUrl.value.trim()) {
        emit('crawl', inputUrl.value.trim())
      }
    }

    return {
      inputUrl,
      extractedDomain,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.crawler-input {
  background: white;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.input-group {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: center;
}

label {
  font-weight: 600;
  color: #24292e;
  font-size: 0.85rem;
  text-align: left;
  white-space: nowrap;
  min-width: fit-content;
}

.input-wrapper {
  display: flex;
  gap: 0.75rem;
  flex: 1;
}

.url-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 2px solid #e1e4e8;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: 'Monaco', 'Courier New', monospace;
  background: white;
  color: #24292e;
  transition: all 0.2s;
}

.url-input::placeholder {
  color: #a0aec0;
}

.url-input:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.url-input:disabled {
  background: #f6f8fa;
  color: #6a737d;
  border-color: #e1e4e8;
  cursor: not-allowed;
}

.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary {
  background: #0366d6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0256c7;
  box-shadow: 0 4px 12px rgba(3, 102, 214, 0.3);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #e1e4e8;
  color: #6a737d;
}

.domain-info {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: #586069;
  text-align: left;
}

.domain-info strong {
  color: #0366d6;
  font-family: 'Monaco', 'Courier New', monospace;
  font-weight: 600;
}
</style>
