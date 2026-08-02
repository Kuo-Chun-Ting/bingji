<script setup lang="ts">
import { KeyRound, LogIn } from '@lucide/vue'

import type { LoginResult } from '../../shared/types/domain'
import { callAppsScriptAction } from '../utils/apps-script-api'
import { getSession, saveSession } from '../utils/auth-session'
import { createLineAuthorizationUrl } from '../utils/line-login'

const config = useRuntimeConfig()
const errorMessage = ref('')
const isRedirecting = ref(false)
const isTeacherLoggingIn = ref(false)
const teacherUsername = ref('')
const teacherPassword = ref('')

onMounted(async () => {
  const session = getSession(window.localStorage)
  if (session) {
    await navigateTo(session.role === 'teacher' ? '/teacher' : '/student')
  }
})

function startLineLogin(): void {
  errorMessage.value = ''
  if (!config.public.lineChannelId || !config.public.lineRedirectUri) {
    errorMessage.value = '系統尚未完成 LINE 登入設定。'
    return
  }

  const state = crypto.randomUUID()
  const nonce = crypto.randomUUID()
  window.sessionStorage.setItem('line_login_state', state)
  window.sessionStorage.setItem('line_login_nonce', nonce)
  isRedirecting.value = true
  window.location.assign(createLineAuthorizationUrl({
    channelId: config.public.lineChannelId,
    redirectUri: config.public.lineRedirectUri,
    state,
    nonce,
  }))
}

async function loginAsTeacher(): Promise<void> {
  errorMessage.value = ''
  isTeacherLoggingIn.value = true
  try {
    const session = await callAppsScriptAction<LoginResult>(
      config.public.appsScriptUrl,
      'loginAsTeacher',
      { username: teacherUsername.value, password: teacherPassword.value },
    )
    saveSession(session, window.localStorage)
    await navigateTo('/teacher')
  } catch (error) {
    errorMessage.value = error instanceof Error && error.message === 'INVALID_CREDENTIALS'
      ? '帳號或密碼錯誤。'
      : '目前無法登入，請稍後再試。'
  } finally {
    isTeacherLoggingIn.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <AppHeader />
    <div class="auth-content">
      <div class="auth-intro">
        <h1>冰記</h1>
      </div>
      <section class="auth-panel login-panel" aria-labelledby="login-title">
        <div class="auth-panel__heading">
          <div>
            <h2 id="login-title">登入</h2>
          </div>
        </div>
        <p class="form-error" aria-live="polite">{{ errorMessage }}</p>
        <button class="button button--primary button--full" type="button" :disabled="isRedirecting" @click="startLineLogin">
          <LogIn :size="18" aria-hidden="true" />
          {{ isRedirecting ? '前往 LINE...' : '學員使用 LINE 登入' }}
        </button>
        <div class="login-divider"><span>教練</span></div>
        <form @submit.prevent="loginAsTeacher">
          <div class="form-field">
            <label for="teacher-username">帳號</label>
            <input id="teacher-username" v-model="teacherUsername" type="text" autocomplete="username" required>
          </div>
          <div class="form-field">
            <label for="teacher-password">密碼</label>
            <input id="teacher-password" v-model="teacherPassword" type="password" autocomplete="current-password" required>
          </div>
          <button class="button button--secondary button--full" type="submit" :disabled="isTeacherLoggingIn">
            <KeyRound :size="18" aria-hidden="true" />
            {{ isTeacherLoggingIn ? '登入中...' : '教練登入' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
