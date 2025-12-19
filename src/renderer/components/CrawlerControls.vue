<template>
  <div class="crawler-controls">
    <div class="button-group">
      <button
        v-if="isActive && !isPaused"
        @click="$emit('pause')"
        class="btn btn-warning"
      >
        ⏸ Pause
      </button>
      <button
        v-else-if="isActive && isPaused"
        @click="$emit('resume')"
        class="btn btn-success"
      >
        ▶ Resume
      </button>

      <button
        v-if="isActive"
        @click="$emit('stop')"
        class="btn btn-danger"
      >
        ⏹ Stop
      </button>

      <button
        @click="$emit('reset')"
        class="btn btn-secondary"
      >
        🔄 Reset
      </button>

      <button
        @click="$emit('export')"
        class="btn btn-info"
      >
        ↓ Export
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CrawlerControls',
  props: {
    isActive: Boolean,
    isPaused: Boolean
  },
  emits: ['pause', 'resume', 'stop', 'reset', 'export']
}
</script>

<style scoped>
.crawler-controls {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  width: 100%;
  text-align: center;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover {
  background: #e67e22;
  transform: translateX(2px);
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover {
  background: #229954;
  transform: translateX(2px);
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
  transform: translateX(2px);
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
  transform: translateX(2px);
}

.btn-info {
  background: #3498db;
  color: white;
}

.btn-info:hover {
  background: #2980b9;
  transform: translateX(2px);
}
</style>
