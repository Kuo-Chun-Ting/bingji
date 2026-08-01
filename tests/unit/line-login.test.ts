import { expect, test } from 'vitest'

import {
  createLineAuthorizationUrl,
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
