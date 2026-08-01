import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

interface SheetContext {
  getAppConfiguration(): {
    sourceSpreadsheetId: string
    operationsSpreadsheetId: string
    teacherCredentials: { phone: string, password: string }
    sessionSecret: string
  }
  loadStudents(): unknown[]
  loadAccounts(): unknown[]
  loadCourses(): unknown[]
  loadRegistrations(): unknown[]
  appendRegistration(registration: Record<string, string>): void
  replaceRegistration(registration: Record<string, string>): void
}

interface SheetState {
  writeOperations: Array<{ type: 'format' | 'values', row: number }>
  replacedRanges: Array<{ row: number, values: unknown[][] }>
}

test('test_getAppConfiguration_when_properties_exist_then_returns_configuration', async () => {
  // Arrange
  const { context } = await loadSheetsContext()

  // Act
  const configuration = context.getAppConfiguration?.()

  // Assert
  expect(configuration).toEqual({
    sourceSpreadsheetId: 'source-spreadsheet',
    operationsSpreadsheetId: 'operations-spreadsheet',
    teacherCredentials: {
      phone: '0988222222',
      password: 'teacher-password',
    },
    sessionSecret: 'session-secret',
  })
})

test('test_loadStudents_when_source_sheet_has_rows_then_returns_students', async () => {
  // Arrange
  const { context } = await loadSheetsContext()

  // Act
  const students = context.loadStudents?.()

  // Assert
  expect(students).toEqual([{
    name: '王小明',
    phone: '0912345678',
    email: 'student@example.com',
    purchasedLessons: 4,
  }])
})

test('test_loadAccounts_when_sheet_has_rows_then_returns_accounts', async () => {
  // Arrange
  const { context } = await loadSheetsContext()

  // Act
  const accounts = context.loadAccounts?.()

  // Assert
  expect(accounts).toEqual([{ phone: '0912345678', password: 'student-password' }])
})

test('test_loadCourses_when_sheet_has_rows_then_returns_courses', async () => {
  // Arrange
  const { context } = await loadSheetsContext()

  // Act
  const courses = context.loadCourses?.()

  // Assert
  expect(courses).toEqual([{
    id: 'course-1',
    date: '2026-08-09',
    startTime: '09:00',
    endTime: '11:00',
    isOpen: true,
  }])
})

test('test_loadRegistrations_when_sheet_has_rows_then_returns_registrations', async () => {
  // Arrange
  const { context } = await loadSheetsContext()

  // Act
  const registrations = context.loadRegistrations?.()

  // Assert
  expect(registrations).toEqual([{
    id: 'registration-1',
    courseId: 'course-1',
    phone: '0912345678',
    status: 'registered',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }])
})

test('test_appendRegistration_when_phone_has_leading_zero_then_formats_row_before_writing', async () => {
  // Arrange
  const { context, state } = await loadSheetsContext()
  const registration = {
    id: 'registration-2',
    courseId: 'course-2',
    phone: '0912345678',
    status: 'registered',
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  }

  // Act
  context.appendRegistration?.(registration)

  // Assert
  expect(state.writeOperations).toEqual([
    { type: 'format', row: 3 },
    { type: 'values', row: 3 },
  ])
  expect(state.replacedRanges).toEqual([{
    row: 3,
    values: [[
      'registration-2',
      'course-2',
      '0912345678',
      'registered',
      '2026-08-02T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
    ]],
  }])
})

test('test_replaceRegistration_when_id_exists_then_replaces_matching_row', async () => {
  // Arrange
  const { context, state } = await loadSheetsContext()
  const registration = {
    id: 'registration-1',
    courseId: 'course-1',
    phone: '0912345678',
    status: 'attended',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-09T03:00:00.000Z',
  }

  // Act
  context.replaceRegistration?.(registration)

  // Assert
  expect(state.replacedRanges).toEqual([{
    row: 2,
    values: [[
      'registration-1',
      'course-1',
      '0912345678',
      'attended',
      '2026-08-01T00:00:00.000Z',
      '2026-08-09T03:00:00.000Z',
    ]],
  }])
})

async function loadSheetsContext(): Promise<{ context: SheetContext, state: SheetState }> {
  const domainSource = await readFile('apps-script/Domain.js', 'utf8')
  let sheetsSource = ''
  try {
    sheetsSource = await readFile('apps-script/Sheets.js', 'utf8')
  }
  catch {
    // The first TDD run intentionally loads an empty context.
  }

  const state: SheetState = {
    writeOperations: [],
    replacedRanges: [],
  }
  const sourceRows = [
    ['姓名', '電話', 'Email', '購買堂數'],
    ['王小明', '0912-345-678', 'student@example.com', '4'],
  ]
  const operationsRows: Record<string, unknown[][]> = {
    accounts: [
      ['phone', 'password'],
      ['0912-345-678', 'student-password'],
    ],
    courses: [
      ['id', 'date', 'startTime', 'endTime', 'isOpen'],
      ['course-1', '2026-08-09', '09:00', '11:00', 'TRUE'],
    ],
    registrations: [
      ['id', 'courseId', 'phone', 'status', 'createdAt', 'updatedAt'],
      ['registration-1', 'course-1', '0912-345-678', 'registered', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'],
    ],
  }

  const createMockSheet = (rows: unknown[][]) => ({
    getDataRange: () => ({
      getDisplayValues: () => rows,
    }),
    getLastRow: () => rows.length,
    getRange: (row: number) => ({
      setNumberFormat: () => {
        state.writeOperations.push({ type: 'format', row })
        return {
          setValues: (values: unknown[][]) => {
            state.writeOperations.push({ type: 'values', row })
            state.replacedRanges.push({ row, values })
          },
        }
      },
      setValues: (values: unknown[][]) => {
        state.writeOperations.push({ type: 'values', row })
        state.replacedRanges.push({ row, values })
      },
    }),
  })

  const mock_sourceSheet = createMockSheet(sourceRows)
  const mock_operationsSheets = Object.fromEntries(
    Object.entries(operationsRows).map(([name, rows]) => [name, createMockSheet(rows)]),
  )
  const context = {
    Utilities: {
      getUuid: (): string => 'registration-2',
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({
          SOURCE_SPREADSHEET_ID: 'source-spreadsheet',
          OPERATIONS_SPREADSHEET_ID: 'operations-spreadsheet',
          TEACHER_PHONE: '0988222222',
          TEACHER_PASSWORD: 'teacher-password',
          SESSION_SECRET: 'session-secret',
        }),
      }),
    },
    SpreadsheetApp: {
      openById: (spreadsheetId: string) => {
        if (spreadsheetId === 'source-spreadsheet') {
          return { getSheets: () => [mock_sourceSheet] }
        }
        return {
          getSheetByName: (name: string) => mock_operationsSheets[name],
        }
      },
    },
  }

  runInNewContext(`${domainSource}\n${sheetsSource}`, context)
  return {
    context: context as unknown as SheetContext,
    state,
  }
}
