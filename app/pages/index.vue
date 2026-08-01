<script setup lang="ts">
import { LogIn } from '@lucide/vue'

import { getSession, saveSession } from '../utils/auth-session'
import { createLineAuthorizationUrl } from '../utils/line-login'

const config = useRuntimeConfig()
const errorMessage = ref('')
const isRedirecting = ref(false)

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
            {{ isRedirecting ? '前往 LINE...' : '使用 LINE 登入' }}
        </button>
      </section>
    </div>
  </main>
</template>
