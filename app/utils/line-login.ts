export interface LineAuthorizationRequest {
  channelId: string
  redirectUri: string
  state: string
  nonce: string
}

export interface LineAuthorizationPreparation {
  channelId: string
  redirectUri: string
}

export interface LineLoginStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type CreateLineLoginValue = () => string

type LineCallbackQuery = Record<string, string | Array<string | null> | null | undefined>

const authorizationEndpoint = 'https://access.line.me/oauth2/v2.1/authorize'
const lineLoginAttemptKey = 'line_login_attempt'
const lineLoginAttemptLifetimeMs = 10 * 60 * 1000

interface LineLoginAttempt {
  state: string
  nonce: string
  expiresAt: number
}

export interface LineCallbackAuthorization {
  code: string
  nonce: string
}

export function createLineAuthorizationUrl(request: LineAuthorizationRequest): string {
  const parameters = new URLSearchParams({
    response_type: 'code',
    client_id: request.channelId,
    redirect_uri: request.redirectUri,
    state: request.state,
    scope: 'openid profile',
    nonce: request.nonce,
  })
  return `${authorizationEndpoint}?${parameters.toString()}`
}

export function prepareLineAuthorizationUrl(
  request: LineAuthorizationPreparation,
  storage: LineLoginStorage,
  createValue: CreateLineLoginValue,
  now: number = Date.now(),
): string {
  const state = createValue()
  const nonce = createValue()
  saveLineLoginAttempt({
    state,
    nonce,
    expiresAt: now + lineLoginAttemptLifetimeMs,
  }, storage)
  return createLineAuthorizationUrl({ ...request, state, nonce })
}

export function getLineCallbackAuthorization(
  query: LineCallbackQuery,
  storage: LineLoginStorage,
  now: number = Date.now(),
): LineCallbackAuthorization {
  const attempt = getLineLoginAttempt(storage, now)
  if (!attempt) {
    throw new Error('INVALID_LINE_STATE')
  }

  try {
    const code = validateLineCallback(query, attempt.state)
    return { code, nonce: attempt.nonce }
  }
  catch (error) {
    clearLineLoginAttempt(storage)
    throw error
  }
}

export function clearLineLoginAttempt(storage: LineLoginStorage): void {
  storage.removeItem(lineLoginAttemptKey)
}

export function validateLineCallback(query: LineCallbackQuery, expectedState: string): string {
  const code = readQueryValue(query.code)
  const state = readQueryValue(query.state)
  if (!code || !state || state !== expectedState) {
    throw new Error('INVALID_LINE_STATE')
  }
  return code
}

function readQueryValue(value: string | Array<string | null> | null | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function saveLineLoginAttempt(attempt: LineLoginAttempt, storage: LineLoginStorage): void {
  storage.setItem(lineLoginAttemptKey, JSON.stringify(attempt))
}

function getLineLoginAttempt(storage: LineLoginStorage, now: number): LineLoginAttempt | null {
  try {
    const attempt = JSON.parse(storage.getItem(lineLoginAttemptKey) ?? '')
    if (isLineLoginAttempt(attempt) && attempt.expiresAt > now) {
      return attempt
    }
  }
  catch {
    // Invalid attempts are removed below.
  }

  clearLineLoginAttempt(storage)
  return null
}

function isLineLoginAttempt(value: unknown): value is LineLoginAttempt {
  if (!value || typeof value !== 'object') {
    return false
  }
  const attempt = value as Record<string, unknown>
  return typeof attempt.state === 'string'
    && attempt.state.length > 0
    && typeof attempt.nonce === 'string'
    && attempt.nonce.length > 0
    && typeof attempt.expiresAt === 'number'
}
