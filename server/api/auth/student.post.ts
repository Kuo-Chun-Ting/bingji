import { createError, defineEventHandler, readBody, setCookie } from 'h3'

import { isValidNormalizedPhone, normalizePhone } from '../../domain/students'
import { loadGoogleSheetsStudents } from '../../repositories/google-sheets-students'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSignedSession } from '../../utils/session'

interface StudentLoginBody {
  phone?: unknown
}

export default defineEventHandler(async event => {
  const body = await readBody<StudentLoginBody>(event)
  const phone = typeof body?.phone === 'string' ? normalizePhone(body.phone) : ''
  if (!isValidNormalizedPhone(phone)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid phone is required' })
  }

  const config = useRuntimeConfig(event)
  const students = await loadGoogleSheetsStudents(config)
  const student = students.find(candidate => candidate.phone === phone)
  if (!student) {
    throw createError({ statusCode: 401, statusMessage: 'Student phone is not registered' })
  }

  const token = createSignedSession({
    role: 'student',
    phone: student.phone,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  }, config.sessionSecret)
  setSessionCookie(event, token)

  return { role: 'student', student }
})

function setSessionCookie(event: Parameters<typeof setCookie>[0], token: string): void {
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}
