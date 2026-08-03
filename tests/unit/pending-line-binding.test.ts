import { expect, test } from 'vitest'

import type { LoginResult } from '../../shared/types/domain'
import type { AuthSessionStorage } from '../../app/utils/auth-session'
import {
  clearPendingLineBinding,
  completePendingLineBinding,
  getPendingLineBinding,
  savePendingLineBinding,
} from '../../app/utils/pending-line-binding'

test('test_getPendingLineBinding_when_binding_is_saved_then_returns_binding', () => {
  // Arrange
  const stub_storage = createStorageStub()
  const pendingBinding = { bindingToken: 'binding-token', phone: '0912345678' }
  savePendingLineBinding(pendingBinding, stub_storage, 1_000)

  // Act
  const result = getPendingLineBinding(stub_storage, 1_000)

  // Assert
  expect(result).toEqual(pendingBinding)
})

test('test_getPendingLineBinding_when_binding_is_expired_then_clears_binding', () => {
  // Arrange
  const stub_storage = createStorageStub(JSON.stringify({
    bindingToken: 'binding-token',
    phone: '0912345678',
    expiresAt: 999,
  }))

  // Act
  const result = getPendingLineBinding(stub_storage, 1_000)

  // Assert
  expect(result).toBeNull()
  expect(stub_storage.getItem('pending_line_binding')).toBeNull()
})

test('test_getPendingLineBinding_when_saved_value_is_invalid_then_clears_binding', () => {
  // Arrange
  const stub_storage = createStorageStub('{"bindingToken":42}')

  // Act
  const result = getPendingLineBinding(stub_storage)

  // Assert
  expect(result).toBeNull()
  expect(stub_storage.getItem('pending_line_binding')).toBeNull()
})

test('test_clearPendingLineBinding_when_binding_exists_then_removes_binding', () => {
  // Arrange
  const stub_storage = createStorageStub()
  savePendingLineBinding({ bindingToken: 'binding-token', phone: '0912345678' }, stub_storage)

  // Act
  clearPendingLineBinding(stub_storage)

  // Assert
  expect(stub_storage.getItem('pending_line_binding')).toBeNull()
})

test('test_completePendingLineBinding_when_student_appears_after_retries_then_returns_session', async () => {
  // Arrange
  const pendingBinding = { bindingToken: 'binding-token', phone: '0912345678' }
  const session: LoginResult = { token: 'session-token', role: 'student' }
  let attempts = 0
  let waits = 0
  const stub_bindLineAccount = async (): Promise<LoginResult> => {
    attempts += 1
    if (attempts < 3) {
      throw new Error('STUDENT_NOT_FOUND')
    }
    return session
  }
  const stub_wait = async (): Promise<void> => {
    waits += 1
  }

  // Act
  const result = await completePendingLineBinding(
    pendingBinding,
    stub_bindLineAccount,
    stub_wait,
  )

  // Assert
  expect(result).toEqual(session)
  expect(attempts).toBe(3)
  expect(waits).toBe(2)
})

test('test_completePendingLineBinding_when_error_is_not_retryable_then_throws_immediately', async () => {
  // Arrange
  const pendingBinding = { bindingToken: 'binding-token', phone: '0912345678' }
  let waits = 0
  const stub_bindLineAccount = async (): Promise<LoginResult> => {
    throw new Error('INVALID_BINDING_TOKEN')
  }
  const stub_wait = async (): Promise<void> => {
    waits += 1
  }

  // Act & Assert
  await expect(completePendingLineBinding(
    pendingBinding,
    stub_bindLineAccount,
    stub_wait,
  )).rejects.toThrow('INVALID_BINDING_TOKEN')
  expect(waits).toBe(0)
})

function createStorageStub(initialValue: string | null = null): AuthSessionStorage {
  let value = initialValue
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue
    },
    removeItem: () => {
      value = null
    },
  }
}
