<script setup lang="ts">
import { LogOut, Mountain } from '@lucide/vue'

defineProps<{
  role?: 'student' | 'teacher'
  showLogout?: boolean
}>()

defineEmits<{
  logout: []
}>()
</script>

<template>
  <header class="app-header">
    <NuxtLink class="brand" to="/" aria-label="雪課簿首頁">
      <span class="brand-mark" aria-hidden="true"><Mountain :size="22" /></span>
      <span>
        <strong>雪課簿</strong>
        <small v-if="role === 'student'">學員專區</small>
        <small v-else-if="role === 'teacher'">教練管理</small>
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
