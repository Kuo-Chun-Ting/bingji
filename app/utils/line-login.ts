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
  setItem(key: string, value: string): void
}

export type CreateLineLoginValue = () => string

type LineCallbackQuery = Record<string, string | Array<string | null> | null | undefined>

const authorizationEndpoint = 'https://access.line.me/oauth2/v2.1/authorize'

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
): string {
  const state = createValue()
  const nonce = createValue()
  storage.setItem('line_login_state', state)
  storage.setItem('line_login_nonce', nonce)
  return createLineAuthorizationUrl({ ...request, state, nonce })
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
