<script setup lang="ts">
import { BookOpenCheck, RefreshCw } from '@lucide/vue'
import type { Registration, StudentDashboard } from '../../shared/types/domain'
import { callAppsScriptAction } from '../utils/apps-script-api'
import { clearSession, getSession, type AuthSession } from '../utils/auth-session'
import { formatCourseSchedule } from '../utils/course-presentation'

const config = useRuntimeConfig()
const session = ref<AuthSession | null>(null)
const dashboard = ref<StudentDashboard | null>(null)
const errorMessage = ref('')
const isLoading = ref(true)
const registeringCourseId = ref<string | null>(null)

const availableCourses = computed(() => {
  if (!dashboard.value) {
    return []
  }

  const registeredCourseIds = new Set(dashboard.value.registrations.map(registration => registration.courseId))
  return dashboard.value.courses.filter(course => course.isOpen && !registeredCourseIds.has(course.id))
})

const registrationHistory = computed(() => {
  if (!dashboard.value) {
    return []
  }

  return dashboard.value.registrations.map(registration => ({
    registration,
    course: dashboard.value?.courses.find(course => course.id === registration.courseId),
  }))
})

onMounted(async () => {
  const savedSession = getSession(window.localStorage)
  if (!savedSession || savedSession.role !== 'student') {
    await logout()
    return
  }

  session.value = savedSession
  await loadDashboard()
})

async function loadDashboard(): Promise<void> {
  if (!session.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    dashboard.value = await callAppsScriptAction<StudentDashboard>(
      config.public.appsScriptUrl,
      'getStudentDashboard',
      { token: session.value.token },
    )
  } catch (error) {
    if (await redirectWhenSessionIsInvalid(error)) {
      return
    }
    errorMessage.value = getErrorMessage(error, '無法載入學員資料，請稍後再試。')
  } finally {
    isLoading.value = false
  }
}

async function registerForCourse(courseId: string): Promise<void> {
  if (!session.value) {
    return
  }

  registeringCourseId.value = courseId
  errorMessage.value = ''
  try {
    const response = await callAppsScriptAction<{ registration: Registration }>(
      config.public.appsScriptUrl,
      'registerCourse',
      { token: session.value.token, courseId },
    )
    if (dashboard.value) {
      dashboard.value = { ...dashboard.value, registrations: [...dashboard.value.registrations, response.registration] }
    }
  } catch (error) {
    if (await redirectWhenSessionIsInvalid(error)) {
      return
    }
    errorMessage.value = getErrorMessage(error, '無法完成報名，請稍後再試。')
  } finally {
    registeringCourseId.value = null
  }
}

async function logout(): Promise<void> {
  clearSession(window.localStorage)
  await navigateTo('/')
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message === 'COURSE_CLOSED') {
    return '這堂課目前未開放報名。'
  }

  if (error instanceof Error && error.message === 'ALREADY_REGISTERED') {
    return '你已經報名這堂課。'
  }

  if (error instanceof Error && error.message === 'DUPLICATE_PHONE') {
    return 'Google Sheet 有重複電話，請聯絡管理者。'
  }

  return fallback
}

async function redirectWhenSessionIsInvalid(error: unknown): Promise<boolean> {
  if (!(error instanceof Error) || (error.message !== 'INVALID_SESSION' && error.message !== 'FORBIDDEN')) {
    return false
  }

  await logout()
  return true
}
</script>

<template>
  <main class="dashboard-page">
    <AppHeader show-logout @logout="logout" />
    <section v-if="isLoading" class="page-state" aria-live="polite">正在載入課程資料...</section>
    <section v-else-if="errorMessage && !dashboard" class="page-state page-state--error" role="alert">
      <p>{{ errorMessage }}</p>
      <button class="button button--secondary" type="button" @click="loadDashboard"><RefreshCw :size="18" aria-hidden="true" />重新載入</button>
    </section>
    <template v-else-if="dashboard">
      <section class="dashboard-summary" aria-labelledby="student-name">
        <div>
          <h1 id="student-name">{{ dashboard.student.name }}</h1>
        </div>
        <div class="lesson-counter" aria-label="剩餘堂數">
          <BookOpenCheck :size="24" aria-hidden="true" />
          <span><strong>{{ dashboard.remainingLessons }}</strong> 堂</span>
        </div>
      </section>
      <p v-if="errorMessage" class="inline-error" role="alert">{{ errorMessage }}</p>
      <section class="content-section" aria-labelledby="available-courses-title">
        <div class="section-heading">
          <div><h2 id="available-courses-title">課程</h2></div>
          <span>{{ availableCourses.length }} 堂</span>
        </div>
        <div v-if="availableCourses.length" class="course-list">
          <CourseCard
            v-for="course in availableCourses"
            :key="course.id"
            :course="course"
            show-registration-action
            :is-registering="registeringCourseId === course.id"
            @register="registerForCourse(course.id)"
          />
        </div>
        <div v-else class="empty-state">沒有可報名的課程。</div>
      </section>
      <section class="content-section" aria-labelledby="registration-history-title">
        <div class="section-heading"><div><h2 id="registration-history-title">紀錄</h2></div></div>
        <div v-if="registrationHistory.length" class="history-list">
          <article v-for="item in registrationHistory" :key="item.registration.id" class="history-row">
            <div>
              <h3>{{ item.course ? formatCourseSchedule(item.course) : `課程 ${item.registration.courseId}` }}</h3>
              <p>{{ new Date(item.registration.createdAt).toLocaleDateString('zh-TW') }}</p>
            </div>
            <StatusBadge :status="item.registration.status" />
          </article>
        </div>
        <div v-else class="empty-state">尚無紀錄。</div>
      </section>
    </template>
  </main>
</template>
