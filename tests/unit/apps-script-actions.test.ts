import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

interface ActionsContext {
  executeAction(action: string, payload: Record<string, unknown>): unknown
}

interface ActionState {
  appendedRegistrations: unknown[]
  replacedRegistrations: unknown[]
  lockWaits: number
  lockReleases: number
}

test('test_executeAction_when_login_credentials_are_valid_then_returns_role_and_token', async () => {
  // Arrange
  const { context } = await loadActionsContext()

  // Act
  const result = context.executeAction?.('login', {
    phone: '0912345678',
    password: 'student-password',
  })

  // Assert
  expect(result).toEqual({
    token: 'signed-student-token',
    role: 'student',
  })
})

test('test_executeAction_when_student_dashboard_is_requested_then_returns_only_student_data', async () => {
  // Arrange
  const { context } = await loadActionsContext()

  // Act
  const result = context.executeAction?.('getStudentDashboard', {
    token: 'student-token',
  })

  // Assert
  expect(result).toEqual({
    student: {
      name: '王小明',
      phone: '0912345678',
      email: 'student@example.com',
      purchasedLessons: 4,
    },
    remainingLessons: 3,
    courses: [{
      id: 'course-1',
      date: '2026-08-09',
      startTime: '09:00',
      endTime: '11:00',
      isOpen: true,
    }, {
      id: 'course-2',
      date: '2026-08-16',
      startTime: '09:00',
      endTime: '11:00',
      isOpen: true,
    }],
    registrations: [{
      id: 'registration-1',
      courseId: 'course-1',
      phone: '0912345678',
      status: 'attended',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-09T03:00:00.000Z',
    }],
  })
})

test('test_executeAction_when_student_registers_then_uses_session_phone_and_appends_registration', async () => {
  // Arrange
  const { context, state } = await loadActionsContext()

  // Act
  const result = context.executeAction?.('registerCourse', {
    token: 'student-token',
    courseId: 'course-2',
    phone: '0988777666',
  })

  // Assert
  expect(result).toEqual({
    registration: {
      id: 'registration-2',
      courseId: 'course-2',
      phone: '0912345678',
      status: 'registered',
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    },
  })
  expect(state.appendedRegistrations).toEqual([{
    id: 'registration-2',
    courseId: 'course-2',
    phone: '0912345678',
    status: 'registered',
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  }])
  expect(state.lockWaits).toBe(1)
  expect(state.lockReleases).toBe(1)
})

test('test_executeAction_when_teacher_dashboard_is_requested_then_returns_all_students', async () => {
  // Arrange
  const { context } = await loadActionsContext()

  // Act
  const result = context.executeAction?.('getTeacherDashboard', {
    token: 'teacher-token',
  })

  // Assert
  expect(result).toMatchObject({
    students: [
      { phone: '0912345678' },
      { phone: '0988777666' },
    ],
    remainingLessons: {
      '0912345678': 3,
      '0988777666': 2,
    },
  })
})

test('test_executeAction_when_teacher_updates_attendance_then_replaces_registration', async () => {
  // Arrange
  const { context, state } = await loadActionsContext()

  // Act
  const result = context.executeAction?.('updateAttendance', {
    token: 'teacher-token',
    registrationId: 'registration-2',
    status: 'attended',
  })

  // Assert
  expect(result).toEqual({
    registration: {
      id: 'registration-2',
      courseId: 'course-2',
      phone: '0988777666',
      status: 'attended',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    },
  })
  expect(state.replacedRegistrations).toHaveLength(1)
  expect(state.lockWaits).toBe(1)
  expect(state.lockReleases).toBe(1)
})

test('test_executeAction_when_student_requests_teacher_dashboard_then_throws_forbidden_error', async () => {
  // Arrange
  const { context } = await loadActionsContext()

  // Act & Assert
  expect(() => context.executeAction?.('getTeacherDashboard', {
    token: 'student-token',
  })).toThrow('FORBIDDEN')
})

test('test_executeAction_when_teacher_registers_student_then_throws_forbidden_error', async () => {
  // Arrange
  const { context } = await loadActionsContext()

  // Act & Assert
  expect(() => context.executeAction?.('registerCourse', {
    token: 'teacher-token',
    courseId: 'course-1',
  })).toThrow('FORBIDDEN')
})

async function loadActionsContext(): Promise<{ context: ActionsContext, state: ActionState }> {
  const domainSource = await readFile('apps-script/Domain.js', 'utf8')
  let actionsSource = ''
  try {
    actionsSource = await readFile('apps-script/Actions.js', 'utf8')
  }
  catch {
    // The first TDD run intentionally loads an empty context.
  }

  const state: ActionState = {
    appendedRegistrations: [],
    replacedRegistrations: [],
    lockWaits: 0,
    lockReleases: 0,
  }
  const students = [
    {
      name: '王小明',
      phone: '0912345678',
      email: 'student@example.com',
      purchasedLessons: 4,
    },
    {
      name: '李小美',
      phone: '0988777666',
      email: 'another@example.com',
      purchasedLessons: 2,
    },
  ]
  const courses = [
    {
      id: 'course-1',
      date: '2026-08-09',
      startTime: '09:00',
      endTime: '11:00',
      isOpen: true,
    },
    {
      id: 'course-2',
      date: '2026-08-16',
      startTime: '09:00',
      endTime: '11:00',
      isOpen: true,
    },
  ]
  const registrations = [
    {
      id: 'registration-1',
      courseId: 'course-1',
      phone: '0912345678',
      status: 'attended',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-09T03:00:00.000Z',
    },
    {
      id: 'registration-2',
      courseId: 'course-2',
      phone: '0988777666',
      status: 'registered',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ]
  const context = {
    Utilities: {
      getUuid: (): string => 'registration-2',
    },
    Date: class {
      static now(): number {
        return Date.UTC(2026, 7, 2)
      }

      toISOString(): string {
        return '2026-08-02T00:00:00.000Z'
      }
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          state.lockWaits += 1
        },
        releaseLock: () => {
          state.lockReleases += 1
        },
      }),
    },
    getAppConfiguration: () => ({
      teacherCredentials: { phone: '0988222222', password: 'teacher-password' },
      sessionSecret: 'session-secret',
    }),
    loadAccounts: () => [{ phone: '0912345678', password: 'student-password' }],
    loadStudents: () => students,
    loadCourses: () => courses,
    loadRegistrations: () => registrations,
    appendRegistration: (registration: unknown) => {
      state.appendedRegistrations.push(registration)
    },
    replaceRegistration: (registration: unknown) => {
      state.replacedRegistrations.push(registration)
    },
    authenticateUser: (phone: string) => ({
      phone,
      role: phone === '0988222222' ? 'teacher' : 'student',
    }),
    createSessionToken: (session: { role: string }) => `signed-${session.role}-token`,
    verifySessionToken: (token: string) => {
      if (token === 'student-token') {
        return { phone: '0912345678', role: 'student' }
      }
      if (token === 'teacher-token') {
        return { phone: '0988222222', role: 'teacher' }
      }
      throw new Error('INVALID_SESSION')
    },
  }

  runInNewContext(`${domainSource}\n${actionsSource}`, context)
  return {
    context: context as unknown as ActionsContext,
    state,
  }
}
