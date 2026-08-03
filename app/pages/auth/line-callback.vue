<script setup lang="ts">
import type { LineLoginResult, LoginResult } from '../../../shared/types/domain'
import { callAppsScriptAction } from '../../utils/apps-script-api'
import { saveSession } from '../../utils/auth-session'
import { validateLineCallback } from '../../utils/line-login'
import { savePendingLineBinding } from '../../utils/pending-line-binding'
import { getRegistrationFormRedirectUrl } from '../../utils/registration-form'

const config = useRuntimeConfig()
const route = useRoute()
const bindingToken = ref('')
const phone = ref('')
const errorMessage = ref('')
const isLoading = ref(true)
const isBinding = ref(false)

onMounted(async () => {
  try {
    const state = window.sessionStorage.getItem('line_login_state') ?? ''
    const nonce = window.sessionStorage.getItem('line_login_nonce') ?? ''
    const code = validateLineCallback(route.query, state)
    window.sessionStorage.removeItem('line_login_state')
    window.sessionStorage.removeItem('line_login_nonce')
    const result = await callAppsScriptAction<LineLoginResult>(
      config.public.appsScriptUrl,
      'loginWithLine',
      { code, nonce },
    )
    await handleLineLoginResult(result)
  } catch (error) {
    errorMessage.value = getLoginErrorMessage(error)
  } finally {
    isLoading.value = false
  }
})

async function bindPhone(): Promise<void> {
  if (!phone.value.trim() || !bindingToken.value) {
    errorMessage.value = '請輸入報名時使用的電話。'
    return
  }

  isBinding.value = true
  errorMessage.value = ''
  try {
    const result = await callAppsScriptAction<LoginResult>(
      config.public.appsScriptUrl,
      'bindLineAccount',
      { bindingToken: bindingToken.value, phone: phone.value },
    )
    await completeLogin(result)
  } catch (error) {
    if (redirectUnregisteredStudent(error)) {
      return
    }
    errorMessage.value = getLoginErrorMessage(error)
  } finally {
    isBinding.value = false
  }
}

function redirectUnregisteredStudent(error: unknown): boolean {
  const registrationUrl = getRegistrationFormRedirectUrl(
    error,
    config.public.registrationFormUrl,
    phone.value,
  )
  if (!registrationUrl) {
    return false
  }
  savePendingLineBinding({
    bindingToken: bindingToken.value,
    phone: phone.value,
  }, window.localStorage)
  window.location.assign(registrationUrl)
  return true
}

async function handleLineLoginResult(result: LineLoginResult): Promise<void> {
  if ('bindingToken' in result) {
    bindingToken.value = result.bindingToken
    return
  }
  await completeLogin(result)
}

async function completeLogin(session: LoginResult): Promise<void> {
  saveSession(session, window.localStorage)
  await navigateTo(session.role === 'teacher' ? '/teacher' : '/student')
}

function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '目前無法完成登入，請稍後再試。'
  }
  if (error.message === 'INVALID_LINE_STATE') {
    return 'LINE 登入已失效，請重新登入。'
  }
  if (error.message === 'STUDENT_NOT_FOUND') return '找不到報名資料。'
  if (error.message === 'PHONE_ALREADY_LINKED') {
    return '這個電話已綁定其他 LINE 帳號。'
  }
  return '目前無法完成登入，請稍後再試。'
}
</script>

<template>
  <main class="auth-page login-page">
    <section class="login-shell" aria-label="學員登入">
      <AppMark class="login-app-mark" />
      <p v-if="isLoading" class="login-status" role="status">正在確認身分...</p>
      <form v-else-if="bindingToken" aria-label="確認報名電話" @submit.prevent="bindPhone">
        <div class="form-field">
          <label for="phone">報名電話</label>
          <input id="phone" v-model="phone" type="tel" autocomplete="tel" inputmode="tel">
        </div>
        <p v-if="errorMessage" class="form-error" aria-live="polite">{{ errorMessage }}</p>
        <button class="button button--primary button--full" type="submit" :disabled="isBinding">
          {{ isBinding ? '確認中...' : '確認' }}
        </button>
      </form>
      <div v-else class="login-error">
        <h1 class="login-title">無法登入</h1>
        <p class="form-error" role="alert">{{ errorMessage }}</p>
        <NuxtLink class="button button--primary button--full" to="/">
          重新登入
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
