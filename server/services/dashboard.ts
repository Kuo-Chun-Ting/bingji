import type { Student } from '../../shared/types/domain'
import { calculateRemainingLessons } from '../domain/lessons'
import { normalizePhone } from '../domain/students'
import type { DatabaseFile } from '../repositories/json-database'

export interface StudentDashboard {
  student: Student
  remainingLessons: number
  courses: DatabaseFile['courses']
  registrations: DatabaseFile['registrations']
}

export interface TeacherDashboard {
  students: Student[]
  courses: DatabaseFile['courses']
  registrations: DatabaseFile['registrations']
  remainingLessons: Record<string, number>
}

export function createStudentDashboard(student: Student, database: DatabaseFile): StudentDashboard {
  const studentPhone = normalizePhone(student.phone)
  const registrations = database.registrations.filter(registration => {
    return normalizePhone(registration.phone) === studentPhone
  })

  return {
    student,
    remainingLessons: calculateRemainingLessons(student, database.registrations),
    courses: database.courses,
    registrations,
  }
}

export function createTeacherDashboard(students: Student[], database: DatabaseFile): TeacherDashboard {
  const remainingLessons = Object.fromEntries(students.map(student => {
    return [student.phone, calculateRemainingLessons(student, database.registrations)]
  }))

  return {
    students,
    courses: database.courses,
    registrations: database.registrations,
    remainingLessons,
  }
}
