function doGet() {
  return createJsonOutput({
    ok: true,
    service: 'ski-registration-api',
    status: 'ready',
  })
}

function doPost() {
  return createJsonOutput({
    ok: false,
    code: 'NOT_IMPLEMENTED',
  })
}

function createJsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}
