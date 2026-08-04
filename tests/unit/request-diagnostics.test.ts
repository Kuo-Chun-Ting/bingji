import { expect, test } from 'vitest'

import {
  clearAppsScriptDiagnostics,
  formatDiagnosticDuration,
  getAppsScriptDiagnostics,
  getAppsScriptTimingBreakdown,
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

test('test_getAppsScriptTimingBreakdown_when_backend_diagnostics_exist_then_returns_nested_durations', () => {
  // Arrange
  const diagnostic = createDiagnostic(1)
  diagnostic.responseWaitMs = 3910
  diagnostic.parseMs = 0
  diagnostic.totalMs = 3910
  diagnostic.backend = {
    requestId: 'request-1',
    action: 'getStudentDashboard',
    status: 'success',
    errorCode: null,
    durationMs: 1676,
    phases: [
      { phase: 'loadStudents', durationMs: 512 },
      { phase: 'loadRegistrations', durationMs: 874 },
      { phase: 'loadCourses', durationMs: 260 },
    ],
  }

  // Act
  const breakdown = getAppsScriptTimingBreakdown(diagnostic)

  // Assert
  expect(breakdown).toEqual({
    totalMs: 3910,
    platformWaitMs: 2234,
    backendMs: 1676,
    backendOtherMs: 30,
    parseMs: 0,
  })
})

test('test_getAppsScriptTimingBreakdown_when_backend_diagnostics_are_missing_then_marks_unknown_durations', () => {
  // Arrange
  const diagnostic = createDiagnostic(1)

  // Act
  const breakdown = getAppsScriptTimingBreakdown(diagnostic)

  // Assert
  expect(breakdown).toEqual({
    totalMs: 105,
    platformWaitMs: null,
    backendMs: null,
    backendOtherMs: null,
    parseMs: 5,
  })
})

test('test_formatDiagnosticDuration_when_duration_crosses_one_second_then_uses_readable_units', () => {
  // Arrange
  const durations = [null, 0, 512, 1676]

  // Act
  const labels = durations.map(formatDiagnosticDuration)

  // Assert
  expect(labels).toEqual(['-', '0 ms', '512 ms', '1.68 秒'])
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
