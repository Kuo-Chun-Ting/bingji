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
  doPost(): TextOutputStub
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

test('test_doPost_when_called_then_returns_not_implemented_payload', async () => {
  // Arrange
  const context = await loadAppsScriptContext()

  // Act
  const output = context.doPost()

  // Assert
  expect(JSON.parse(output.content)).toEqual({
    ok: false,
    code: 'NOT_IMPLEMENTED',
  })
  expect(output.mimeType).toBe('application/json')
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
  }

  runInNewContext(source, context)
  return context as unknown as AppsScriptContext
}
