import { defineEventHandler } from 'h3'

import { getVerifiedSession } from '../utils/request-auth'

export default defineEventHandler(event => {
  const config = useRuntimeConfig(event)
  return { session: getVerifiedSession(event, config.sessionSecret) }
})
