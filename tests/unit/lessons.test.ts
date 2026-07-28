import { expect, test } from 'vitest'

import type { Registration, Student } from '../../shared/types/domain'
import { calculateRemainingLessons } from '../../server/domain/lessons'

test('test_calculateRemainingLessons_when_attended_records_match_student_then_subtracts_only_those_records', () => {
  // Arrange
  const student: Student = {
    name: '王小明',
    phone: '0912345678',
    email: 'ming@example.com',
    purchasedLessons: 5,
  }
  const registrations: Registration[] = [
    {
      id: 'registration-1',
      courseId: 'course-1',
      phone: '0912345678',
      status: 'attended',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'registration-2',
      courseId: 'course-2',
      phone: '0912345678',
      status: 'registered',
      createdAt: '2026-07-02T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    },
    {
      id: 'registration-3',
      courseId: 'course-3',
      phone: '0912345678',
      status: 'absent',
      createdAt: '2026-07-03T00:00:00.000Z',
      updatedAt: '2026-07-03T00:00:00.000Z',
    },
    {
      id: 'registration-4',
      courseId: 'course-4',
      phone: '0912345678',
      status: 'cancelled',
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    },
    {
      id: 'registration-5',
      courseId: 'course-5',
      phone: '0987654321',
      status: 'attended',
      createdAt: '2026-07-05T00:00:00.000Z',
      updatedAt: '2026-07-05T00:00:00.000Z',
    },
  ]

  // Act
  const remainingLessons = calculateRemainingLessons(student, registrations)

  // Assert
  expect(remainingLessons).toBe(4)
})

test('test_calculateRemainingLessons_when_attended_count_exceeds_purchased_lessons_then_returns_negative_balance', () => {
  // Arrange
  const student: Student = {
    name: '王小明',
    phone: '0912345678',
    email: 'ming@example.com',
    purchasedLessons: 1,
  }
  const registrations: Registration[] = [
    {
      id: 'registration-1',
      courseId: 'course-1',
      phone: '0912345678',
      status: 'attended',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'registration-2',
      courseId: 'course-2',
      phone: '0912345678',
      status: 'attended',
      createdAt: '2026-07-02T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    },
  ]

  // Act
  const remainingLessons = calculateRemainingLessons(student, registrations)

  // Assert
  expect(remainingLessons).toBe(-1)
})
