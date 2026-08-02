function executeAction(action, payload) {
  var handlers = {
    loginAsTeacher: loginAsTeacherAction,
    loginWithLine: loginWithLineAction,
    bindLineAccount: bindLineAccountAction,
    getStudentDashboard: getStudentDashboardAction,
    registerCourse: registerCourseAction,
    getTeacherDashboard: getTeacherDashboardAction,
    updateAttendance: updateAttendanceAction,
  }
  if (!handlers[action]) {
    throw new Error('UNKNOWN_ACTION')
  }
  return handlers[action](payload || {})
}

function loginWithLineAction(payload) {
  var configuration = getAppConfiguration()
  var lineUserId = exchangeLineAuthorizationCode(
    payload.code,
    payload.nonce,
    payload.redirectUri,
    configuration.lineLogin,
    fetchLineApi,
  )
  var session = resolveLineSession(lineUserId, loadAccounts())
  if (!session) {
    return { bindingToken: createBindingToken(lineUserId, configuration.sessionSecret, Date.now()) }
  }
  return createLoginResponse(session, configuration.sessionSecret)
}

function loginAsTeacherAction(payload) {
  var configuration = getAppConfiguration()
  if (
    String(payload.username || '') !== configuration.teacherCredentials.username
    || String(payload.password || '') !== configuration.teacherCredentials.password
  ) {
    throw new Error('INVALID_CREDENTIALS')
  }
  return createLoginResponse({ role: 'teacher' }, configuration.sessionSecret)
}

function fetchLineApi(url, options) {
  return UrlFetchApp.fetch(url, options)
}

function bindLineAccountAction(payload) {
  var configuration = getAppConfiguration()
  var identity = verifyBindingToken(payload.bindingToken, configuration.sessionSecret, Date.now())
  var phone = normalizePhone(payload.phone)
  return withScriptLock(function () {
    var student = loadStudents().find(function (candidate) {
      return candidate.phone === phone
    })
    if (!student) {
      throw new Error('STUDENT_NOT_FOUND')
    }

    var accounts = loadAccounts()
    var existingSession = resolveLineSession(identity.lineUserId, accounts)
    if (existingSession) {
      return createLoginResponse(existingSession, configuration.sessionSecret)
    }
    if (accounts.some(function (account) { return account.phone === phone })) {
      throw new Error('PHONE_ALREADY_LINKED')
    }
    appendAccount({ phone: phone, lineUserId: identity.lineUserId })
    return createLoginResponse({ phone: phone, role: 'student' }, configuration.sessionSecret)
  })
}

function createLoginResponse(session, secret) {
  return {
    token: createSessionToken(session, secret, Date.now()),
    role: session.role,
  }
}

function getStudentDashboardAction(payload) {
  var session = requireRole(payload.token, 'student')
  var students = loadStudents()
  var registrations = loadRegistrations()
  var student = students.find(function (candidate) {
    return candidate.phone === session.phone
  })
  if (!student) {
    throw new Error('STUDENT_NOT_FOUND')
  }

  return {
    student: student,
    remainingLessons: calculateRemainingLessons(student, registrations),
    courses: loadCourses(),
    registrations: registrations.filter(function (registration) {
      return registration.phone === session.phone
    }),
  }
}

function registerCourseAction(payload) {
  var session = requireRole(payload.token, 'student')
  return withScriptLock(function () {
    var courses = loadCourses()
    var course = courses.find(function (candidate) {
      return candidate.id === payload.courseId
    })
    if (!course) {
      throw new Error('COURSE_NOT_FOUND')
    }

    var registration = createRegistration(
      course,
      session.phone,
      loadRegistrations(),
      new Date().toISOString(),
    )
    appendRegistration(registration)
    return { registration: registration }
  })
}

function getTeacherDashboardAction(payload) {
  requireRole(payload.token, 'teacher')
  var students = loadStudents()
  var registrations = loadRegistrations()
  var remainingLessons = {}
  students.forEach(function (student) {
    remainingLessons[student.phone] = calculateRemainingLessons(student, registrations)
  })

  return {
    students: students,
    courses: loadCourses(),
    registrations: registrations,
    remainingLessons: remainingLessons,
  }
}

function updateAttendanceAction(payload) {
  requireRole(payload.token, 'teacher')
  return withScriptLock(function () {
    var registration = loadRegistrations().find(function (candidate) {
      return candidate.id === payload.registrationId
    })
    if (!registration) {
      throw new Error('REGISTRATION_NOT_FOUND')
    }

    var updatedRegistration = updateRegistrationStatus(
      registration,
      payload.status,
      new Date().toISOString(),
    )
    replaceRegistration(updatedRegistration)
    return { registration: updatedRegistration }
  })
}

function requireRole(token, role) {
  var configuration = getAppConfiguration()
  var session = verifySessionToken(token, configuration.sessionSecret, Date.now())
  if (session.role !== role) {
    throw new Error('FORBIDDEN')
  }
  return session
}

function withScriptLock(operation) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    return operation()
  }
  finally {
    lock.releaseLock()
  }
}
