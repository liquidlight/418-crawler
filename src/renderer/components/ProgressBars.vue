<template>
  <div class="progress-bars-container">
    <div
      v-for="(item, idx) in visibleBars"
      :key="`${item.url}-${idx}`"
      class="progress-bar-vertical"
      :title="item.url"
      :data-stage="item.stage"
    >
      <div class="progress-bar-fill" :style="{ height: getHeight(item.stage) }"></div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ProgressBars',
  props: {
    pageProgress: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    // Filter to stages 1-3 and limit to 5 bars
    const visibleBars = computed(() => {
      return props.pageProgress
        .filter(item => item.stage >= 1 && item.stage <= 3)
        .slice(0, 5)
    })

    // Calculate height percentage based on stage
    const getHeight = (stage) => {
      const heights = {
        1: '25%',
        2: '50%',
        3: '75%'
      }
      return heights[stage] || '0%'
    }

    return {
      visibleBars,
      getHeight
    }
  }
}
</script>

<style scoped>
.progress-bars-container {
  display: flex;
  gap: 4px;
  height: 20px;
  align-items: flex-end;
  margin-left: 0.75rem;
}

.progress-bar-vertical {
  width: 4px;
  height: 20px;
  background: #e1e4e8;
  border-radius: 2px;
  overflow: hidden;
  transition: width 0.2s ease;
  cursor: help;
}

.progress-bar-vertical:hover {
  width: 6px;
}

.progress-bar-fill {
  width: 100%;
  height: 0;
  transition: height 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
  background: linear-gradient(to top, #0366d6, #0366d6);
}

/* Color by stage */
.progress-bar-vertical[data-stage="1"] .progress-bar-fill {
  background: linear-gradient(to top, #ffc107, #ffc107);
}

.progress-bar-vertical[data-stage="2"] .progress-bar-fill {
  background: linear-gradient(to top, #0366d6, #0366d6);
}

.progress-bar-vertical[data-stage="3"] .progress-bar-fill {
  background: linear-gradient(to top, #9b59b6, #9b59b6);
}

/* Responsive sizing */
@media (max-width: 768px) {
  .progress-bars-container {
    gap: 3px;
    height: 18px;
  }

  .progress-bar-vertical {
    width: 3px;
  }

  .progress-bar-vertical:hover {
    width: 5px;
  }
}
</style>
