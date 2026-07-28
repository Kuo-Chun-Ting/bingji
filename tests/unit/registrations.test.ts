import { expect, test } from 'vitest'

import type { Course, Registration } from '../../shared/types/domain'
import { changeRegistrationStatus, createRegistration } from '../../server/domain/registrations'

const openCourse: Course = {
  id: 'course-1',
  date: '2026-08-01',
  startTime: '09:00',
  endTime: '11:00',
  isOpen: true,
}

const closedCourse: Course = {
  ...openCourse,
  id: 'course-closed',
  isOpen: false,
}

const existingRegistration: Registration = {
  id: 'course-1:0912345678',
  courseId: 'course-1',
  phone: '0912345678',
  status: 'registered',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

test('test_createRegistration_when_course_is_closed_then_throws_error', () => {
  // Arrange
  const now = '2026-07-28T10:00:00.000Z'

  // Act
  const register = () => createRegistration(closedCourse, '0912345678', [], now)

  // Assert
  expect(register).toThrow('Course is closed')
})

test('test_createRegistration_when_phone_normalizes_to_empty_then_throws_error', () => {
  // Arrange
  const now = '2026-07-28T10:00:00.000Z'

  // Act
  const register = () => createRegistration(openCourse, '---', [], now)

  // Assert
  expect(register).toThrow('Phone is required')
})

test('test_createRegistration_when_phone_has_fewer_than_eight_digits_then_throws_error', () => {
  // Arrange
  const now = '2026-07-28T10:00:00.000Z'

  // Act
  const register = () => createRegistration(openCourse, '1234567', [], now)

  // Assert
  expect(register).toThrow('Invalid phone: 1234567')
})

test('test_createRegistration_when_student_already_registered_for_course_then_throws_error', () => {
  // Arrange
  const now = '2026-07-28T10:00:00.000Z'

  // Act
  const register = () => createRegistration(openCourse, '0912-345-678', [existingRegistration], now)

  // Assert
  expect(register).toThrow('Student is already registered for this course')
})

test('test_createRegistration_when_course_is_open_and_phone_is_formatted_then_returns_registered_record', () => {
  // Arrange
  const now = '2026-07-28T10:00:00.000Z'

  // Act
  const registration = createRegistration(openCourse, '0912-345-678', [], now)

  // Assert
  expect(registration).toEqual({
    id: 'course-1:0912345678',
    courseId: 'course-1',
    phone: '0912345678',
    status: 'registered',
    createdAt: now,
    updatedAt: now,
  })
})

test('test_createRegistration_when_phone_is_valid_landline_then_returns_registered_record', () => {
  // Arrange
  const now = '2026-07-28T10:00:00.000Z'

  // Act
  const registration = createRegistration(openCourse, '02-1234-5678', [], now)

  // Assert
  expect(registration).toEqual({
    id: 'course-1:0212345678',
    courseId: 'course-1',
    phone: '0212345678',
    status: 'registered',
    createdAt: now,
    updatedAt: now,
  })
})

test('test_changeRegistrationStatus_when_status_is_attended_then_updates_status_and_time', () => {
  // Arrange
  const now = '2026-07-28T11:00:00.000Z'

  // Act
  const updatedRegistration = changeRegistrationStatus(existingRegistration, 'attended', now)

  // Assert
  expect(updatedRegistration).toEqual({
    ...existingRegistration,
    status: 'attended',
    updatedAt: now,
  })
})

test('test_changeRegistrationStatus_when_status_is_absent_then_updates_status_and_time', () => {
  // Arrange
  const now = '2026-07-28T11:00:00.000Z'

  // Act
  const updatedRegistration = changeRegistrationStatus(existingRegistration, 'absent', now)

  // Assert
  expect(updatedRegistration).toEqual({
    ...existingRegistration,
    status: 'absent',
    updatedAt: now,
  })
})

test('test_changeRegistrationStatus_when_status_is_cancelled_then_updates_status_and_time', () => {
  // Arrange
  const now = '2026-07-28T11:00:00.000Z'

  // Act
  const updatedRegistration = changeRegistrationStatus(existingRegistration, 'cancelled', now)

  // Assert
  expect(updatedRegistration).toEqual({
    ...existingRegistration,
    status: 'cancelled',
    updatedAt: now,
  })
})

test('test_changeRegistrationStatus_when_registration_is_not_registered_then_throws_error', () => {
  // Arrange
  const attendedRegistration: Registration = {
    ...existingRegistration,
    status: 'attended',
  }
  const now = '2026-07-28T11:00:00.000Z'

  // Act
  const changeStatus = () => changeRegistrationStatus(attendedRegistration, 'absent', now)

  // Assert
  expect(changeStatus).toThrow('Only registered records can change status')
})
