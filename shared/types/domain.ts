export interface Student {
  name: string
  phone: string
  email: string
  purchasedLessons: number
}

export interface Course {
  id: string
  date: string
  startTime: string
  endTime: string
  isOpen: boolean
}

export type AttendanceResult = 'attended' | 'absent' | 'cancelled'
export type RegistrationStatus = 'registered' | AttendanceResult

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
