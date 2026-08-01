function getAppConfiguration() {
  var properties = PropertiesService.getScriptProperties().getProperties()
  var requiredKeys = [
    'SOURCE_SPREADSHEET_ID',
    'OPERATIONS_SPREADSHEET_ID',
    'TEACHER_PHONE',
    'TEACHER_PASSWORD',
    'SESSION_SECRET',
  ]
  requiredKeys.forEach(function (key) {
    if (!properties[key]) {
      throw new Error('MISSING_CONFIGURATION')
    }
  })

  return {
    sourceSpreadsheetId: properties.SOURCE_SPREADSHEET_ID,
    operationsSpreadsheetId: properties.OPERATIONS_SPREADSHEET_ID,
    teacherCredentials: {
      phone: properties.TEACHER_PHONE,
      password: properties.TEACHER_PASSWORD,
    },
    sessionSecret: properties.SESSION_SECRET,
  }
}

function loadStudents() {
  var configuration = getAppConfiguration()
  var spreadsheet = SpreadsheetApp.openById(configuration.sourceSpreadsheetId)
  var sheet = spreadsheet.getSheets()[0]
  if (!sheet) {
    throw new Error('SOURCE_SHEET_NOT_FOUND')
  }
  return parseStudentRows(sheet.getDataRange().getDisplayValues())
}

function loadAccounts() {
  return parseAccountRows(getOperationsSheetRows('accounts'))
}

function loadCourses() {
  return parseCourseRows(getOperationsSheetRows('courses'))
}

function loadRegistrations() {
  return parseRegistrationRows(getOperationsSheetRows('registrations'))
}

function appendRegistration(registration) {
  var sheet = getOperationsSheet('registrations')
  writeRegistrationRow(sheet, sheet.getLastRow() + 1, registration)
}

function replaceRegistration(registration) {
  var sheet = getOperationsSheet('registrations')
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

function getOperationsSheetRows(sheetName) {
  return getOperationsSheet(sheetName).getDataRange().getDisplayValues()
}

function getOperationsSheet(sheetName) {
  var configuration = getAppConfiguration()
  var spreadsheet = SpreadsheetApp.openById(configuration.operationsSpreadsheetId)
  var sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet) {
    throw new Error('OPERATIONS_SHEET_NOT_FOUND')
  }
  return sheet
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
