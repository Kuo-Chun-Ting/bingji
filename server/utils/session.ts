import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE_NAME = 'ski_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type SessionRole = 'student' | 'teacher'

export interface SignedSession {
  role: SessionRole
  phone?: string
  expiresAt: number
}

export function createSignedSession(session: SignedSession, secret: string): string {
  assertSessionSecret(secret)
  assertSessionPayload(session)

  const encodedPayload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = signPayload(encodedPayload, secret)

  return `${encodedPayload}.${signature}`
}

export function verifySignedSession(
  token: string,
  secret: string,
  now: number = Date.now(),
): SignedSession | null {
  assertSessionSecret(secret)

  const [encodedPayload, signature, extraPart] = token.split('.')
  if (!encodedPayload || !signature || extraPart) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload, secret)
  if (!hasMatchingSignature(signature, expectedSignature)) {
    return null
  }

  const session = parseSessionPayload(encodedPayload)
  if (!session || session.expiresAt <= now) {
    return null
  }

  return session
}

function assertSessionSecret(secret: string): void {
  if (!secret) {
    throw new Error('Missing session secret configuration')
  }
}

function assertSessionPayload(session: SignedSession): void {
  if (!isSessionRole(session.role) || !Number.isInteger(session.expiresAt)) {
    throw new Error('Invalid session payload')
  }

  if (session.role === 'student' && !session.phone) {
    throw new Error('Student session requires a phone')
  }
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

function hasMatchingSignature(signature: string, expectedSignature: string): boolean {
  const signatureBuffer = Buffer.from(signature)
  const expectedSignatureBuffer = Buffer.from(expectedSignature)

  return signatureBuffer.length === expectedSignatureBuffer.length
    && timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
}

function parseSessionPayload(encodedPayload: string): SignedSession | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (!isSignedSession(value)) {
      return null
    }

    return value
  } catch {
    return null
  }
}

function isSignedSession(value: unknown): value is SignedSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const session = value as Record<string, unknown>
  return isSessionRole(session.role)
    && Number.isInteger(session.expiresAt)
    && (session.role !== 'student' || (typeof session.phone === 'string' && session.phone.length > 0))
}

function isSessionRole(value: unknown): value is SessionRole {
  return value === 'student' || value === 'teacher'
}
