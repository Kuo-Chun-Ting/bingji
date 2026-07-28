import type { Registration, Student } from '../../shared/types/domain'
import { normalizePhone } from './students'

export function calculateRemainingLessons(student: Student, registrations: Registration[]): number {
  const attendedLessons = registrations.filter(registration => {
    return registration.status === 'attended'
      && normalizePhone(registration.phone) === normalizePhone(student.phone)
  }).length

  return student.purchasedLessons - attendedLessons
}
