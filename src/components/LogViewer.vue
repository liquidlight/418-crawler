<template>
  <div class="log-viewer">
    <div class="log-controls">
      <div class="log-summary">
        <span class="count">{{ logs.length }} events</span>
      </div>
      <button @click="clearLogs" class="clear-btn">Clear Logs</button>
    </div>
    
    <div class="log-list" ref="logContainer">
      <div v-if="logs.length === 0" class="empty-state">
        No logs captured yet.
      </div>
      <div v-else v-for="log in logs" :key="log.id" :class="['log-item', log.level]">
        <span class="timestamp">[{{ log.timestamp }}]</span>
        <span class="level">{{ log.level.toUpperCase() }}:</span>
        <pre class="message">{{ log.message }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLogger } from '../composables/useLogger.js'

const { logs, clearLogs } = useLogger()
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  border-radius: 4px;
  overflow: hidden;
}

.log-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #333;
}

.log-summary {
  font-size: 0.85rem;
  color: #888;
}

.clear-btn {
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 0.8rem;
  cursor: pointer;
}

.clear-btn:hover {
  background: #444;
  color: #fff;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  padding: 4px 0;
  border-bottom: 1px solid #333;
  font-size: 0.85rem;
}

.log-item:last-child {
  border-bottom: none;
}

.timestamp {
  color: #888;
  margin-right: 8px;
  white-space: nowrap;
}

.level {
  font-weight: bold;
  margin-right: 8px;
  min-width: 50px;
}

.log-item.log .level { color: #61afef; }
.log-item.debug .level { color: #98c379; }
.log-item.warn .level { color: #e5c07b; }
.log-item.error .level { color: #e06c75; }

.message {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #666;
}
</style>
