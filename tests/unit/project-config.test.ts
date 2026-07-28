import { readFile } from 'node:fs/promises'
import { test, expect } from 'vitest'

test('test_runtime_config_when_loaded_then_private_keys_are_declared', async () => {
  // Arrange
  const source = await readFile('nuxt.config.ts', 'utf8')

  // Act
  const requiredKeys = ['googleSheetsApiKey', 'teacherPassword', 'sessionSecret']

  // Assert
  expect(requiredKeys.every(key => source.includes(key))).toBe(true)
})
