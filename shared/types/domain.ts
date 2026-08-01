export interface Student {
  name: string
  phone: string
  email: string
  purchasedLessons: number
}

export type UserRole = 'student' | 'teacher'

export interface LoginResult {
  token: string
  role: UserRole
}

export interface Course {
  id: string
  date: string
  startTime: string
  endTime: string
  isOpen: boolean
}

export const REGISTRATION_STATUS = {
  REGISTERED: 'registered',
  ATTENDED: 'attended',
  ABSENT: 'absent',
  CANCELLED: 'cancelled',
} as const

export type RegistrationStatus = typeof REGISTRATION_STATUS[keyof typeof REGISTRATION_STATUS]
export type AttendanceResult = Exclude<RegistrationStatus, typeof REGISTRATION_STATUS.REGISTERED>

export interface Registration {
  id: string
  courseId: string
  phone: string
  status: RegistrationStatus
  createdAt: string
  updatedAt: string
}

export interface StudentDashboard {
  student: Student
  remainingLessons: number
  courses: Course[]
  registrations: Registration[]
}

export interface TeacherDashboard {
  students: Student[]
  courses: Course[]
  registrations: Registration[]
  remainingLessons: Record<string, number>
}
