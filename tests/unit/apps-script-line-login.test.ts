import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

interface LineLoginContext {
  exchangeLineAuthorizationCode(
    code: string,
    nonce: string,
    configuration: { channelId: string, channelSecret: string, redirectUri: string },
    fetcher: (url: string, options: Record<string, unknown>) => { getContentText(): string },
  ): string
  createBindingToken(lineUserId: string, secret: string, now: number): string
  verifyBindingToken(token: string, secret: string, now: number): { lineUserId: string }
  resolveLineSession(
    lineUserId: string,
    teacherIdentity: { phone: string, lineUserId: string },
    accounts: Array<{ phone: string, lineUserId: string }>,
  ): { phone: string, role: 'student' | 'teacher' } | null
}

test('test_exchangeLineAuthorizationCode_when_line_responses_are_valid_then_returns_line_user_id', async () => {
  // Arrange
  const context = await loadLineLoginContext()
  const requests: Array<{ url: string, options: Record<string, unknown> }> = []
  const stub_fetcher = (url: string, options: Record<string, unknown>) => {
    requests.push({ url, options })
    return {
      getContentText: () => JSON.stringify(
        requests.length === 1 ? { id_token: 'line-id-token' } : { sub: 'line-user-id' },
      ),
    }
  }

  // Act
  const lineUserId = context.exchangeLineAuthorizationCode(
    'authorization-code',
    'nonce-value',
    {
      channelId: '2010930267',
      channelSecret: 'channel-secret',
      redirectUri: 'https://bingji-delta.vercel.app/auth/line-callback',
    },
    stub_fetcher,
  )

  // Assert
  expect(lineUserId).toBe('line-user-id')
  expect(requests).toEqual([
    {
      url: 'https://api.line.me/oauth2/v2.1/token',
      options: {
        method: 'post',
        payload: {
          grant_type: 'authorization_code',
          code: 'authorization-code',
          redirect_uri: 'https://bingji-delta.vercel.app/auth/line-callback',
          client_id: '2010930267',
          client_secret: 'channel-secret',
        },
        muteHttpExceptions: true,
      },
    },
    {
      url: 'https://api.line.me/oauth2/v2.1/verify',
      options: {
        method: 'post',
        payload: {
          id_token: 'line-id-token',
          client_id: '2010930267',
          nonce: 'nonce-value',
        },
        muteHttpExceptions: true,
      },
    },
  ])
})

test('test_resolveLineSession_when_student_account_is_linked_then_returns_student_session', async () => {
  // Arrange
  const context = await loadLineLoginContext()

  // Act
  const session = context.resolveLineSession(
    'student-line-user-id',
    { phone: '0988222222', lineUserId: 'teacher-line-user-id' },
    [{ phone: '0912345678', lineUserId: 'student-line-user-id' }],
  )

  // Assert
  expect(session).toEqual({ phone: '0912345678', role: 'student' })
})

test('test_resolveLineSession_when_account_is_not_linked_then_returns_null', async () => {
  // Arrange
  const context = await loadLineLoginContext()

  // Act
  const session = context.resolveLineSession(
    'unknown-line-user-id',
    { phone: '0988222222', lineUserId: '' },
    [],
  )

  // Assert
  expect(session).toBeNull()
})

test('test_verifyBindingToken_when_token_is_valid_then_returns_line_identity', async () => {
  // Arrange
  const context = await loadLineLoginContext()
  const now = Date.UTC(2026, 7, 2)
  const token = context.createBindingToken('line-user-id', 'session-secret', now)

  // Act
  const identity = context.verifyBindingToken(token, 'session-secret', now + 1_000)

  // Assert
  expect(identity).toEqual({
    lineUserId: 'line-user-id',
    expiresAt: now + 10 * 60 * 1_000,
  })
})

async function loadLineLoginContext(): Promise<LineLoginContext> {
  const authSource = await readFile('apps-script/Auth.js', 'utf8')
  let lineLoginSource = ''
  try {
    lineLoginSource = await readFile('apps-script/LineLogin.js', 'utf8')
  }
  catch {
    // The first TDD run intentionally loads an empty context.
  }

  const context = {
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
        return { getDataAsString: (): string => Buffer.from(value).toString('utf8') }
      },
    },
  }

  runInNewContext(`${authSource}\n${lineLoginSource}`, context)
  return context as unknown as LineLoginContext
}
