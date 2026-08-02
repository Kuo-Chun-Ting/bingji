import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

interface TextOutputStub {
  content: string
  mimeType: string | null
  setMimeType(mimeType: string): TextOutputStub
}

interface AppsScriptContext {
  doGet(): TextOutputStub
  doPost(event: { postData: { contents: string } }): TextOutputStub
}

test('test_doGet_when_called_then_returns_ready_health_payload', async () => {
  // Arrange
  const context = await loadAppsScriptContext()

  // Act
  const output = context.doGet()

  // Assert
  expect(JSON.parse(output.content)).toEqual({
    ok: true,
    service: 'ski-registration-api',
    status: 'ready',
  })
  expect(output.mimeType).toBe('application/json')
})

test('test_doPost_when_action_succeeds_then_returns_action_result', async () => {
  // Arrange
  const context = await loadAppsScriptContext()
  const event = {
    postData: {
      contents: JSON.stringify({
        action: 'login',
        payload: { phone: '0912345678', password: 'test-password' },
      }),
    },
  }

  // Act
  const output = context.doPost(event)

  // Assert
  expect(JSON.parse(output.content)).toEqual({
    ok: true,
    result: {
      action: 'login',
      payload: { phone: '0912345678', password: 'test-password' },
    },
  })
  expect(output.mimeType).toBe('application/json')
})

test('test_doPost_when_action_throws_known_error_then_returns_error_code', async () => {
  // Arrange
  const context = await loadAppsScriptContext()
  const event = {
    postData: {
      contents: JSON.stringify({ action: 'forbidden', payload: {} }),
    },
  }

  // Act
  const output = context.doPost(event)

  // Assert
  expect(JSON.parse(output.content)).toEqual({
    ok: false,
    code: 'FORBIDDEN',
  })
  expect(output.mimeType).toBe('application/json')
})

test('test_doPost_when_teacher_credentials_are_invalid_then_returns_credentials_error', async () => {
  // Arrange
  const context = await loadAppsScriptContext()
  const event = {
    postData: {
      contents: JSON.stringify({ action: 'invalidCredentials', payload: {} }),
    },
  }

  // Act
  const output = context.doPost(event)

  // Assert
  expect(JSON.parse(output.content)).toEqual({
    ok: false,
    code: 'INVALID_CREDENTIALS',
  })
})

test('test_doPost_when_line_auth_throws_diagnostic_error_then_returns_diagnostic_code', async () => {
  // Arrange
  const context = await loadAppsScriptContext()
  const event = {
    postData: {
      contents: JSON.stringify({ action: 'lineFailure', payload: {} }),
    },
  }

  // Act
  const output = context.doPost(event)

  // Assert
  expect(JSON.parse(output.content)).toEqual({
    ok: false,
    code: 'LINE_TOKEN_EXCHANGE_FAILED:INVALID_GRANT',
  })
})

async function loadAppsScriptContext(): Promise<AppsScriptContext> {
  const source = await readFile('apps-script/Code.js', 'utf8')
  const context = {
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (content: string): TextOutputStub => ({
        content,
        mimeType: null,
        setMimeType(mimeType: string): TextOutputStub {
          this.mimeType = mimeType
          return this
        },
      }),
    },
    executeAction: (action: string, payload: Record<string, unknown>) => {
      if (action === 'forbidden') {
        throw new Error('FORBIDDEN')
      }
      if (action === 'lineFailure') {
        throw new Error('LINE_TOKEN_EXCHANGE_FAILED:INVALID_GRANT')
      }
      if (action === 'invalidCredentials') {
        throw new Error('INVALID_CREDENTIALS')
      }
      return { action, payload }
    },
  }

  runInNewContext(source, context)
  return context as unknown as AppsScriptContext
}
