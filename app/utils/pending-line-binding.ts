import type { LoginResult } from '../../shared/types/domain'
import type { AuthSessionStorage } from './auth-session'

export interface PendingLineBinding {
  bindingToken: string
  phone: string
}

export type BindPendingLineAccount = (
  pendingBinding: PendingLineBinding,
) => Promise<LoginResult>

export type PendingBindingWaiter = () => Promise<void>

const pendingBindingKey = 'pending_line_binding'
const maxBindingAttempts = 5
const bindingRetryDelayMs = 1000

export function getPendingLineBinding(
  storage: AuthSessionStorage,
): PendingLineBinding | null {
  try {
    const pendingBinding = JSON.parse(storage.getItem(pendingBindingKey) ?? '')
    if (isPendingLineBinding(pendingBinding)) {
      return pendingBinding
    }
  }
  catch {
    // Invalid persisted bindings are removed below.
  }

  clearPendingLineBinding(storage)
  return null
}

export function savePendingLineBinding(
  pendingBinding: PendingLineBinding,
  storage: AuthSessionStorage,
): void {
  storage.setItem(pendingBindingKey, JSON.stringify(pendingBinding))
}

export function clearPendingLineBinding(storage: AuthSessionStorage): void {
  storage.removeItem(pendingBindingKey)
}

export async function completePendingLineBinding(
  pendingBinding: PendingLineBinding,
  bindLineAccount: BindPendingLineAccount,
  wait: PendingBindingWaiter = waitBeforeRetry,
): Promise<LoginResult> {
  for (let attempt = 1; attempt <= maxBindingAttempts; attempt += 1) {
    try {
      return await bindLineAccount(pendingBinding)
    }
    catch (error) {
      if (!shouldRetryBinding(error, attempt)) {
        throw error
      }
      await wait()
    }
  }
  throw new Error('STUDENT_NOT_FOUND')
}

function isPendingLineBinding(value: unknown): value is PendingLineBinding {
  if (!value || typeof value !== 'object') {
    return false
  }
  const pendingBinding = value as Record<string, unknown>
  return typeof pendingBinding.bindingToken === 'string'
    && pendingBinding.bindingToken.length > 0
    && typeof pendingBinding.phone === 'string'
    && pendingBinding.phone.trim().length > 0
}

function shouldRetryBinding(error: unknown, attempt: number): boolean {
  return error instanceof Error
    && error.message === 'STUDENT_NOT_FOUND'
    && attempt < maxBindingAttempts
}

function waitBeforeRetry(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, bindingRetryDelayMs))
}
