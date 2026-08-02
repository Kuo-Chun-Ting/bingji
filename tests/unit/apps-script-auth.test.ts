import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

interface Session {
  phone?: string
  role: 'student' | 'teacher'
  expiresAt?: number
}

interface AuthContext {
  createSessionToken(session: Session, secret: string, now: number): string
  verifySessionToken(token: string, secret: string, now: number): Session
}

test('test_verifySessionToken_when_token_is_valid_then_returns_session', async () => {
  // Arrange
  const context = await loadAuthContext()
  const now = Date.UTC(2026, 7, 1)
  const token = context.createSessionToken?.(
    { phone: '0912345678', role: 'student' },
    'test-secret',
    now,
  ) ?? ''

  // Act
  const session = context.verifySessionToken?.(token, 'test-secret', now + 1_000)

  // Assert
  expect(session).toEqual({
    phone: '0912345678',
    role: 'student',
    expiresAt: now + 7 * 24 * 60 * 60 * 1_000,
  })
})

test('test_verifySessionToken_when_teacher_has_no_phone_then_returns_teacher_session', async () => {
  // Arrange
  const context = await loadAuthContext()
  const now = Date.UTC(2026, 7, 1)
  const token = context.createSessionToken?.({ role: 'teacher' }, 'test-secret', now) ?? ''

  // Act
  const session = context.verifySessionToken?.(token, 'test-secret', now + 1_000)

  // Assert
  expect(session).toEqual({
    role: 'teacher',
    expiresAt: now + 7 * 24 * 60 * 60 * 1_000,
  })
})

test('test_verifySessionToken_when_signature_is_tampered_then_throws_session_error', async () => {
  // Arrange
  const context = await loadAuthContext()
  const now = Date.UTC(2026, 7, 1)
  const token = context.createSessionToken?.(
    { phone: '0912345678', role: 'student' },
    'test-secret',
    now,
  ) ?? ''
  const tamperedToken = `${token.slice(0, -1)}x`

  // Act & Assert
  expect(() => context.verifySessionToken?.(tamperedToken, 'test-secret', now))
    .toThrow('INVALID_SESSION')
})

test('test_verifySessionToken_when_token_is_expired_then_throws_session_error', async () => {
  // Arrange
  const context = await loadAuthContext()
  const now = Date.UTC(2026, 7, 1)
  const token = context.createSessionToken?.(
    { phone: '0912345678', role: 'student' },
    'test-secret',
    now,
  ) ?? ''

  // Act & Assert
  expect(() => context.verifySessionToken?.(
    token,
    'test-secret',
    now + 7 * 24 * 60 * 60 * 1_000 + 1,
  )).toThrow('INVALID_SESSION')
})

async function loadAuthContext(): Promise<AuthContext> {
  let source = ''
  try {
    source = await readFile('apps-script/Auth.js', 'utf8')
  }
  catch {
    // The first TDD run intentionally loads an empty context.
  }

  const context = {
    normalizePhone: (phone: string): string => String(phone || '').replace(/\D/g, ''),
    Utilities: {
      base64EncodeWebSafe(value: string | number[]): string {
        return Buffer.from(typeof value === 'string' ? value : Uint8Array.from(value))
          .toString('base64url')
      },
      base64DecodeWebSafe(value: string): number[] {
        return Array.from(Buffer.from(value, 'base64url'))
      },
      computeHmacSha256Signature(value: string, secret: string): number[] {
        return Array.from(createHmac('sha256', secret).update(value).digest())
      },
      newBlob(value: number[]) {
        return {
          getDataAsString: (): string => Buffer.from(value).toString('utf8'),
        }
      },
    },
  }

  runInNewContext(source, context)
  return context as unknown as AuthContext
}
