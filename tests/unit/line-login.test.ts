import { expect, test } from 'vitest'

import {
  clearLineLoginAttempt,
  createLineAuthorizationUrl,
  getLineCallbackAuthorization,
  prepareLineAuthorizationUrl,
  validateLineCallback,
} from '../../app/utils/line-login'

test('test_createLineAuthorizationUrl_when_configuration_is_valid_then_returns_line_authorization_url', () => {
  // Arrange
  const channelId = '2010930267'
  const redirectUri = 'https://bingji-delta.vercel.app/auth/line-callback'

  // Act
  const authorizationUrl = createLineAuthorizationUrl({
    channelId,
    redirectUri,
    state: 'state-value',
    nonce: 'nonce-value',
  })

  // Assert
  expect(authorizationUrl).toBe(
    'https://access.line.me/oauth2/v2.1/authorize'
    + '?response_type=code'
    + '&client_id=2010930267'
    + '&redirect_uri=https%3A%2F%2Fbingji-delta.vercel.app%2Fauth%2Fline-callback'
    + '&state=state-value'
    + '&scope=openid+profile'
    + '&nonce=nonce-value',
  )
})

test('test_prepareLineAuthorizationUrl_when_login_starts_then_saves_security_values_and_returns_url', () => {
  // Arrange
  const storedValues = new Map<string, string>()
  const stub_storage = {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
    removeItem: (key: string) => storedValues.delete(key),
  }
  const values = ['state-value', 'nonce-value']
  const stub_createValue = (): string => values.shift() ?? ''

  // Act
  const authorizationUrl = prepareLineAuthorizationUrl(
    {
      channelId: '2010930267',
      redirectUri: 'https://bingji-delta.vercel.app/auth/line-callback',
    },
    stub_storage,
    stub_createValue,
    1_000,
  )

  // Assert
  expect(JSON.parse(storedValues.get('line_login_attempt') ?? '')).toEqual({
    state: 'state-value',
    nonce: 'nonce-value',
    expiresAt: 601_000,
  })
  expect(authorizationUrl).toContain('state=state-value')
  expect(authorizationUrl).toContain('nonce=nonce-value')
})

test('test_getLineCallbackAuthorization_when_attempt_is_valid_then_returns_code_and_nonce_without_clearing_attempt', () => {
  // Arrange
  const storedValues = new Map<string, string>([[
    'line_login_attempt',
    JSON.stringify({ state: 'state-value', nonce: 'nonce-value', expiresAt: 601_000 }),
  ]])
  const stub_storage = createStorageStub(storedValues)

  // Act
  const result = getLineCallbackAuthorization(
    { code: 'authorization-code', state: 'state-value' },
    stub_storage,
    1_000,
  )

  // Assert
  expect(result).toEqual({ code: 'authorization-code', nonce: 'nonce-value' })
  expect(storedValues.has('line_login_attempt')).toBe(true)
})

test('test_getLineCallbackAuthorization_when_attempt_is_expired_then_clears_attempt_and_throws_invalid_state', () => {
  // Arrange
  const storedValues = new Map<string, string>([[
    'line_login_attempt',
    JSON.stringify({ state: 'state-value', nonce: 'nonce-value', expiresAt: 999 }),
  ]])
  const stub_storage = createStorageStub(storedValues)

  // Act & Assert
  expect(() => getLineCallbackAuthorization(
    { code: 'authorization-code', state: 'state-value' },
    stub_storage,
    1_000,
  )).toThrow('INVALID_LINE_STATE')
  expect(storedValues.has('line_login_attempt')).toBe(false)
})

test('test_getLineCallbackAuthorization_when_state_does_not_match_then_clears_attempt', () => {
  // Arrange
  const storedValues = new Map<string, string>([[
    'line_login_attempt',
    JSON.stringify({ state: 'state-value', nonce: 'nonce-value', expiresAt: 601_000 }),
  ]])
  const stub_storage = createStorageStub(storedValues)

  // Act & Assert
  expect(() => getLineCallbackAuthorization(
    { code: 'authorization-code', state: 'other-state' },
    stub_storage,
    1_000,
  )).toThrow('INVALID_LINE_STATE')
  expect(storedValues.has('line_login_attempt')).toBe(false)
})

test('test_clearLineLoginAttempt_when_attempt_exists_then_removes_attempt', () => {
  // Arrange
  const storedValues = new Map<string, string>([['line_login_attempt', '{}']])
  const stub_storage = createStorageStub(storedValues)

  // Act
  clearLineLoginAttempt(stub_storage)

  // Assert
  expect(storedValues.has('line_login_attempt')).toBe(false)
})

test('test_validateLineCallback_when_state_matches_then_returns_authorization_code', () => {
  // Arrange
  const query = { code: 'authorization-code', state: 'state-value' }

  // Act
  const code = validateLineCallback(query, 'state-value')

  // Assert
  expect(code).toBe('authorization-code')
})

test('test_validateLineCallback_when_state_does_not_match_then_throws_invalid_state', () => {
  // Arrange
  const query = { code: 'authorization-code', state: 'other-state' }

  // Act & Assert
  expect(() => validateLineCallback(query, 'state-value')).toThrow('INVALID_LINE_STATE')
})

function createStorageStub(storedValues: Map<string, string>) {
  return {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => storedValues.set(key, value),
    removeItem: (key: string) => storedValues.delete(key),
  }
}
