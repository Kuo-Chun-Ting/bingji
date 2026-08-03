<script setup lang="ts">
import type { LoginResult } from '../../shared/types/domain'

import { callAppsScriptAction } from '../utils/apps-script-api'
import { getSession, saveSession } from '../utils/auth-session'
import { createLineAuthorizationUrl } from '../utils/line-login'
import {
  clearPendingLineBinding,
  completePendingLineBinding,
  getPendingLineBinding,
} from '../utils/pending-line-binding'

const config = useRuntimeConfig()
const errorMessage = ref('')
const isRedirecting = ref(false)
const isCompletingRegistration = ref(false)

onMounted(async () => {
  const session = getSession(window.localStorage)
  if (session) {
    clearPendingLineBinding(window.localStorage)
    await navigateTo(session.role === 'teacher' ? '/teacher' : '/student')
    return
  }
  await resumePendingLineBinding()
})

async function resumePendingLineBinding(): Promise<void> {
  const pendingBinding = getPendingLineBinding(window.localStorage)
  if (!pendingBinding) {
    return
  }

  isCompletingRegistration.value = true
  try {
    const session = await completePendingLineBinding(
      pendingBinding,
      payload => callAppsScriptAction<LoginResult>(
        config.public.appsScriptUrl,
        'bindLineAccount',
        {
          bindingToken: payload.bindingToken,
          phone: payload.phone,
        },
      ),
    )
    clearPendingLineBinding(window.localStorage)
    saveSession(session, window.localStorage)
    await navigateTo('/student')
  }
  catch (error) {
    handlePendingBindingError(error)
  }
  finally {
    isCompletingRegistration.value = false
  }
}

function handlePendingBindingError(error: unknown): void {
  if (error instanceof Error && error.message === 'STUDENT_NOT_FOUND') {
    errorMessage.value = '報名資料同步中，請稍後重新整理。'
    return
  }
  clearPendingLineBinding(window.localStorage)
  errorMessage.value = '無法完成登入，請重新使用 LINE 登入。'
}

function startLineLogin(): void {
  clearPendingLineBinding(window.localStorage)
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

</script>

<template>
  <main class="auth-page login-page">
    <section class="login-shell" aria-labelledby="student-login-title">
      <h1 id="student-login-title" class="login-brand">冰記</h1>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="line-login-button" type="button" :disabled="isRedirecting || isCompletingRegistration" @click="startLineLogin">
        <img src="/images/line-login.png" alt="">
        <span>{{ isCompletingRegistration ? '完成登入中...' : isRedirecting ? '登入中...' : 'LINE 登入' }}</span>
        <span aria-hidden="true"></span>
      </button>
    </section>
  </main>
</template>
