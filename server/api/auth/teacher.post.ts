import { createError, defineEventHandler, readBody, setCookie } from 'h3'
import { timingSafeEqual } from 'node:crypto'

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSignedSession } from '../../utils/session'

interface TeacherLoginBody {
  password?: unknown
}

export default defineEventHandler(async event => {
  const body = await readBody<TeacherLoginBody>(event)
  const password = typeof body?.password === 'string' ? body.password : ''
  const config = useRuntimeConfig(event)

  if (!config.teacherPassword) {
    throw createError({ statusCode: 500, statusMessage: 'Missing teacher password configuration' })
  }

  if (!hasMatchingPassword(password, config.teacherPassword)) {
    throw createError({ statusCode: 401, statusMessage: 'Teacher password is incorrect' })
  }

  const token = createSignedSession({
    role: 'teacher',
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  }, config.sessionSecret)
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return { role: 'teacher' }
})

function hasMatchingPassword(password: string, expectedPassword: string): boolean {
  const passwordBuffer = Buffer.from(password)
  const expectedPasswordBuffer = Buffer.from(expectedPassword)

  return passwordBuffer.length === expectedPasswordBuffer.length
    && timingSafeEqual(passwordBuffer, expectedPasswordBuffer)
}
