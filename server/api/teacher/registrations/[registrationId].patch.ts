import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'

import type { AttendanceResult } from '../../../../shared/types/domain'
import { changeRegistrationStatus } from '../../../../server/domain/registrations'
import { createJsonDatabase } from '../../../../server/repositories/json-database'
import { requireTeacherSession } from '../../../../server/utils/request-auth'

interface UpdateRegistrationBody {
  status?: unknown
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event)
  requireTeacherSession(event, config.sessionSecret)

  const registrationId = getRouterParam(event, 'registrationId')
  const body = await readBody<UpdateRegistrationBody>(event)
  if (!registrationId) {
    throw createError({ statusCode: 400, statusMessage: 'Registration ID is required' })
  }
  if (!isAttendanceResult(body?.status)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid attendance status is required' })
  }

  const jsonDatabase = createJsonDatabase(config.dataFile)
  const database = await jsonDatabase.read()
  const registration = database.registrations.find(candidate => candidate.id === registrationId)
  if (!registration) {
    throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
  }

  try {
    const updatedRegistration = changeRegistrationStatus(registration, body.status, new Date().toISOString())
    await jsonDatabase.write({
      ...database,
      registrations: database.registrations.map(candidate => {
        return candidate.id === registrationId ? updatedRegistration : candidate
      }),
    })

    return { registration: updatedRegistration }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Unable to update registration',
    })
  }
})

function isAttendanceResult(value: unknown): value is AttendanceResult {
  return value === 'attended' || value === 'absent' || value === 'cancelled'
}
