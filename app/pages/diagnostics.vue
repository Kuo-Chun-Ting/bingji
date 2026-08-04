<script setup lang="ts">
import type { AppsScriptRequestDiagnostic } from '../utils/request-diagnostics'

import {
  clearAppsScriptDiagnostics,
  formatDiagnosticDuration,
  getAppsScriptDiagnostics,
  getAppsScriptTimingBreakdown,
} from '../utils/request-diagnostics'

const records = ref<AppsScriptRequestDiagnostic[]>([])
const presentedRecords = computed(() => records.value.map(record => ({
  record,
  timing: getAppsScriptTimingBreakdown(record),
})))

const actionLabels: Record<string, string> = {
  bindLineAccount: '設定報名電話',
  getStudentDashboard: '學員首頁資料',
  getTeacherDashboard: '教練後台資料',
  loginAsTeacher: '教練登入',
  loginWithLine: 'LINE 登入',
  registerCourse: '課程報名',
  updateAttendance: '更新到課狀態',
}

const phaseLabels: Record<string, string> = {
  appendAccount: '寫入 LINE 帳號',
  appendRegistration: '寫入報名紀錄',
  getConfiguration: '讀取設定',
  lineIdTokenVerification: '驗證 LINE 身分',
  lineTokenExchange: '取得 LINE 登入憑證',
  loadAccounts: '讀取 LINE 帳號',
  loadCourses: '讀取課程',
  loadRegistrations: '讀取報名',
  loadStudents: '讀取學員',
  replaceRegistration: '更新報名紀錄',
  scriptLockWait: '等待寫入鎖',
}

onMounted(() => {
  records.value = getAppsScriptDiagnostics(window.localStorage)
})

function clearRecords(): void {
  clearAppsScriptDiagnostics(window.localStorage)
  records.value = []
}

function getActionLabel(action: string): string {
  return actionLabels[action] ?? action
}

function getPhaseLabel(phase: string): string {
  return phaseLabels[phase] ?? phase
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
        <article
          v-for="{ record, timing } in presentedRecords"
          :key="`${record.recordedAt}-${record.action}`"
          class="diagnostic-record"
        >
          <header>
            <strong>{{ getActionLabel(record.action) }}</strong>
            <span :class="{ 'status--success': record.status === 'success' }">
              {{ record.status === 'success' ? '成功' : '失敗' }}
            </span>
          </header>

          <div class="diagnostic-total">
            <span>API 總耗時</span>
            <strong>{{ formatDiagnosticDuration(timing.totalMs) }}</strong>
          </div>

          <ul class="diagnostic-timeline">
            <li>
              <span>傳輸與平台等待 <small>估算</small></span>
              <strong>{{ formatDiagnosticDuration(timing.platformWaitMs) }}</strong>
            </li>
            <li class="diagnostic-backend">
              <div class="diagnostic-line">
                <span>Apps Script 執行</span>
                <strong>{{ formatDiagnosticDuration(timing.backendMs) }}</strong>
              </div>
              <ul v-if="record.backend" class="diagnostic-phases">
                <li v-for="phase in record.backend.phases" :key="phase.phase">
                  <span>{{ getPhaseLabel(phase.phase) }}</span>
                  <strong>{{ formatDiagnosticDuration(phase.durationMs) }}</strong>
                </li>
                <li v-if="timing.backendOtherMs">
                  <span>其他程式</span>
                  <strong>{{ formatDiagnosticDuration(timing.backendOtherMs) }}</strong>
                </li>
              </ul>
            </li>
            <li>
              <span>前端解析</span>
              <strong>{{ formatDiagnosticDuration(timing.parseMs) }}</strong>
            </li>
          </ul>

          <details class="diagnostic-technical">
            <summary>技術資訊</summary>
            <dl>
              <div><dt>Action</dt><dd>{{ record.action }}</dd></div>
              <div><dt>HTTP</dt><dd>{{ record.httpStatus ?? '-' }}</dd></div>
              <div><dt>錯誤代碼</dt><dd>{{ record.errorCode ?? '-' }}</dd></div>
              <div><dt>Request ID</dt><dd>{{ record.backend?.requestId ?? '-' }}</dd></div>
            </dl>
          </details>
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
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.diagnostic-record > header span {
  color: #c9342b;
  font-size: 13px;
}

.diagnostic-record > header .status--success {
  color: #248a3d;
}

.diagnostic-total,
.diagnostic-line,
.diagnostic-timeline > li,
.diagnostic-phases > li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
}

.diagnostic-total {
  padding: 14px 0;
  border-block: 1px solid rgba(60, 60, 67, 0.12);
}

.diagnostic-total strong {
  font-size: 24px;
  font-weight: 600;
}

.diagnostic-timeline,
.diagnostic-phases {
  display: grid;
  gap: 12px;
  padding: 0;
  list-style: none;
}

.diagnostic-timeline {
  margin: 16px 0 0;
}

.diagnostic-timeline small {
  color: #6e6e73;
  font-size: 11px;
}

.diagnostic-timeline strong,
.diagnostic-phases strong {
  white-space: nowrap;
  font-weight: 500;
}

.diagnostic-timeline > .diagnostic-backend {
  display: block;
}

.diagnostic-phases {
  margin: 12px 0 0 8px;
  padding-left: 16px;
  border-left: 2px solid rgba(60, 60, 67, 0.12);
  color: #6e6e73;
  font-size: 14px;
}

.diagnostic-technical {
  margin-top: 18px;
  color: #6e6e73;
  font-size: 13px;
}

.diagnostic-technical summary {
  cursor: pointer;
}

.diagnostic-technical dl {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
}

.diagnostic-technical dl div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
}

.diagnostic-technical dt {
  color: #86868b;
}

.diagnostic-technical dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

@media (max-width: 640px) {
  .diagnostics-content {
    width: calc(100% - 24px);
    padding-top: 24px;
  }

  .diagnostic-record {
    padding: 16px;
  }

  .diagnostic-total strong {
    font-size: 21px;
  }
}
</style>
