import { expect, test } from 'vitest'

import type { Course } from '../../shared/types/domain'
import {
  formatCourseSchedule,
  getRegistrationStatusLabel,
  getRegistrationStatusTone,
} from '../../app/utils/course-presentation'

const course: Course = {
  id: '2026-08-09-am',
  date: '2026-08-09',
  startTime: '09:00',
  endTime: '11:00',
  isOpen: true,
}

test('test_getRegistrationStatusLabel_when_status_is_registered_then_returns_pending_label', () => {
  // Arrange
  const status = 'registered'

  // Act
  const label = getRegistrationStatusLabel(status)

  // Assert
  expect(label).toBe('已報名')
})

test('test_getRegistrationStatusTone_when_status_is_cancelled_then_returns_muted_tone', () => {
  // Arrange
  const status = 'cancelled'

  // Act
  const tone = getRegistrationStatusTone(status)

  // Assert
  expect(tone).toBe('muted')
})

test('test_formatCourseSchedule_when_course_is_on_sunday_then_returns_local_schedule', () => {
  // Arrange
  const expectedSchedule = '8月9日（週日）09:00-11:00'

  // Act
  const schedule = formatCourseSchedule(course)

  // Assert
  expect(schedule).toBe(expectedSchedule)
})
