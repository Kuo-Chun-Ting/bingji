import { expect, test } from 'vitest'

import {
  callAppsScriptAction,
  getAppsScriptHealth,
  type AppsScriptCallRuntime,
  type AppsScriptFetcher,
} from '../../app/utils/apps-script-api'
import type { AppsScriptRequestDiagnostic } from '../../app/utils/request-diagnostics'

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

test('test_callAppsScriptAction_when_request_succeeds_then_records_client_and_backend_timings', async () => {
  // Arrange
  const diagnostics: AppsScriptRequestDiagnostic[] = []
  const runtime = createDiagnosticRuntime([100, 1300, 1350], diagnostics)
  const stub_fetcher: AppsScriptFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      result: { courses: [] },
      diagnostics: {
        requestId: 'request-id',
        action: 'getStudentDashboard',
        status: 'success',
        errorCode: null,
        durationMs: 420,
        phases: [{ phase: 'loadCourses', durationMs: 180 }],
      },
    }),
  })

  // Act
  await callAppsScriptAction(
    'https://example.test/exec',
    'getStudentDashboard',
    { token: 'signed-token' },
    stub_fetcher,
    runtime,
  )

  // Assert
  expect(diagnostics).toEqual([{
    recordedAt: 100,
    action: 'getStudentDashboard',
    status: 'success',
    errorCode: null,
    httpStatus: 200,
    responseWaitMs: 1200,
    parseMs: 50,
    totalMs: 1250,
    backend: {
      requestId: 'request-id',
      action: 'getStudentDashboard',
      status: 'success',
      errorCode: null,
      durationMs: 420,
      phases: [{ phase: 'loadCourses', durationMs: 180 }],
    },
  }])
})

test('test_callAppsScriptAction_when_fetch_fails_then_records_network_error', async () => {
  // Arrange
  const diagnostics: AppsScriptRequestDiagnostic[] = []
  const runtime = createDiagnosticRuntime([200, 1700], diagnostics)
  const stub_fetcher: AppsScriptFetcher = async () => {
    throw new Error('Failed to fetch')
  }

  // Act & Assert
  await expect(callAppsScriptAction(
    'https://example.test/exec',
    'getStudentDashboard',
    {},
    stub_fetcher,
    runtime,
  )).rejects.toThrow('Failed to fetch')
  expect(diagnostics).toEqual([{
    recordedAt: 200,
    action: 'getStudentDashboard',
    status: 'network_error',
    errorCode: 'NETWORK_ERROR',
    httpStatus: null,
    responseWaitMs: null,
    parseMs: null,
    totalMs: 1500,
    backend: null,
  }])
})

test('test_callAppsScriptAction_when_backend_rejects_request_then_records_api_error', async () => {
  // Arrange
  const diagnostics: AppsScriptRequestDiagnostic[] = []
  const runtime = createDiagnosticRuntime([300, 800, 820], diagnostics)
  const stub_fetcher: AppsScriptFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: false,
      code: 'INVALID_SESSION',
      diagnostics: {
        requestId: 'request-id',
        action: 'getStudentDashboard',
        status: 'error',
        errorCode: 'INVALID_SESSION',
        durationMs: 210,
        phases: [],
      },
    }),
  })

  // Act & Assert
  await expect(callAppsScriptAction(
    'https://example.test/exec',
    'getStudentDashboard',
    {},
    stub_fetcher,
    runtime,
  )).rejects.toThrow('INVALID_SESSION')
  expect(diagnostics).toMatchObject([{
    action: 'getStudentDashboard',
    status: 'api_error',
    errorCode: 'INVALID_SESSION',
    responseWaitMs: 500,
    parseMs: 20,
    totalMs: 520,
    backend: {
      requestId: 'request-id',
      durationMs: 210,
    },
  }])
})

function createDiagnosticRuntime(
  times: number[],
  diagnostics: AppsScriptRequestDiagnostic[],
): AppsScriptCallRuntime {
  return {
    now: () => {
      const time = times.shift()
      if (time === undefined) {
        throw new Error('Missing test time')
      }
      return time
    },
    record: diagnostic => diagnostics.push(diagnostic),
  }
}
