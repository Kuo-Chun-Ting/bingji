<script setup lang="ts">
import { KeyRound, LogIn } from '@lucide/vue'

import type { LoginResult } from '../../shared/types/domain'
import { callAppsScriptAction } from '../utils/apps-script-api'
import { getSession, saveSession } from '../utils/auth-session'

const config = useRuntimeConfig()
const phone = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

onMounted(async () => {
  const session = getSession(window.localStorage)
  if (session) {
    await navigateTo(session.role === 'teacher' ? '/teacher' : '/student')
  }
})

async function login(): Promise<void> {
  errorMessage.value = ''
  if (!phone.value.trim() || !password.value) {
    errorMessage.value = '請輸入電話與密碼。'
    return
  }

  isSubmitting.value = true
  try {
    const session = await callAppsScriptAction<LoginResult>(
      config.public.appsScriptUrl,
      'login',
      { phone: phone.value, password: password.value },
    )
    saveSession(session, window.localStorage)
    await navigateTo(session.role === 'teacher' ? '/teacher' : '/student')
  } catch (error) {
    errorMessage.value = getLoginErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
    return '電話或密碼錯誤。'
  }

  if (error instanceof Error && error.message === 'MISSING_CONFIGURATION') {
    return '系統尚未完成設定。'
  }

  if (error instanceof Error && error.message === 'DUPLICATE_PHONE') {
    return 'Google Sheet 有重複電話，請聯絡管理者。'
  }

  return '目前無法登入，請稍後再試。'
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
      <section class="auth-panel login-panel" aria-labelledby="login-title">
        <div class="auth-panel__heading">
          <span class="panel-icon panel-icon--blue" aria-hidden="true"><KeyRound :size="20" /></span>
          <div>
            <h2 id="login-title">登入</h2>
            <p>使用電話與密碼登入</p>
          </div>
        </div>
        <form @submit.prevent="login">
          <div class="form-field">
            <label for="phone">電話</label>
            <input id="phone" v-model="phone" type="tel" autocomplete="username" inputmode="tel">
          </div>
          <div class="form-field">
            <label for="password">密碼</label>
            <input id="password" v-model="password" type="password" autocomplete="current-password">
          </div>
          <p class="form-error" aria-live="polite">{{ errorMessage }}</p>
          <button class="button button--primary button--full" type="submit" :disabled="isSubmitting">
            <LogIn :size="18" aria-hidden="true" />
            {{ isSubmitting ? '登入中...' : '登入' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
