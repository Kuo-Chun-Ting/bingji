export interface LineAuthorizationRequest {
  channelId: string
  redirectUri: string
  state: string
  nonce: string
}

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
