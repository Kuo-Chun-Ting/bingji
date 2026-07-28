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
): Promise<Result> {
  const response = await fetcher(endpoint.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  })
  const responsePayload = await response.json()

  if (!responsePayload || typeof responsePayload !== 'object') {
    throw new Error('Invalid Apps Script action response')
  }

  const actionResponse = responsePayload as Record<string, unknown>
  if (actionResponse.ok !== true || !('result' in actionResponse)) {
    throw new Error(typeof actionResponse.code === 'string' ? actionResponse.code : 'Apps Script action failed')
  }

  return actionResponse.result as Result
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
