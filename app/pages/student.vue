<script setup lang="ts">
import { BookOpenCheck, RefreshCw } from '@lucide/vue'
import type { Registration } from '../../shared/types/domain'
import type { StudentDashboard } from '../../server/services/dashboard'
import { formatCourseSchedule } from '../utils/course-presentation'

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

onMounted(() => {
  void loadDashboard()
})

async function loadDashboard(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''
  try {
    dashboard.value = await $fetch<StudentDashboard>('/api/student/dashboard')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '無法載入學員資料，請稍後再試。')
  } finally {
    isLoading.value = false
  }
}

async function registerForCourse(courseId: string): Promise<void> {
  registeringCourseId.value = courseId
  errorMessage.value = ''
  try {
    const response = await $fetch<{ registration: Registration }>(`/api/student/courses/${courseId}/register`, { method: 'POST' })
    if (dashboard.value) {
      dashboard.value = { ...dashboard.value, registrations: [...dashboard.value.registrations, response.registration] }
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '無法完成報名，請稍後再試。')
  } finally {
    registeringCourseId.value = null
  }
}

async function logout(): Promise<void> {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/')
}

function getErrorMessage(error: unknown, fallback: string): string {
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
    <AppHeader role="student" show-logout @logout="logout" />
    <section v-if="isLoading" class="page-state" aria-live="polite">正在載入課程資料...</section>
    <section v-else-if="errorMessage && !dashboard" class="page-state page-state--error" role="alert">
      <p>{{ errorMessage }}</p>
      <button class="button button--secondary" type="button" @click="loadDashboard"><RefreshCw :size="18" aria-hidden="true" />重新載入</button>
    </section>
    <template v-else-if="dashboard">
      <section class="dashboard-summary" aria-labelledby="student-name">
        <div>
          <p class="eyebrow">學員課程</p>
          <h1 id="student-name">{{ dashboard.student.name }}，你好</h1>
          <p>管理你的課程報名與到課紀錄。</p>
        </div>
        <div class="lesson-counter" aria-label="剩餘堂數">
          <BookOpenCheck :size="24" aria-hidden="true" />
          <span><strong>{{ dashboard.remainingLessons }}</strong> 堂可用</span>
        </div>
      </section>
      <p v-if="errorMessage" class="inline-error" role="alert">{{ errorMessage }}</p>
      <section class="content-section" aria-labelledby="available-courses-title">
        <div class="section-heading">
          <div><p class="eyebrow">課程報名</p><h2 id="available-courses-title">可報名課程</h2></div>
          <span>{{ availableCourses.length }} 堂開放中</span>
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
        <div v-else class="empty-state">目前沒有可報名的開放課程。</div>
      </section>
      <section class="content-section" aria-labelledby="registration-history-title">
        <div class="section-heading"><div><p class="eyebrow">我的紀錄</p><h2 id="registration-history-title">報名歷史</h2></div></div>
        <div v-if="registrationHistory.length" class="history-list">
          <article v-for="item in registrationHistory" :key="item.registration.id" class="history-row">
            <div>
              <h3>{{ item.course ? formatCourseSchedule(item.course) : `課程 ${item.registration.courseId}` }}</h3>
              <p>報名時間 {{ new Date(item.registration.createdAt).toLocaleDateString('zh-TW') }}</p>
            </div>
            <StatusBadge :status="item.registration.status" />
          </article>
        </div>
        <div v-else class="empty-state">尚未有課程報名紀錄。</div>
      </section>
    </template>
  </main>
</template>
