import { defineEventHandler } from 'h3'

import { loadGoogleSheetsStudents } from '../../repositories/google-sheets-students'
import { createJsonDatabase } from '../../repositories/json-database'
import { createTeacherDashboard } from '../../services/dashboard'
import { requireTeacherSession } from '../../utils/request-auth'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event)
  requireTeacherSession(event, config.sessionSecret)

  const [students, database] = await Promise.all([
    loadGoogleSheetsStudents(config),
    createJsonDatabase(config.dataFile).read(),
  ])

  return createTeacherDashboard(students, database)
})
