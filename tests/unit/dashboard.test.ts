import { expect, test } from 'vitest'

import type { Course, Registration, Student } from '../../shared/types/domain'
import type { DatabaseFile } from '../../server/repositories/json-database'
import { createStudentDashboard, createTeacherDashboard } from '../../server/services/dashboard'

const students: Student[] = [
  { name: '王小明', phone: '0912345678', email: 'ming@example.com', purchasedLessons: 4 },
  { name: '王小美', phone: '0987654321', email: 'mei@example.com', purchasedLessons: 2 },
]

const courses: Course[] = [
  { id: 'course-1', date: '2026-08-01', startTime: '09:00', endTime: '11:00', isOpen: true },
]

const registrations: Registration[] = [
  {
    id: 'course-1:0912345678',
    courseId: 'course-1',
    phone: '0912345678',
    status: 'attended',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'course-2:0912345678',
    courseId: 'course-2',
    phone: '0912345678',
    status: 'registered',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  },
  {
    id: 'course-1:0987654321',
    courseId: 'course-1',
    phone: '0987654321',
    status: 'attended',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
  },
]

const database: DatabaseFile = { courses, registrations }

test('test_createStudentDashboard_when_student_has_registrations_then_returns_only_own_data_and_remaining_lessons', () => {
  // Arrange
  const student = students[0]

  // Act
  const dashboard = createStudentDashboard(student, database)

  // Assert
  expect(dashboard).toEqual({
    student,
    remainingLessons: 3,
    courses,
    registrations: registrations.slice(0, 2),
  })
})

test('test_createTeacherDashboard_when_students_have_attendance_records_then_returns_all_data_and_balances', () => {
  // Arrange
  const expectedRemainingLessons = {
    '0912345678': 3,
    '0987654321': 1,
  }

  // Act
  const dashboard = createTeacherDashboard(students, database)

  // Assert
  expect(dashboard).toEqual({
    students,
    courses,
    registrations,
    remainingLessons: expectedRemainingLessons,
  })
})
