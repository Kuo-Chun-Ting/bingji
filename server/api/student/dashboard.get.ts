import { createError, defineEventHandler } from 'h3'

import { loadGoogleSheetsStudents } from '../../repositories/google-sheets-students'
import { createJsonDatabase } from '../../repositories/json-database'
import { createStudentDashboard } from '../../services/dashboard'
import { requireStudentSession } from '../../utils/request-auth'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event)
  const session = requireStudentSession(event, config.sessionSecret)
  const students = await loadGoogleSheetsStudents(config)
  const student = students.find(candidate => candidate.phone === session.phone)
  if (!student) {
    throw createError({ statusCode: 401, statusMessage: 'Student phone is not registered' })
  }

  const database = await createJsonDatabase(config.dataFile).read()
  return createStudentDashboard(student, database)
})
