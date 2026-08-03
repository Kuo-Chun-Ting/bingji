<script setup lang="ts">
import { Mountain } from '@lucide/vue'

defineProps<{
  compact?: boolean
}>()
</script>

<template>
  <span class="app-mark" :class="{ 'app-mark--compact': compact }" aria-hidden="true">
    <Mountain />
  </span>
</template>
