var FORM_RESPONSE_SHEET_NAME = '表單回覆 1'
var appConfigurationMemo = null
var spreadsheetMemo = null

function getAppConfiguration() {
  if (appConfigurationMemo) {
    return appConfigurationMemo
  }

  var properties = PropertiesService.getScriptProperties().getProperties()
  var requiredKeys = [
    'SPREADSHEET_ID',
    'ADMIN_ACCOUNT',
    'ADMIN_PASSWORD',
    'SESSION_SECRET',
    'LINE_CHANNEL_ID',
    'LINE_CHANNEL_SECRET',
    'LINE_REDIRECT_URI',
  ]
  requiredKeys.forEach(function (key) {
    if (!properties[key]) {
      throw new Error('MISSING_CONFIGURATION')
    }
  })

  appConfigurationMemo = {
    spreadsheetId: properties.SPREADSHEET_ID,
    teacherCredentials: {
      username: properties.ADMIN_ACCOUNT,
      password: properties.ADMIN_PASSWORD,
    },
    sessionSecret: properties.SESSION_SECRET,
    lineLogin: {
      channelId: properties.LINE_CHANNEL_ID,
      channelSecret: properties.LINE_CHANNEL_SECRET,
      redirectUri: properties.LINE_REDIRECT_URI,
    },
  }
  return appConfigurationMemo
}

function loadStudents() {
  var sheet = getDataSheet(FORM_RESPONSE_SHEET_NAME)
  var formResponseRows = sheet.getDataRange().getDisplayValues()
  if (!isStudentSheetRows(formResponseRows)) {
    throw new Error('SOURCE_SHEET_NOT_FOUND')
  }
  return parseStudentRows(formResponseRows)
}

function loadAccounts() {
  return parseAccountRows(getDataSheetRows('accounts'))
}

function loadCourses() {
  return parseCourseRows(getDataSheetRows('courses'))
}

function loadRegistrations() {
  return parseRegistrationRows(getDataSheetRows('registrations'))
}

function appendRegistration(registration) {
  var sheet = getDataSheet('registrations')
  writeRegistrationRow(sheet, sheet.getLastRow() + 1, registration)
}

function appendAccount(account) {
  var sheet = getDataSheet('accounts')
  sheet
    .getRange(sheet.getLastRow() + 1, 1, 1, 2)
    .setNumberFormat('@')
    .setValues([[account.phone, account.lineUserId]])
}

function replaceRegistration(registration) {
  var sheet = getDataSheet('registrations')
  var rows = sheet.getDataRange().getDisplayValues()
  var rowIndex = rows.findIndex(function (row, index) {
    return index > 0 && String(row[0]) === registration.id
  })
  if (rowIndex === -1) {
    throw new Error('REGISTRATION_NOT_FOUND')
  }

  writeRegistrationRow(sheet, rowIndex + 1, registration)
}

function writeRegistrationRow(sheet, rowNumber, registration) {
  sheet
    .getRange(rowNumber, 1, 1, 6)
    .setNumberFormat('@')
    .setValues([toRegistrationRow(registration)])
}

function getDataSheetRows(sheetName) {
  return getDataSheet(sheetName).getDataRange().getDisplayValues()
}

function getDataSheet(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName)
  if (!sheet) {
    throw new Error('OPERATIONS_SHEET_NOT_FOUND')
  }
  return sheet
}

function getSpreadsheet() {
  if (!spreadsheetMemo) {
    var configuration = getAppConfiguration()
    spreadsheetMemo = SpreadsheetApp.openById(configuration.spreadsheetId)
  }
  return spreadsheetMemo
}

function toRegistrationRow(registration) {
  return [
    registration.id,
    registration.courseId,
    registration.phone,
    registration.status,
    registration.createdAt,
    registration.updatedAt,
  ]
}
