import { mountSuspended } from '@nuxt/test-utils/runtime'
import { expect, test } from 'vitest'

import CourseCard from '../../app/components/CourseCard.vue'
import type { Course, Registration } from '../../shared/types/domain'

const course: Course = {
  id: 'course-1',
  date: '2026-08-09',
  startTime: '09:00',
  endTime: '11:00',
  isOpen: true,
}

const registration: Registration = {
  id: 'registration-1',
  courseId: course.id,
  phone: '0911709461',
  status: 'registered',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

test('test_CourseCard_when_course_is_available_then_emits_selected_course', async () => {
  // Arrange
  const wrapper = await mountSuspended(CourseCard, {
    props: { course, showRegistrationAction: true },
  })

  // Act
  await wrapper.get('button').trigger('click')

  // Assert
  expect(wrapper.get('button').text()).toBe('報名')
  expect(wrapper.emitted('register')).toEqual([[course]])
})

test('test_CourseCard_when_course_is_closed_then_disables_registration', async () => {
  // Arrange
  const wrapper = await mountSuspended(CourseCard, {
    props: {
      course: { ...course, isOpen: false },
      showRegistrationAction: true,
    },
  })

  // Assert
  const button = wrapper.get('button')
  expect(button.attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('已關閉')
})

test('test_CourseCard_when_registration_exists_then_disables_duplicate_registration', async () => {
  // Arrange
  const wrapper = await mountSuspended(CourseCard, {
    props: { course, registration, showRegistrationAction: true },
  })

  // Assert
  const button = wrapper.get('button')
  expect(button.attributes('disabled')).toBeDefined()
  expect(button.text()).toBe('已報名')
  expect(wrapper.get('.status-badge').text()).toBe('已報名')
})

test('test_CourseCard_when_registration_is_processing_then_disables_action', async () => {
  // Arrange
  const wrapper = await mountSuspended(CourseCard, {
    props: { course, isRegistering: true, showRegistrationAction: true },
  })

  // Assert
  const button = wrapper.get('button')
  expect(button.attributes('disabled')).toBeDefined()
  expect(button.text()).toBe('處理中')
})

test('test_CourseCard_when_registration_action_is_hidden_then_omits_button', async () => {
  // Arrange
  const wrapper = await mountSuspended(CourseCard, {
    props: { course, showRegistrationAction: false },
  })

  // Assert
  expect(wrapper.find('button').exists()).toBe(false)
  expect(wrapper.text()).toContain('報名中')
})
