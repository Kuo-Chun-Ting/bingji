import { expect, test } from 'vitest'

import {
  clearAppsScriptDiagnostics,
  getAppsScriptDiagnostics,
  recordAppsScriptDiagnostic,
  type AppsScriptDiagnosticStorage,
  type AppsScriptRequestDiagnostic,
} from '../../app/utils/request-diagnostics'

test('test_recordAppsScriptDiagnostic_when_more_than_twenty_records_then_keeps_latest_twenty', () => {
  // Arrange
  const storage = createStorage()

  // Act
  for (let index = 0; index < 22; index += 1) {
    recordAppsScriptDiagnostic(createDiagnostic(index), storage)
  }

  // Assert
  const diagnostics = getAppsScriptDiagnostics(storage)
  expect(diagnostics).toHaveLength(20)
  expect(diagnostics[0]?.recordedAt).toBe(21)
  expect(diagnostics[19]?.recordedAt).toBe(2)
})

test('test_getAppsScriptDiagnostics_when_storage_contains_invalid_json_then_returns_empty_list', () => {
  // Arrange
  const storage = createStorage('not-json')

  // Act
  const diagnostics = getAppsScriptDiagnostics(storage)

  // Assert
  expect(diagnostics).toEqual([])
})

test('test_clearAppsScriptDiagnostics_when_records_exist_then_removes_records', () => {
  // Arrange
  const storage = createStorage()
  recordAppsScriptDiagnostic(createDiagnostic(1), storage)

  // Act
  clearAppsScriptDiagnostics(storage)

  // Assert
  expect(getAppsScriptDiagnostics(storage)).toEqual([])
})

function createDiagnostic(recordedAt: number): AppsScriptRequestDiagnostic {
  return {
    recordedAt,
    action: 'getStudentDashboard',
    status: 'success',
    errorCode: null,
    httpStatus: 200,
    responseWaitMs: 100,
    parseMs: 5,
    totalMs: 105,
    backend: null,
  }
}

function createStorage(initialValue: string | null = null): AppsScriptDiagnosticStorage {
  let value = initialValue
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue
    },
    removeItem: () => {
      value = null
    },
  }
}
