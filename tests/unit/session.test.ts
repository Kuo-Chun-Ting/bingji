import { expect, test } from 'vitest'

import { createSignedSession, verifySignedSession } from '../../server/utils/session'

const sessionSecret = 'test-session-secret'
const expiresAt = Date.parse('2026-08-04T00:00:00.000Z')

test('test_verifySignedSession_when_token_is_valid_then_returns_session_payload', () => {
  // Arrange
  const token = createSignedSession({
    role: 'student',
    phone: '0912345678',
    expiresAt,
  }, sessionSecret)

  // Act
  const session = verifySignedSession(token, sessionSecret, expiresAt - 1)

  // Assert
  expect(session).toEqual({
    role: 'student',
    phone: '0912345678',
    expiresAt,
  })
})

test('test_verifySignedSession_when_token_signature_is_tampered_then_returns_null', () => {
  // Arrange
  const token = createSignedSession({ role: 'teacher', expiresAt }, sessionSecret)
  const tamperedToken = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`

  // Act
  const session = verifySignedSession(tamperedToken, sessionSecret, expiresAt - 1)

  // Assert
  expect(session).toBeNull()
})

test('test_verifySignedSession_when_session_is_expired_then_returns_null', () => {
  // Arrange
  const token = createSignedSession({ role: 'teacher', expiresAt }, sessionSecret)

  // Act
  const session = verifySignedSession(token, sessionSecret, expiresAt)

  // Assert
  expect(session).toBeNull()
})
