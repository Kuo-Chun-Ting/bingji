<script setup lang="ts">
import { Ban, Check, CircleX, RefreshCw, UsersRound } from '@lucide/vue'
import type { AttendanceResult, Registration, TeacherDashboard } from '../../shared/types/domain'
import { callAppsScriptAction } from '../utils/apps-script-api'
import { formatCourseSchedule } from '../utils/course-presentation'

const config = useRuntimeConfig()
const dashboard = ref<TeacherDashboard | null>(null)
const errorMessage = ref('')
const isLoading = ref(true)
const updatingRegistrationId = ref<string | null>(null)

const courseGroups = computed(() => {
  if (!dashboard.value) {
    return []
  }

  return dashboard.value.courses.map(course => ({
    course,
    registrations: dashboard.value?.registrations.filter(registration => registration.courseId === course.id) ?? [],
  }))
})

onMounted(() => {
  void loadDashboard()
})

async function loadDashboard(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''
  try {
    dashboard.value = await callAppsScriptAction<TeacherDashboard>(
      config.public.appsScriptUrl,
      'getTeacherDashboard',
    )
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '無法載入教練資料，請稍後再試。')
  } finally {
    isLoading.value = false
  }
}

async function updateAttendance(registrationId: string, status: AttendanceResult): Promise<void> {
  updatingRegistrationId.value = registrationId
  errorMessage.value = ''
  try {
    const response = await callAppsScriptAction<{ registration: Registration }>(
      config.public.appsScriptUrl,
      'updateAttendance',
      { registrationId, status },
    )
    if (dashboard.value) {
      const remainingLessons = { ...dashboard.value.remainingLessons }
      if (response.registration.status === 'attended') {
        remainingLessons[response.registration.phone] = getRemainingLessons(response.registration.phone) - 1
      }
      dashboard.value = {
        ...dashboard.value,
        registrations: dashboard.value.registrations.map(registration => {
          return registration.id === registrationId ? response.registration : registration
        }),
        remainingLessons,
      }
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '無法更新到課狀態，請稍後再試。')
  } finally {
    updatingRegistrationId.value = null
  }
}

function getStudentName(phone: string): string {
  return dashboard.value?.students.find(student => student.phone === phone)?.name ?? '未知學員'
}

function getRemainingLessons(phone: string): number {
  return dashboard.value?.remainingLessons[phone] ?? 0
}

async function logout(): Promise<void> {
  await navigateTo('/')
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message === 'NOT_IMPLEMENTED') {
    return '此功能尚未實作。'
  }

  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data
    if (data && typeof data === 'object' && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }

  return fallback
}
</script>

<template>
  <main class="dashboard-page">
    <AppHeader role="teacher" show-logout @logout="logout" />
    <section v-if="isLoading" class="page-state" aria-live="polite">正在載入課程名單...</section>
    <section v-else-if="errorMessage && !dashboard" class="page-state page-state--error" role="alert">
      <p>{{ errorMessage }}</p>
      <button class="button button--secondary" type="button" @click="loadDashboard"><RefreshCw :size="18" aria-hidden="true" />重新載入</button>
    </section>
    <template v-else-if="dashboard">
      <section class="dashboard-summary" aria-labelledby="teacher-dashboard-title">
        <div>
          <p class="eyebrow">教練管理</p>
          <h1 id="teacher-dashboard-title">課程與到課紀錄</h1>
          <p>依課程確認已報名學員的實際到課狀態。</p>
        </div>
        <div class="lesson-counter" aria-label="學員人數">
          <UsersRound :size="24" aria-hidden="true" />
          <span><strong>{{ dashboard.students.length }}</strong> 位學員</span>
        </div>
      </section>
      <p v-if="errorMessage" class="inline-error" role="alert">{{ errorMessage }}</p>
      <section v-if="courseGroups.length" class="course-management" aria-label="課程名單">
        <article v-for="group in courseGroups" :key="group.course.id" class="course-panel">
          <header class="course-panel__header">
            <div><p class="eyebrow">課程名單</p><h2>{{ formatCourseSchedule(group.course) }}</h2></div>
            <span class="course-availability" :class="{ 'course-availability--closed': !group.course.isOpen }">{{ group.course.isOpen ? '開放報名' : '暫停報名' }}</span>
          </header>
          <div v-if="group.registrations.length" class="roster-table-wrap">
            <table class="roster-table">
              <thead><tr><th scope="col">學員</th><th scope="col">剩餘堂數</th><th scope="col">目前狀態</th><th scope="col">到課操作</th></tr></thead>
              <tbody>
                <tr v-for="registration in group.registrations" :key="registration.id">
                  <td>{{ getStudentName(registration.phone) }}</td>
                  <td>{{ getRemainingLessons(registration.phone) }} 堂</td>
                  <td><StatusBadge :status="registration.status" /></td>
                  <td>
                    <div v-if="registration.status === 'registered'" class="attendance-actions">
                      <button class="attendance-button attendance-button--attended" type="button" aria-label="標記為已到課" title="標記為已到課" :disabled="updatingRegistrationId === registration.id" @click="updateAttendance(registration.id, 'attended')"><Check :size="18" aria-hidden="true" /></button>
                      <button class="attendance-button attendance-button--absent" type="button" aria-label="標記為未到課" title="標記為未到課" :disabled="updatingRegistrationId === registration.id" @click="updateAttendance(registration.id, 'absent')"><CircleX :size="18" aria-hidden="true" /></button>
                      <button class="attendance-button attendance-button--cancelled" type="button" aria-label="標記為取消" title="標記為取消" :disabled="updatingRegistrationId === registration.id" @click="updateAttendance(registration.id, 'cancelled')"><Ban :size="18" aria-hidden="true" /></button>
                    </div>
                    <span v-else class="readonly-status">已完成</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">目前尚無學員報名這堂課。</div>
        </article>
      </section>
      <section v-else class="empty-state">目前尚未建立課程。</section>
    </template>
  </main>
</template>
