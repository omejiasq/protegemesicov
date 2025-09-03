<template>
  <div class="kpi-card p-card p-3 flex flex-column align-items-center justify-content-center text-center">
    <span class="kpi-icon" :style="{ background: chipBg, color: chipColor }">
      <i :class="icon"></i>
    </span>
    <div class="kpi-value">{{ value }}</div>
    <div class="kpi-label">{{ label }}</div>
    <div v-if="trendText" class="kpi-trend" :class="trendPositive ? 'text-green-600' : 'text-red-500'">
      <i :class="trendPositive ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" class="mr-1"></i>{{ trendText }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  label: string
  value: string | number
  trendText?: string
  trendPositive?: boolean
  chipBg?: string
  chipColor?: string
}>()
</script>

<style scoped>
.kpi-card {
  border-radius: 12px;
  min-height: 140px;
}

.kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
}

.kpi-value {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-color);
}

.kpi-label {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
}

.kpi-trend {
  font-size: 0.75rem;
  margin-top: 0.5rem;
}
</style>
