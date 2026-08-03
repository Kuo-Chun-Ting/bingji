<script setup lang="ts">
import type { LoginResult } from '../../shared/types/domain'

import { callAppsScriptAction } from '../utils/apps-script-api'
import { getSession, saveSession } from '../utils/auth-session'
import { prepareLineAuthorizationUrl } from '../utils/line-login'
import {
  clearPendingLineBinding,
  completePendingLineBinding,
  getPendingLineBinding,
} from '../utils/pending-line-binding'

const config = useRuntimeConfig()
const errorMessage = ref('')
const lineLoginUrl = ref('')
const isRedirecting = ref(false)
const isCompletingRegistration = ref(false)

onMounted(async () => {
  const session = getSession(window.localStorage)
  if (session) {
    clearPendingLineBinding(window.localStorage)
    await navigateTo(session.role === 'teacher' ? '/teacher' : '/student')
    return
  }
  prepareLineLogin()
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

function prepareLineLogin(): void {
  if (!config.public.lineChannelId || !config.public.lineRedirectUri) {
    errorMessage.value = '系統尚未完成 LINE 登入設定。'
    return
  }

  lineLoginUrl.value = prepareLineAuthorizationUrl(
    {
      channelId: config.public.lineChannelId,
      redirectUri: config.public.lineRedirectUri,
    },
    window.sessionStorage,
    () => crypto.randomUUID(),
  )
}

function handleLineLoginClick(event: MouseEvent): void {
  if (!lineLoginUrl.value || isRedirecting.value || isCompletingRegistration.value) {
    event.preventDefault()
    return
  }

  clearPendingLineBinding(window.localStorage)
  errorMessage.value = ''
  isRedirecting.value = true
}

</script>

<template>
  <main class="auth-page login-page">
    <section class="login-shell" aria-labelledby="student-login-title">
      <h1 id="student-login-title" class="login-brand">冰記</h1>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <a
        class="line-login-button"
        :href="lineLoginUrl || undefined"
        :aria-disabled="isRedirecting || isCompletingRegistration || !lineLoginUrl"
        @click="handleLineLoginClick"
      >
        <img src="/images/line-login.png" alt="">
        <span>{{ isCompletingRegistration ? '完成登入中...' : isRedirecting ? '登入中...' : 'LINE 登入' }}</span>
      </a>
    </section>
  </main>
</template>
