<script setup lang="ts">
import type { AppsScriptRequestDiagnostic } from '../utils/request-diagnostics'

import {
  clearAppsScriptDiagnostics,
  getAppsScriptDiagnostics,
} from '../utils/request-diagnostics'

const records = ref<AppsScriptRequestDiagnostic[]>([])

onMounted(() => {
  records.value = getAppsScriptDiagnostics(window.localStorage)
})

function clearRecords(): void {
  clearAppsScriptDiagnostics(window.localStorage)
  records.value = []
}
</script>

<template>
  <main class="dashboard-page diagnostics-page">
    <AppHeader />

    <section class="diagnostics-content">
      <header class="section-heading diagnostics-heading">
        <div>
          <h1>請求診斷</h1>
          <p>最近 {{ records.length }} 筆 Apps Script 請求</p>
        </div>
        <button class="button button--secondary" type="button" @click="clearRecords">
          清除
        </button>
      </header>

      <p v-if="records.length === 0" class="empty-state">尚無診斷紀錄。</p>

      <div v-else class="diagnostics-list">
        <article v-for="record in records" :key="`${record.recordedAt}-${record.action}`" class="diagnostic-record">
          <header>
            <strong>{{ record.action }}</strong>
            <span>{{ record.status }}</span>
          </header>
          <dl>
            <div><dt>前端總耗時</dt><dd>{{ record.totalMs }} ms</dd></div>
            <div><dt>等待回應</dt><dd>{{ record.responseWaitMs ?? '-' }} ms</dd></div>
            <div><dt>解析回應</dt><dd>{{ record.parseMs ?? '-' }} ms</dd></div>
            <div><dt>後端耗時</dt><dd>{{ record.backend?.durationMs ?? '-' }} ms</dd></div>
            <div><dt>HTTP</dt><dd>{{ record.httpStatus ?? '-' }}</dd></div>
            <div><dt>錯誤代碼</dt><dd>{{ record.errorCode ?? '-' }}</dd></div>
          </dl>
          <p v-if="record.backend" class="diagnostic-request-id">
            requestId: {{ record.backend.requestId }}
          </p>
          <ul v-if="record.backend?.phases.length" class="diagnostic-phases">
            <li v-for="phase in record.backend.phases" :key="phase.phase">
              {{ phase.phase }}: {{ phase.durationMs }} ms
            </li>
          </ul>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.diagnostics-content {
  width: min(880px, calc(100% - 40px));
  margin: 0 auto;
  padding: 40px 0 72px;
}

.diagnostics-heading p {
  margin-bottom: 0;
  color: #6e6e73;
}

.diagnostics-list {
  display: grid;
  gap: 12px;
}

.diagnostic-record {
  padding: 18px;
  border: 1px solid rgba(60, 60, 67, 0.16);
  border-radius: 8px;
  background: #fff;
}

.diagnostic-record > header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}

.diagnostic-record dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.diagnostic-record dl div {
  min-width: 0;
}

.diagnostic-record dt {
  color: #6e6e73;
  font-size: 12px;
}

.diagnostic-record dd {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
}

.diagnostic-request-id,
.diagnostic-phases {
  margin: 14px 0 0;
  color: #6e6e73;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.diagnostic-phases {
  padding-left: 18px;
}

@media (max-width: 640px) {
  .diagnostic-record dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
