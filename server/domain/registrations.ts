import type { AttendanceResult, Course, Registration } from '../../shared/types/domain'
import { normalizePhone } from './students'

export function createRegistration(
  course: Course,
  phone: string,
  registrations: Registration[],
  now: string,
): Registration {
  if (!course.isOpen) {
    throw new Error('Course is closed')
  }

  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone) {
    throw new Error('Phone is required')
  }

  if (!/^09\d{8}$/.test(normalizedPhone)) {
    throw new Error('Invalid Taiwanese mobile phone')
  }

  const isDuplicate = registrations.some(registration => {
    return registration.courseId === course.id && normalizePhone(registration.phone) === normalizedPhone
  })

  if (isDuplicate) {
    throw new Error('Student is already registered for this course')
  }

  return {
    id: `${course.id}:${normalizedPhone}`,
    courseId: course.id,
    phone: normalizedPhone,
    status: 'registered',
    createdAt: now,
    updatedAt: now,
  }
}

export function changeRegistrationStatus(
  registration: Registration,
  status: AttendanceResult,
  now: string,
): Registration {
  if (registration.status !== 'registered') {
    throw new Error('Only registered records can change status')
  }

  return { ...registration, status, updatedAt: now }
}
