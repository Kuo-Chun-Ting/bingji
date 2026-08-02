<script setup lang="ts">
import { getSession } from '../utils/auth-session'
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
  <main class="auth-page login-page">
    <section class="login-shell" aria-labelledby="student-login-title">
      <h1 id="student-login-title" class="login-brand">冰記</h1>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <button class="line-login-button" type="button" :disabled="isRedirecting" @click="startLineLogin">
        <img src="/images/line-login.png" alt="">
        <span>{{ isRedirecting ? '登入中...' : 'LINE 登入' }}</span>
        <span aria-hidden="true"></span>
      </button>
    </section>
  </main>
</template>
