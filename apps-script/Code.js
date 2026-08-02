function doGet() {
  return createJsonOutput({
    ok: true,
    service: 'ski-registration-api',
    status: 'ready',
  })
}

function doPost(event) {
  try {
    var request = parseRequest(event)
    return createJsonOutput({
      ok: true,
      result: executeAction(request.action, request.payload),
    })
  }
  catch (error) {
    return createJsonOutput({
      ok: false,
      code: getErrorCode(error),
    })
  }
}

function createJsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}

function parseRequest(event) {
  try {
    var request = JSON.parse(event.postData.contents)
    if (!request || typeof request.action !== 'string') {
      throw new Error('INVALID_REQUEST')
    }
    return {
      action: request.action,
      payload: request.payload && typeof request.payload === 'object'
        ? request.payload
        : {},
    }
  }
  catch (error) {
    throw new Error('INVALID_REQUEST')
  }
}

function getErrorCode(error) {
  var knownCodes = [
    'INVALID_REQUEST',
    'UNKNOWN_ACTION',
    'INVALID_SESSION',
    'INVALID_BINDING_TOKEN',
    'INVALID_CREDENTIALS',
    'LINE_AUTH_FAILED',
    'PHONE_ALREADY_LINKED',
    'FORBIDDEN',
    'STUDENT_NOT_FOUND',
    'COURSE_NOT_FOUND',
    'COURSE_CLOSED',
    'ALREADY_REGISTERED',
    'REGISTRATION_NOT_FOUND',
    'INVALID_STATUS_TRANSITION',
    'MISSING_CONFIGURATION',
    'SOURCE_SHEET_NOT_FOUND',
    'OPERATIONS_SHEET_NOT_FOUND',
    'INVALID_SHEET_HEADERS',
    'DUPLICATE_PHONE',
    'DUPLICATE_LINE_USER_ID',
  ]
  if (!error || typeof error.message !== 'string') {
    return 'INTERNAL_ERROR'
  }
  if (knownCodes.indexOf(error.message) !== -1 || isLineAuthDiagnosticCode(error.message)) {
    return error.message
  }
  return 'INTERNAL_ERROR'
}

function isLineAuthDiagnosticCode(code) {
  return /^LINE_(TOKEN_EXCHANGE|ID_TOKEN_VERIFICATION)_FAILED:[A-Z0-9_]+$/.test(code)
}
