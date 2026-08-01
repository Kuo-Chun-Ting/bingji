var REGISTRATION_STATUS = Object.freeze({
  REGISTERED: 'registered',
  ATTENDED: 'attended',
  ABSENT: 'absent',
  CANCELLED: 'cancelled',
})

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function parseStudentRows(rows) {
  var students = parseRows(rows, ['姓名', '電話', 'Email', '購買堂數'], function (row) {
    return {
      name: String(row[0]).trim(),
      phone: normalizePhone(row[1]),
      email: String(row[2]).trim(),
      purchasedLessons: Number(row[3]),
    }
  })
  assertUniquePhones(students)
  return students
}

function parseAccountRows(rows) {
  var accounts = parseRows(rows, ['phone', 'password'], function (row) {
    return {
      phone: normalizePhone(row[0]),
      password: String(row[1]),
    }
  })
  assertUniquePhones(accounts)
  return accounts
}

function parseCourseRows(rows) {
  return parseRows(rows, ['id', 'date', 'startTime', 'endTime', 'isOpen'], function (row) {
    return {
      id: String(row[0]).trim(),
      date: String(row[1]).trim(),
      startTime: String(row[2]).trim(),
      endTime: String(row[3]).trim(),
      isOpen: row[4] === true || String(row[4]).toUpperCase() === 'TRUE',
    }
  })
}

function parseRegistrationRows(rows) {
  return parseRows(rows, ['id', 'courseId', 'phone', 'status', 'createdAt', 'updatedAt'], function (row) {
    return {
      id: String(row[0]).trim(),
      courseId: String(row[1]).trim(),
      phone: normalizePhone(row[2]),
      status: String(row[3]).trim(),
      createdAt: String(row[4]).trim(),
      updatedAt: String(row[5]).trim(),
    }
  })
}

function calculateRemainingLessons(student, registrations) {
  var attendedLessons = registrations.filter(function (registration) {
    return registration.phone === student.phone && registration.status === REGISTRATION_STATUS.ATTENDED
  }).length

  return student.purchasedLessons - attendedLessons
}

function createRegistration(course, phone, registrations, now) {
  if (!course.isOpen) {
    throw new Error('COURSE_CLOSED')
  }

  var normalizedPhone = normalizePhone(phone)
  var isDuplicate = registrations.some(function (registration) {
    return registration.courseId === course.id && registration.phone === normalizedPhone
  })
  if (isDuplicate) {
    throw new Error('ALREADY_REGISTERED')
  }

  return {
    id: Utilities.getUuid(),
    courseId: course.id,
    phone: normalizedPhone,
    status: REGISTRATION_STATUS.REGISTERED,
    createdAt: now,
    updatedAt: now,
  }
}

function updateRegistrationStatus(registration, status, now) {
  if (registration.status !== REGISTRATION_STATUS.REGISTERED || !isAttendanceResult(status)) {
    throw new Error('INVALID_STATUS_TRANSITION')
  }

  return Object.assign({}, registration, {
    status: status,
    updatedAt: now,
  })
}

function isAttendanceResult(status) {
  return status === REGISTRATION_STATUS.ATTENDED
    || status === REGISTRATION_STATUS.ABSENT
    || status === REGISTRATION_STATUS.CANCELLED
}

function parseRows(rows, expectedHeaders, parseRow) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('INVALID_SHEET_HEADERS')
  }

  var headers = rows[0].map(String)
  if (headers.join('|') !== expectedHeaders.join('|')) {
    throw new Error('INVALID_SHEET_HEADERS')
  }

  return rows.slice(1)
    .filter(function (row) {
      return row.some(function (value) {
        return String(value).trim() !== ''
      })
    })
    .map(parseRow)
}

function assertUniquePhones(records) {
  var seenPhones = {}
  records.forEach(function (record) {
    if (seenPhones[record.phone]) {
      throw new Error('DUPLICATE_PHONE')
    }
    seenPhones[record.phone] = true
  })
}
