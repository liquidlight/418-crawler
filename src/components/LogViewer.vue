<template>
  <div class="log-viewer">
    <div class="log-controls">
      <div class="log-summary">
        <span class="count">{{ logs.length }} events</span>
      </div>
      <button @click="clearLogs" class="clear-btn">Clear</button>
    </div>

    <div class="log-list" ref="logContainer">
      <div v-if="logs.length === 0" class="empty-state">
        No logs yet
      </div>
      <div v-else v-for="log in logs" :key="log.id" :class="['log-item', log.level]">
        <span class="timestamp">{{ log.timestamp }}</span>
        <span class="level">{{ log.level }}</span>
        <span class="message">{{ log.message }}</span>
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
  font-size: 12px;
  overflow: hidden;
}

.log-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  flex-shrink: 0;
}

.log-summary {
  font-size: 11px;
  color: #888;
}

.clear-btn {
  background: #333;
  color: #999;
  border: 1px solid #444;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #3e3e42;
  color: #ccc;
  border-color: #555;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.log-item {
  display: grid;
  grid-template-columns: 55px 45px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 3px 8px;
  border-bottom: 1px solid #2d2d30;
  line-height: 1.4;
  white-space: nowrap;
}

.log-item > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-item .message {
  white-space: normal;
  word-break: break-word;
}

.timestamp {
  color: #6a6a6a;
  font-size: 11px;
}

.level {
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-item.log .level {
  color: #569cd6;
}

.log-item.debug .level {
  color: #6a9955;
}

.log-item.warn .level {
  color: #dcdcaa;
}

.log-item.error .level {
  color: #f48771;
}

.message {
  color: #ababab;
  font-size: 12px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #555;
  font-size: 12px;
}
</style>
