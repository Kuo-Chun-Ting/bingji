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
  )
  if (!tokenResponse.id_token) {
    throw new Error('LINE_AUTH_FAILED')
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
  )
  if (!identity.sub) {
    throw new Error('LINE_AUTH_FAILED')
  }
  return String(identity.sub)
}

function resolveLineSession(lineUserId, teacherIdentity, accounts) {
  if (teacherIdentity.lineUserId === lineUserId) {
    return { phone: normalizePhone(teacherIdentity.phone), role: 'teacher' }
  }
  var account = accounts.find(function (candidate) {
    return candidate.lineUserId === lineUserId
  })
  return account ? { phone: account.phone, role: 'student' } : null
}

function requestLineJson(url, options, fetcher) {
  try {
    return JSON.parse(fetcher(url, options).getContentText())
  }
  catch (error) {
    throw new Error('LINE_AUTH_FAILED')
  }
}
