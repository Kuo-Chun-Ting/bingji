<script setup lang="ts">
import type { LoginResult } from '../../shared/types/domain'
import { callAppsScriptAction } from '../utils/apps-script-api'
import { getSession, saveSession } from '../utils/auth-session'

const config = useRuntimeConfig()
const errorMessage = ref('')
const isLoggingIn = ref(false)
const account = ref('')
const password = ref('')

onMounted(async () => {
  const session = getSession(window.localStorage)
  if (session) {
    await navigateTo(session.role === 'teacher' ? '/teacher' : '/student')
  }
})

async function login(): Promise<void> {
  errorMessage.value = ''
  isLoggingIn.value = true
  try {
    const session = await callAppsScriptAction<LoginResult>(
      config.public.appsScriptUrl,
      'loginAsTeacher',
      { username: account.value, password: password.value },
    )
    saveSession(session, window.localStorage)
    await navigateTo('/teacher')
  } catch (error) {
    errorMessage.value = error instanceof Error && error.message === 'INVALID_CREDENTIALS'
      ? '帳號或密碼錯誤。'
      : '目前無法登入，請稍後再試。'
  } finally {
    isLoggingIn.value = false
  }
}
</script>

<template>
  <main class="auth-page login-page">
    <section class="login-shell" aria-labelledby="admin-login-title">
      <h1 id="admin-login-title" class="login-title">教練登入</h1>
      <form class="admin-login-form" @submit.prevent="login">
        <div class="form-field">
          <label for="admin-account">帳號</label>
          <input id="admin-account" v-model="account" type="text" autocomplete="username" required>
        </div>
        <div class="form-field">
          <label for="admin-password">密碼</label>
          <input id="admin-password" v-model="password" type="password" autocomplete="current-password" required>
        </div>
        <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
        <button class="button button--primary button--full" type="submit" :disabled="isLoggingIn">
          {{ isLoggingIn ? '登入中...' : '登入' }}
        </button>
      </form>
      <NuxtLink class="login-link" to="/">
        返回
      </NuxtLink>
    </section>
  </main>
</template>
