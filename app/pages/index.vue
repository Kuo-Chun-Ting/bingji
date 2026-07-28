<script setup lang="ts">
import { CheckCircle2, CircleAlert, RefreshCw, Server } from '@lucide/vue'

import { getAppsScriptHealth } from '../utils/apps-script-api'

type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

const config = useRuntimeConfig()
const connectionStatus = ref<ConnectionStatus>('checking')
const connectionMessage = ref('正在連線...')

onMounted(() => {
  void checkConnection()
})

async function checkConnection(): Promise<void> {
  connectionStatus.value = 'checking'
  connectionMessage.value = '正在連線...'

  try {
    await getAppsScriptHealth(config.public.appsScriptUrl)
    connectionStatus.value = 'connected'
    connectionMessage.value = 'Apps Script 已連線'
  } catch (error) {
    connectionStatus.value = 'disconnected'
    connectionMessage.value = getConnectionErrorMessage(error)
  }
}

function getConnectionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'Missing Apps Script endpoint') {
    return '尚未設定 Apps Script URL'
  }

  return '無法連線 Apps Script'
}
</script>

<template>
  <main class="auth-page">
    <AppHeader />
    <div class="auth-content">
      <div class="auth-intro">
        <p class="eyebrow">SKI LESSONS</p>
        <h1>雪課簿</h1>
        <p>滑雪課程管理系統</p>
      </div>
      <section class="auth-panel connection-panel" aria-labelledby="connection-title">
        <div class="auth-panel__heading">
          <span class="panel-icon panel-icon--blue" aria-hidden="true"><Server :size="20" /></span>
          <div>
            <h2 id="connection-title">系統連線</h2>
            <p>Google Apps Script</p>
          </div>
        </div>
        <div
          class="connection-status"
          :class="`connection-status--${connectionStatus}`"
          aria-live="polite"
        >
          <RefreshCw v-if="connectionStatus === 'checking'" :size="20" aria-hidden="true" />
          <CheckCircle2 v-else-if="connectionStatus === 'connected'" :size="20" aria-hidden="true" />
          <CircleAlert v-else :size="20" aria-hidden="true" />
          <span>{{ connectionMessage }}</span>
        </div>
        <button
          v-if="connectionStatus === 'disconnected'"
          class="button button--secondary button--full"
          type="button"
          @click="checkConnection"
        >
          <RefreshCw :size="18" aria-hidden="true" />
          重新連線
        </button>
      </section>
    </div>
  </main>
</template>
