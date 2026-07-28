<script setup lang="ts">
import { ArrowRight, KeyRound, Phone } from '@lucide/vue'
import type { SignedSession } from '../../server/utils/session'

const studentPhone = ref('')
const teacherPassword = ref('')
const studentError = ref('')
const teacherError = ref('')
const isStudentSubmitting = ref(false)
const isTeacherSubmitting = ref(false)
const isCheckingSession = ref(true)

onMounted(() => {
  void redirectExistingSession()
})

async function redirectExistingSession(): Promise<void> {
  try {
    const response = await $fetch<{ session: SignedSession | null }>('/api/session')
    if (response.session?.role === 'student') {
      await navigateTo('/student')
    }
    if (response.session?.role === 'teacher') {
      await navigateTo('/teacher')
    }
  } finally {
    isCheckingSession.value = false
  }
}

async function submitStudentLogin(): Promise<void> {
  studentError.value = ''
  if (!studentPhone.value.trim()) {
    studentError.value = '請輸入登入電話。'
    return
  }

  isStudentSubmitting.value = true
  try {
    await $fetch('/api/auth/student', { method: 'POST', body: { phone: studentPhone.value } })
    await navigateTo('/student')
  } catch (error) {
    studentError.value = getErrorMessage(error, '無法登入，請確認電話後再試一次。')
  } finally {
    isStudentSubmitting.value = false
  }
}

async function submitTeacherLogin(): Promise<void> {
  teacherError.value = ''
  if (!teacherPassword.value) {
    teacherError.value = '請輸入管理密碼。'
    return
  }

  isTeacherSubmitting.value = true
  try {
    await $fetch('/api/auth/teacher', { method: 'POST', body: { password: teacherPassword.value } })
    await navigateTo('/teacher')
  } catch (error) {
    teacherError.value = getErrorMessage(error, '無法登入，請確認密碼後再試一次。')
  } finally {
    isTeacherSubmitting.value = false
  }
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
  <main class="auth-page">
    <AppHeader />
    <section v-if="isCheckingSession" class="page-state" aria-live="polite">
      正在確認登入狀態...
    </section>
    <div v-else class="auth-content">
      <div class="auth-intro">
        <p class="eyebrow">SKI LESSONS</p>
        <h1>雪課簿</h1>
        <p>查看課程、管理報名與確認到課紀錄。</p>
      </div>
      <div class="auth-forms">
        <section class="auth-panel" aria-labelledby="student-login-title">
          <div class="auth-panel__heading">
            <span class="panel-icon panel-icon--blue" aria-hidden="true"><Phone :size="20" /></span>
            <div>
              <h2 id="student-login-title">學員登入</h2>
              <p>使用報名資料中的電話登入。</p>
            </div>
          </div>
          <form @submit.prevent="submitStudentLogin">
            <label for="student-phone">電話</label>
            <input id="student-phone" v-model="studentPhone" type="tel" autocomplete="tel" inputmode="tel" :aria-describedby="studentError ? 'student-login-error' : undefined" />
            <p v-if="studentError" id="student-login-error" class="form-error" role="alert">{{ studentError }}</p>
            <button class="button button--primary button--full" type="submit" :disabled="isStudentSubmitting">
              {{ isStudentSubmitting ? '登入中...' : '進入學員專區' }}
              <ArrowRight v-if="!isStudentSubmitting" :size="18" aria-hidden="true" />
            </button>
          </form>
        </section>
        <section class="auth-panel" aria-labelledby="teacher-login-title">
          <div class="auth-panel__heading">
            <span class="panel-icon panel-icon--green" aria-hidden="true"><KeyRound :size="20" /></span>
            <div>
              <h2 id="teacher-login-title">教練登入</h2>
              <p>使用管理密碼進入課程名單。</p>
            </div>
          </div>
          <form @submit.prevent="submitTeacherLogin">
            <label for="teacher-password">管理密碼</label>
            <input id="teacher-password" v-model="teacherPassword" type="password" autocomplete="current-password" :aria-describedby="teacherError ? 'teacher-login-error' : undefined" />
            <p v-if="teacherError" id="teacher-login-error" class="form-error" role="alert">{{ teacherError }}</p>
            <button class="button button--secondary button--full" type="submit" :disabled="isTeacherSubmitting">
              {{ isTeacherSubmitting ? '登入中...' : '進入教練管理' }}
              <ArrowRight v-if="!isTeacherSubmitting" :size="18" aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </div>
  </main>
</template>
