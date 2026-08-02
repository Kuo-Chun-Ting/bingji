var LineAuthFailure = Object.freeze({
  TOKEN_EXCHANGE: 'LINE_TOKEN_EXCHANGE_FAILED',
  ID_TOKEN_VERIFICATION: 'LINE_ID_TOKEN_VERIFICATION_FAILED',
})

function exchangeLineAuthorizationCode(code, nonce, configuration, fetcher) {
  var tokenResponse = requestLineJson(
    'https://api.line.me/oauth2/v2.1/token',
    {
      method: 'post',
      payload: {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: configuration.redirectUri,
        client_id: configuration.channelId,
        client_secret: configuration.channelSecret,
      },
      muteHttpExceptions: true,
    },
    fetcher,
    LineAuthFailure.TOKEN_EXCHANGE,
  )
  if (!tokenResponse.id_token) {
    throw createLineAuthError(LineAuthFailure.TOKEN_EXCHANGE, 'MISSING_ID_TOKEN')
  }

  var identity = requestLineJson(
    'https://api.line.me/oauth2/v2.1/verify',
    {
      method: 'post',
      payload: {
        id_token: tokenResponse.id_token,
        client_id: configuration.channelId,
        nonce: nonce,
      },
      muteHttpExceptions: true,
    },
    fetcher,
    LineAuthFailure.ID_TOKEN_VERIFICATION,
  )
  if (!identity.sub) {
    throw createLineAuthError(LineAuthFailure.ID_TOKEN_VERIFICATION, 'MISSING_SUB')
  }
  return String(identity.sub)
}

function resolveLineSession(lineUserId, accounts) {
  var account = accounts.find(function (candidate) {
    return candidate.lineUserId === lineUserId
  })
  return account ? { phone: account.phone, role: 'student' } : null
}

function requestLineJson(url, options, fetcher, failureCode) {
  var response
  var payload
  try {
    response = fetcher(url, options)
  }
  catch (error) {
    throw createLineAuthError(failureCode, 'FETCH_FAILED')
  }
  try {
    payload = JSON.parse(response.getContentText())
  }
  catch (error) {
    throw createLineAuthError(failureCode, 'INVALID_JSON')
  }
  if (payload.error) {
    throw createLineAuthError(failureCode, payload.error)
  }
  return payload
}

function createLineAuthError(failureCode, detail) {
  var errorCode = failureCode + ':' + normalizeLineErrorDetail(detail)
  console.error(errorCode)
  return new Error(errorCode)
}

function normalizeLineErrorDetail(detail) {
  return String(detail || 'UNKNOWN')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 64)
}
