import { expect, test } from 'vitest'

import {
  clearSession,
  getSession,
  saveSession,
  type AuthSessionStorage,
} from '../../app/utils/auth-session'

test('test_getSession_when_saved_session_is_valid_then_returns_session', () => {
  // Arrange
  const stub_storage = createStorageStub()
  saveSession({ token: 'signed-token', role: 'student' }, stub_storage)

  // Act
  const session = getSession(stub_storage)

  // Assert
  expect(session).toEqual({ token: 'signed-token', role: 'student' })
})

test('test_getSession_when_saved_value_is_invalid_then_returns_null', () => {
  // Arrange
  const stub_storage = createStorageStub('{"token":42}')

  // Act
  const session = getSession(stub_storage)

  // Assert
  expect(session).toBeNull()
  expect(stub_storage.getItem('ski_session')).toBeNull()
})

test('test_clearSession_when_session_exists_then_removes_session', () => {
  // Arrange
  const stub_storage = createStorageStub(JSON.stringify({
    token: 'signed-token',
    role: 'teacher',
  }))

  // Act
  clearSession(stub_storage)

  // Assert
  expect(stub_storage.getItem('ski_session')).toBeNull()
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
