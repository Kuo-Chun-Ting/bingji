function executeAction(action, payload, diagnostics) {
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
  return handlers[action](payload || {}, diagnostics)
}

function loginWithLineAction(payload, diagnostics) {
  var configuration = measureActionPhase(diagnostics, 'getConfiguration', getAppConfiguration)
  var measuredLineFetcher = function (url, options) {
    var phase = url.indexOf('/token') !== -1
      ? 'lineTokenExchange'
      : 'lineIdTokenVerification'
    return measureActionPhase(diagnostics, phase, function () {
      return fetchLineApi(url, options)
    })
  }
  var lineUserId = exchangeLineAuthorizationCode(
    payload.code,
    payload.nonce,
    configuration.lineLogin,
    measuredLineFetcher,
  )
  var accounts = measureActionPhase(diagnostics, 'loadAccounts', loadAccounts)
  var session = resolveLineSession(lineUserId, accounts)
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

function bindLineAccountAction(payload, diagnostics) {
  var configuration = measureActionPhase(diagnostics, 'getConfiguration', getAppConfiguration)
  var identity = verifyBindingToken(payload.bindingToken, configuration.sessionSecret, Date.now())
  var phone = normalizePhone(payload.phone)
  return withScriptLock(function () {
    var students = measureActionPhase(diagnostics, 'loadStudents', loadStudents)
    var student = students.find(function (candidate) {
      return candidate.phone === phone
    })
    if (!student) {
      throw new Error('STUDENT_NOT_FOUND')
    }

    var accounts = measureActionPhase(diagnostics, 'loadAccounts', loadAccounts)
    var existingSession = resolveLineSession(identity.lineUserId, accounts)
    if (existingSession) {
      return createLoginResponse(existingSession, configuration.sessionSecret)
    }
    if (accounts.some(function (account) { return account.phone === phone })) {
      throw new Error('PHONE_ALREADY_LINKED')
    }
    measureActionPhase(diagnostics, 'appendAccount', function () {
      appendAccount({ phone: phone, lineUserId: identity.lineUserId })
    })
    return createLoginResponse({ phone: phone, role: 'student' }, configuration.sessionSecret)
  }, diagnostics)
}

function createLoginResponse(session, secret) {
  return {
    token: createSessionToken(session, secret, Date.now()),
    role: session.role,
  }
}

function getStudentDashboardAction(payload, diagnostics) {
  var session = requireRole(payload.token, 'student')
  var students = measureActionPhase(diagnostics, 'loadStudents', loadStudents)
  var registrations = measureActionPhase(diagnostics, 'loadRegistrations', loadRegistrations)
  var student = students.find(function (candidate) {
    return candidate.phone === session.phone
  })
  if (!student) {
    throw new Error('STUDENT_NOT_FOUND')
  }

  return {
    student: student,
    remainingLessons: calculateRemainingLessons(student, registrations),
    courses: measureActionPhase(diagnostics, 'loadCourses', loadCourses),
    registrations: registrations.filter(function (registration) {
      return registration.phone === session.phone
    }),
  }
}

function registerCourseAction(payload, diagnostics) {
  var session = requireRole(payload.token, 'student')
  return withScriptLock(function () {
    var courses = measureActionPhase(diagnostics, 'loadCourses', loadCourses)
    var course = courses.find(function (candidate) {
      return candidate.id === payload.courseId
    })
    if (!course) {
      throw new Error('COURSE_NOT_FOUND')
    }

    var registration = createRegistration(
      course,
      session.phone,
      measureActionPhase(diagnostics, 'loadRegistrations', loadRegistrations),
      new Date().toISOString(),
    )
    measureActionPhase(diagnostics, 'appendRegistration', function () {
      appendRegistration(registration)
    })
    return { registration: registration }
  }, diagnostics)
}

function getTeacherDashboardAction(payload, diagnostics) {
  requireRole(payload.token, 'teacher')
  var students = measureActionPhase(diagnostics, 'loadStudents', loadStudents)
  var registrations = measureActionPhase(diagnostics, 'loadRegistrations', loadRegistrations)
  var remainingLessons = {}
  students.forEach(function (student) {
    remainingLessons[student.phone] = calculateRemainingLessons(student, registrations)
  })

  return {
    students: students,
    courses: measureActionPhase(diagnostics, 'loadCourses', loadCourses),
    registrations: registrations,
    remainingLessons: remainingLessons,
  }
}

function updateAttendanceAction(payload, diagnostics) {
  requireRole(payload.token, 'teacher')
  return withScriptLock(function () {
    var registrations = measureActionPhase(diagnostics, 'loadRegistrations', loadRegistrations)
    var registration = registrations.find(function (candidate) {
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
    measureActionPhase(diagnostics, 'replaceRegistration', function () {
      replaceRegistration(updatedRegistration)
    })
    return { registration: updatedRegistration }
  }, diagnostics)
}

function requireRole(token, role) {
  var configuration = getAppConfiguration()
  var session = verifySessionToken(token, configuration.sessionSecret, Date.now())
  if (session.role !== role) {
    throw new Error('FORBIDDEN')
  }
  return session
}

function withScriptLock(operation, diagnostics) {
  var lock = LockService.getScriptLock()
  measureActionPhase(diagnostics, 'scriptLockWait', function () {
    lock.waitLock(30000)
  })
  try {
    return operation()
  }
  finally {
    lock.releaseLock()
  }
}

function measureActionPhase(diagnostics, phase, operation) {
  var startedAt = Date.now()
  try {
    return operation()
  }
  finally {
    if (diagnostics && Array.isArray(diagnostics.phases)) {
      diagnostics.phases.push({
        phase: phase,
        durationMs: Date.now() - startedAt,
      })
    }
  }
}
