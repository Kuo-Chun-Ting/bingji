import { REGISTRATION_STATUS, type Course, type RegistrationStatus } from '../../shared/types/domain'

export type RegistrationStatusTone = 'info' | 'success' | 'warning' | 'muted'

const statusLabels: Record<RegistrationStatus, string> = {
  [REGISTRATION_STATUS.REGISTERED]: '已報名',
  [REGISTRATION_STATUS.ATTENDED]: '已到課',
  [REGISTRATION_STATUS.ABSENT]: '未到課',
  [REGISTRATION_STATUS.CANCELLED]: '已取消',
}

const statusTones: Record<RegistrationStatus, RegistrationStatusTone> = {
  [REGISTRATION_STATUS.REGISTERED]: 'info',
  [REGISTRATION_STATUS.ATTENDED]: 'success',
  [REGISTRATION_STATUS.ABSENT]: 'warning',
  [REGISTRATION_STATUS.CANCELLED]: 'muted',
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

export function getRegistrationStatusLabel(status: RegistrationStatus): string {
  return statusLabels[status]
}

export function getRegistrationStatusTone(status: RegistrationStatus): RegistrationStatusTone {
  return statusTones[status]
}

export function formatCourseSchedule(course: Course): string {
  const date = new Date(`${course.date}T12:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日（週${weekdays[date.getDay()]}）${course.startTime}-${course.endTime}`
}
