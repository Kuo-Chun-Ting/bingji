import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

interface DomainContext {
  REGISTRATION_STATUS: {
    REGISTERED: string
    ATTENDED: string
    ABSENT: string
    CANCELLED: string
  }
  normalizePhone(phone: string): string
  parseStudentRows(rows: unknown[][]): unknown[]
  parseAccountRows(rows: unknown[][]): unknown[]
  parseCourseRows(rows: unknown[][]): unknown[]
  parseRegistrationRows(rows: unknown[][]): unknown[]
  calculateRemainingLessons(student: { phone: string, purchasedLessons: number }, registrations: Array<{ phone: string, status: string }>): number
  createRegistration(course: { id: string, isOpen: boolean }, phone: string, registrations: Array<{ courseId: string, phone: string }>, now: string): unknown
  updateRegistrationStatus(registration: { status: string }, status: string, now: string): unknown
}

test('test_registrationStatus_when_loaded_then_exposes_all_registration_statuses', async () => {
  // Arrange
  const context = await loadDomainContext()

  // Act
  const statuses = context.REGISTRATION_STATUS

  // Assert
  expect(statuses).toEqual({
    REGISTERED: 'registered',
    ATTENDED: 'attended',
    ABSENT: 'absent',
    CANCELLED: 'cancelled',
  })
})

test('test_normalizePhone_when_phone_contains_separators_then_returns_digits', async () => {
  // Arrange
  const context = await loadDomainContext()

  // Act
  const phone = context.normalizePhone?.('0912-345 678')

  // Assert
  expect(phone).toBe('0912345678')
})

test('test_parseStudentRows_when_headers_and_rows_are_valid_then_returns_students', async () => {
  // Arrange
  const context = await loadDomainContext()
  const rows = [
    ['姓名', '電話', 'Email', '購買堂數'],
    ['王小明', '0912-345-678', 'student@example.com', '4'],
  ]

  // Act
  const students = context.parseStudentRows?.(rows)

  // Assert
  expect(students).toEqual([{
    name: '王小明',
    phone: '0912345678',
    email: 'student@example.com',
    purchasedLessons: 4,
  }])
})

test('test_parseAccountRows_when_rows_are_valid_then_returns_accounts', async () => {
  // Arrange
  const context = await loadDomainContext()
  const rows = [
    ['phone', 'lineUserId'],
    ['0912-345-678', 'line-user-id'],
  ]

  // Act
  const accounts = context.parseAccountRows?.(rows)

  // Assert
  expect(accounts).toEqual([{
    phone: '0912345678',
    lineUserId: 'line-user-id',
  }])
})

test('test_parseStudentRows_when_phone_is_duplicated_then_throws_duplicate_phone_error', async () => {
  // Arrange
  const context = await loadDomainContext()
  const rows = [
    ['姓名', '電話', 'Email', '購買堂數'],
    ['王小明', '0912-345-678', 'student@example.com', '4'],
    ['王小華', '0912345678', 'another@example.com', '2'],
  ]

  // Act & Assert
  expect(() => context.parseStudentRows?.(rows)).toThrow('DUPLICATE_PHONE')
})

test('test_parseAccountRows_when_phone_is_duplicated_then_throws_duplicate_phone_error', async () => {
  // Arrange
  const context = await loadDomainContext()
  const rows = [
    ['phone', 'lineUserId'],
    ['0912-345-678', 'first-line-user-id'],
    ['0912345678', 'second-line-user-id'],
  ]

  // Act & Assert
  expect(() => context.parseAccountRows?.(rows)).toThrow('DUPLICATE_PHONE')
})

test('test_parseCourseRows_when_rows_are_valid_then_returns_courses', async () => {
  // Arrange
  const context = await loadDomainContext()
  const rows = [
    ['id', 'date', 'startTime', 'endTime', 'isOpen'],
    ['course-1', '2026-08-09', '09:00', '11:00', 'TRUE'],
  ]

  // Act
  const courses = context.parseCourseRows?.(rows)

  // Assert
  expect(courses).toEqual([{
    id: 'course-1',
    date: '2026-08-09',
    startTime: '09:00',
    endTime: '11:00',
    isOpen: true,
  }])
})

test('test_parseRegistrationRows_when_rows_are_valid_then_returns_registrations', async () => {
  // Arrange
  const context = await loadDomainContext()
  const rows = [
    ['id', 'courseId', 'phone', 'status', 'createdAt', 'updatedAt'],
    ['registration-1', 'course-1', '0912-345-678', 'registered', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'],
  ]

  // Act
  const registrations = context.parseRegistrationRows?.(rows)

  // Assert
  expect(registrations).toEqual([{
    id: 'registration-1',
    courseId: 'course-1',
    phone: '0912345678',
    status: 'registered',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }])
})

test('test_calculateRemainingLessons_when_only_one_registration_is_attended_then_subtracts_one', async () => {
  // Arrange
  const context = await loadDomainContext()
  const student = { phone: '0912345678', purchasedLessons: 4 }
  const registrations = [
    { phone: '0912345678', status: 'attended' },
    { phone: '0912345678', status: 'absent' },
    { phone: '0988777666', status: 'attended' },
  ]

  // Act
  const remainingLessons = context.calculateRemainingLessons?.(student, registrations)

  // Assert
  expect(remainingLessons).toBe(3)
})

test('test_createRegistration_when_student_is_already_registered_then_throws_duplicate_error', async () => {
  // Arrange
  const context = await loadDomainContext()
  const course = { id: 'course-1', isOpen: true }
  const registrations = [{ courseId: 'course-1', phone: '0912345678' }]

  // Act & Assert
  expect(() => context.createRegistration?.(course, '0912345678', registrations, '2026-08-01T00:00:00.000Z'))
    .toThrow('ALREADY_REGISTERED')
})

test('test_createRegistration_when_course_is_closed_then_throws_course_closed_error', async () => {
  // Arrange
  const context = await loadDomainContext()
  const course = { id: 'course-1', isOpen: false }

  // Act & Assert
  expect(() => context.createRegistration?.(course, '0912345678', [], '2026-08-01T00:00:00.000Z'))
    .toThrow('COURSE_CLOSED')
})

test('test_updateRegistrationStatus_when_registration_is_registered_then_returns_attended_registration', async () => {
  // Arrange
  const context = await loadDomainContext()
  const registration = {
    id: 'registration-1',
    courseId: 'course-1',
    phone: '0912345678',
    status: 'registered',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }

  // Act
  const updatedRegistration = context.updateRegistrationStatus?.(
    registration,
    'attended',
    '2026-08-09T03:00:00.000Z',
  )

  // Assert
  expect(updatedRegistration).toEqual({
    ...registration,
    status: 'attended',
    updatedAt: '2026-08-09T03:00:00.000Z',
  })
})

test('test_updateRegistrationStatus_when_registration_is_completed_then_throws_transition_error', async () => {
  // Arrange
  const context = await loadDomainContext()
  const registration = { status: 'attended' }

  // Act & Assert
  expect(() => context.updateRegistrationStatus?.(
    registration,
    'absent',
    '2026-08-09T03:00:00.000Z',
  )).toThrow('INVALID_STATUS_TRANSITION')
})

async function loadDomainContext(): Promise<DomainContext> {
  let source = ''
  try {
    source = await readFile('apps-script/Domain.js', 'utf8')
  }
  catch {
    // The first TDD run intentionally loads an empty context.
  }

  const context = {
    Utilities: {
      getUuid: (): string => 'registration-1',
    },
  }
  runInNewContext(source, context)
  return context as unknown as DomainContext
}
