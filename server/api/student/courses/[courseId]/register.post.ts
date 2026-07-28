import { createError, defineEventHandler, getRouterParam } from 'h3'

import { createRegistration } from '../../../../domain/registrations'
import { createJsonDatabase } from '../../../../repositories/json-database'
import { requireStudentSession } from '../../../../utils/request-auth'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event)
  const session = requireStudentSession(event, config.sessionSecret)
  const courseId = getRouterParam(event, 'courseId')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'Course ID is required' })
  }

  const jsonDatabase = createJsonDatabase(config.dataFile)
  const database = await jsonDatabase.read()
  const course = database.courses.find(candidate => candidate.id === courseId)
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Course not found' })
  }

  try {
    const registration = createRegistration(course, session.phone, database.registrations, new Date().toISOString())
    await jsonDatabase.write({
      ...database,
      registrations: [...database.registrations, registration],
    })

    return { registration }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Unable to register for this course',
    })
  }
})
