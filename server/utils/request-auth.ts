import { createError, getCookie, type H3Event } from 'h3'

import {
  SESSION_COOKIE_NAME,
  type SignedSession,
  verifySignedSession,
} from './session'

export function getVerifiedSession(event: H3Event, sessionSecret: string): SignedSession | null {
  const token = getCookie(event, SESSION_COOKIE_NAME)
  return token ? verifySignedSession(token, sessionSecret) : null
}

export function requireStudentSession(event: H3Event, sessionSecret: string): SignedSession & { role: 'student', phone: string } {
  const session = getVerifiedSession(event, sessionSecret)
  if (session?.role !== 'student' || !session.phone) {
    throw createError({ statusCode: 401, statusMessage: 'Student authentication required' })
  }

  return session as SignedSession & { role: 'student', phone: string }
}

export function requireTeacherSession(event: H3Event, sessionSecret: string): SignedSession & { role: 'teacher' } {
  const session = getVerifiedSession(event, sessionSecret)
  if (session?.role !== 'teacher') {
    throw createError({ statusCode: 401, statusMessage: 'Teacher authentication required' })
  }

  return session as SignedSession & { role: 'teacher' }
}
