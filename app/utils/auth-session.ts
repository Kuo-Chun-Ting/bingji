import type { UserRole } from '../../shared/types/domain'

export interface AuthSession {
  token: string
  role: UserRole
}

export interface AuthSessionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const sessionKey = 'ski_session'

export function getSession(storage: AuthSessionStorage): AuthSession | null {
  try {
    const session = JSON.parse(storage.getItem(sessionKey) ?? '')
    if (isAuthSession(session)) {
      return session
    }
  } catch {
    // Invalid persisted sessions are removed below.
  }

  clearSession(storage)
  return null
}

export function saveSession(session: AuthSession, storage: AuthSessionStorage): void {
  storage.setItem(sessionKey, JSON.stringify(session))
}

export function clearSession(storage: AuthSessionStorage): void {
  storage.removeItem(sessionKey)
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const session = value as Record<string, unknown>
  return typeof session.token === 'string'
    && (session.role === 'student' || session.role === 'teacher')
}
