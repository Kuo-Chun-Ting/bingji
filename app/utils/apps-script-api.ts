import {
  recordAppsScriptDiagnostic,
  type AppsScriptBackendDiagnostics,
  type AppsScriptRequestDiagnostic,
} from './request-diagnostics'

export interface AppsScriptHealth {
  ok: true
  service: 'ski-registration-api'
  status: 'ready'
}

export interface AppsScriptResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

export type AppsScriptFetcher = (
  url: string,
  options?: RequestInit,
) => Promise<AppsScriptResponse>

export interface AppsScriptCallRuntime {
  now(): number
  record(diagnostic: AppsScriptRequestDiagnostic): void
}

export async function getAppsScriptHealth(
  endpoint: string,
  fetcher: AppsScriptFetcher = fetch,
): Promise<AppsScriptHealth> {
  const normalizedEndpoint = endpoint.trim()
  if (!normalizedEndpoint) {
    throw new Error('Missing Apps Script endpoint')
  }

  const response = await fetcher(normalizedEndpoint, { method: 'GET' })
  if (!response.ok) {
    throw new Error(`Apps Script request failed with status ${response.status}`)
  }

  const payload = await response.json()
  if (!isAppsScriptHealth(payload)) {
    throw new Error('Invalid Apps Script health response')
  }

  return payload
}

export async function callAppsScriptAction<Result>(
  endpoint: string,
  action: string,
  payload: Record<string, unknown> = {},
  fetcher: AppsScriptFetcher = fetch,
  diagnostics: AppsScriptCallRuntime = createBrowserDiagnosticRuntime(),
): Promise<Result> {
  const startedAt = diagnostics.now()
  let response: AppsScriptResponse
  try {
    response = await fetcher(endpoint.trim(), createActionRequest(action, payload))
  }
  catch (error) {
    diagnostics.record(createRequestDiagnostic({
      startedAt,
      completedAt: diagnostics.now(),
      action,
      status: 'network_error',
      errorCode: 'NETWORK_ERROR',
    }))
    throw error
  }

  const responseReceivedAt = diagnostics.now()
  let responsePayload: unknown
  try {
    responsePayload = await response.json()
  }
  catch (error) {
    const completedAt = diagnostics.now()
    diagnostics.record(createRequestDiagnostic({
      startedAt,
      responseReceivedAt,
      completedAt,
      action,
      status: 'invalid_response',
      errorCode: 'INVALID_RESPONSE',
      httpStatus: response.status,
    }))
    throw error
  }

  if (!responsePayload || typeof responsePayload !== 'object') {
    const completedAt = diagnostics.now()
    diagnostics.record(createRequestDiagnostic({
      startedAt,
      responseReceivedAt,
      completedAt,
      action,
      status: 'invalid_response',
      errorCode: 'INVALID_RESPONSE',
      httpStatus: response.status,
    }))
    throw new Error('Invalid Apps Script action response')
  }

  const actionResponse = responsePayload as Record<string, unknown>
  const completedAt = diagnostics.now()
  const backend = parseBackendDiagnostics(actionResponse.diagnostics)
  if (actionResponse.ok !== true || !('result' in actionResponse)) {
    const errorCode = typeof actionResponse.code === 'string'
      ? actionResponse.code
      : 'Apps Script action failed'
    diagnostics.record(createRequestDiagnostic({
      startedAt,
      responseReceivedAt,
      completedAt,
      action,
      status: 'api_error',
      errorCode,
      httpStatus: response.status,
      backend,
    }))
    throw new Error(errorCode)
  }

  diagnostics.record(createRequestDiagnostic({
    startedAt,
    responseReceivedAt,
    completedAt,
    action,
    status: 'success',
    httpStatus: response.status,
    backend,
  }))
  return actionResponse.result as Result
}

interface DiagnosticInput {
  startedAt: number
  responseReceivedAt?: number
  completedAt: number
  action: string
  status: AppsScriptRequestDiagnostic['status']
  errorCode?: string
  httpStatus?: number
  backend?: AppsScriptBackendDiagnostics | null
}

function createActionRequest(action: string, payload: Record<string, unknown>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  }
}

function createRequestDiagnostic(input: DiagnosticInput): AppsScriptRequestDiagnostic {
  return {
    recordedAt: input.startedAt,
    action: input.action,
    status: input.status,
    errorCode: input.errorCode ?? null,
    httpStatus: input.httpStatus ?? null,
    responseWaitMs: input.responseReceivedAt === undefined
      ? null
      : input.responseReceivedAt - input.startedAt,
    parseMs: input.responseReceivedAt === undefined
      ? null
      : input.completedAt - input.responseReceivedAt,
    totalMs: input.completedAt - input.startedAt,
    backend: input.backend ?? null,
  }
}

function parseBackendDiagnostics(value: unknown): AppsScriptBackendDiagnostics | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const diagnostics = value as Record<string, unknown>
  if (typeof diagnostics.requestId !== 'string'
    || typeof diagnostics.action !== 'string'
    || (diagnostics.status !== 'success' && diagnostics.status !== 'error')
    || typeof diagnostics.durationMs !== 'number'
    || !Array.isArray(diagnostics.phases)) {
    return null
  }

  return diagnostics as unknown as AppsScriptBackendDiagnostics
}

function createBrowserDiagnosticRuntime(): AppsScriptCallRuntime {
  return {
    now: () => Date.now(),
    record: recordAppsScriptDiagnostic,
  }
}

function isAppsScriptHealth(value: unknown): value is AppsScriptHealth {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Record<string, unknown>
  return payload.ok === true
    && payload.service === 'ski-registration-api'
    && payload.status === 'ready'
}
