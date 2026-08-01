<script setup lang="ts">
import { LogOut, Mountain } from '@lucide/vue'

defineProps<{
  showLogout?: boolean
}>()

defineEmits<{
  logout: []
}>()
</script>

<template>
  <header class="app-header">
    <NuxtLink class="brand" to="/" aria-label="冰記首頁">
      <span class="brand-mark" aria-hidden="true"><Mountain :size="22" /></span>
      <span>
        <strong>冰記</strong>
      </span>
    </NuxtLink>
    <button
      v-if="showLogout"
      class="icon-button"
      type="button"
      aria-label="登出"
      title="登出"
      @click="$emit('logout')"
    >
      <LogOut :size="20" aria-hidden="true" />
    </button>
  </header>
</template>
