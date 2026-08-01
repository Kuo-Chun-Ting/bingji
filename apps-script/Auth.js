function authenticateUser(phone, password, teacherCredentials, accounts) {
  var normalizedPhone = normalizePhone(phone)
  var isTeacher = normalizedPhone === normalizePhone(teacherCredentials.phone)
    && password === teacherCredentials.password
  if (isTeacher) {
    return { phone: normalizedPhone, role: 'teacher' }
  }

  var account = accounts.find(function (candidate) {
    return candidate.phone === normalizedPhone && candidate.password === password
  })
  if (account) {
    return { phone: normalizedPhone, role: 'student' }
  }

  throw new Error('INVALID_CREDENTIALS')
}

function createSessionToken(session, secret, now) {
  var payload = {
    phone: session.phone,
    role: session.role,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  }
  var encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload))
  var signature = createTokenSignature(encodedPayload, secret)
  return encodedPayload + '.' + signature
}

function verifySessionToken(token, secret, now) {
  try {
    var parts = String(token || '').split('.')
    if (parts.length !== 2 || createTokenSignature(parts[0], secret) !== parts[1]) {
      throw new Error('INVALID_SESSION')
    }

    var payload = JSON.parse(decodeTokenPayload(parts[0]))
    var hasValidRole = payload.role === 'student' || payload.role === 'teacher'
    if (!payload.phone || !hasValidRole || payload.expiresAt <= now) {
      throw new Error('INVALID_SESSION')
    }

    return payload
  }
  catch (error) {
    throw new Error('INVALID_SESSION')
  }
}

function createTokenSignature(encodedPayload, secret) {
  var signature = Utilities.computeHmacSha256Signature(encodedPayload, secret)
  return Utilities.base64EncodeWebSafe(signature)
}

function decodeTokenPayload(encodedPayload) {
  var bytes = Utilities.base64DecodeWebSafe(encodedPayload)
  return Utilities.newBlob(bytes).getDataAsString()
}
