import { expect, test } from 'vitest'

import {
  callAppsScriptAction,
  getAppsScriptHealth,
  type AppsScriptFetcher,
} from '../../app/utils/apps-script-api'

test('test_getAppsScriptHealth_when_endpoint_returns_ready_payload_then_returns_health', async () => {
  // Arrange
  const stub_fetcher: AppsScriptFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      service: 'ski-registration-api',
      status: 'ready',
    }),
  })

  // Act
  const health = await getAppsScriptHealth('https://example.test/exec', stub_fetcher)

  // Assert
  expect(health).toEqual({
    ok: true,
    service: 'ski-registration-api',
    status: 'ready',
  })
})

test('test_getAppsScriptHealth_when_endpoint_is_missing_then_throws_configuration_error', async () => {
  // Arrange
  const stub_fetcher: AppsScriptFetcher = async () => {
    throw new Error('Fetcher should not be called')
  }

  // Act & Assert
  await expect(getAppsScriptHealth('', stub_fetcher))
    .rejects.toThrow('Missing Apps Script endpoint')
})

test('test_getAppsScriptHealth_when_endpoint_returns_http_error_then_throws_request_error', async () => {
  // Arrange
  const stub_fetcher: AppsScriptFetcher = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ ok: false }),
  })

  // Act & Assert
  await expect(getAppsScriptHealth('https://example.test/exec', stub_fetcher))
    .rejects.toThrow('Apps Script request failed with status 503')
})

test('test_getAppsScriptHealth_when_endpoint_returns_invalid_payload_then_throws_response_error', async () => {
  // Arrange
  const stub_fetcher: AppsScriptFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true }),
  })

  // Act & Assert
  await expect(getAppsScriptHealth('https://example.test/exec', stub_fetcher))
    .rejects.toThrow('Invalid Apps Script health response')
})

test('test_callAppsScriptAction_when_endpoint_returns_success_then_returns_result', async () => {
  // Arrange
  let receivedRequest: { url: string, options?: RequestInit } | null = null
  const mock_fetcher: AppsScriptFetcher = async (url, options) => {
    receivedRequest = { url, options }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: { registrationId: 'registration-1' },
      }),
    }
  }

  // Act
  const result = await callAppsScriptAction<{ registrationId: string }>(
    'https://example.test/exec',
    'registerCourse',
    { token: 'signed-token', courseId: 'course-1' },
    mock_fetcher,
  )

  // Assert
  expect(result).toEqual({ registrationId: 'registration-1' })
  expect(receivedRequest).toEqual({
    url: 'https://example.test/exec',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'registerCourse',
        payload: { token: 'signed-token', courseId: 'course-1' },
      }),
    },
  })
})

test('test_callAppsScriptAction_when_endpoint_returns_error_then_throws_error_code', async () => {
  // Arrange
  const stub_fetcher: AppsScriptFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: false,
      code: 'INVALID_SESSION',
    }),
  })

  // Act & Assert
  await expect(callAppsScriptAction(
    'https://example.test/exec',
    'getStudentDashboard',
    { token: 'expired-token' },
    stub_fetcher,
  )).rejects.toThrow('INVALID_SESSION')
})
