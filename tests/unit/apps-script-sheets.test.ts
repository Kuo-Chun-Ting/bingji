import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import { expect, test } from 'vitest'

interface SheetContext {
  getAppConfiguration(): {
    spreadsheetId: string
    teacherCredentials: { username: string, password: string }
    sessionSecret: string
    lineLogin: { channelId: string, channelSecret: string, redirectUri: string }
  }
  loadStudents(): unknown[]
  loadAccounts(): unknown[]
  loadCourses(): unknown[]
  loadRegistrations(): unknown[]
  appendRegistration(registration: Record<string, string>): void
  replaceRegistration(registration: Record<string, string>): void
}

interface SheetState {
  configurationReads: number
  spreadsheetOpenIds: string[]
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
    spreadsheetId: 'single-spreadsheet',
    teacherCredentials: {
      username: 'coach',
      password: 'shared-password',
    },
    sessionSecret: 'session-secret',
    lineLogin: {
      channelId: '2010930267',
      channelSecret: 'channel-secret',
      redirectUri: 'https://bingji-delta.vercel.app/auth/line-callback',
    },
  })
})

test('test_loadStudents_when_form_response_sheet_has_rows_then_returns_students', async () => {
  // Arrange
  const { context } = await loadSheetsContext()

  // Act
  const students = context.loadStudents?.()

  // Assert
  expect(students).toEqual([{
    name: '陳小華',
    phone: '0987654321',
    email: 'another@example.com',
    purchasedLessons: 2,
  }])
})

test('test_loadStudents_when_form_response_sheet_has_only_headers_then_returns_empty_list', async () => {
  // Arrange
  const spreadsheetRows = {
    '表單回覆 1': [['時間戳記', '姓名', '電話', 'Email', '購買堂數']],
  }
  const { context } = await loadSheetsContext(spreadsheetRows)

  // Act
  const students = context.loadStudents?.()

  // Assert
  expect(students).toEqual([])
})

test('test_loadStudents_when_other_sheets_have_matching_headers_then_reads_named_form_response_sheet', async () => {
  // Arrange
  const spreadsheetRows = {
    accounts: [
      ['姓名', '電話', 'Email', '購買堂數'],
      ['王小明', '0912-345-678', 'manual@example.com', '4'],
    ],
    '表單回覆 1': [
      ['時間戳記', '姓名', '電話', 'Email', '購買堂數'],
      ['2026/08/03 上午 10:00:00', '陳小華', '0987-654-321', 'another@example.com', '2'],
    ],
    notes: [['備註', '內容'], ['測試', '不應讀取']],
  }
  const { context } = await loadSheetsContext(spreadsheetRows)

  // Act
  const students = context.loadStudents?.()

  // Assert
  expect(students).toEqual([{
    name: '陳小華',
    phone: '0987654321',
    email: 'another@example.com',
    purchasedLessons: 2,
  }])
})

test('test_loadAllData_when_using_one_spreadsheet_then_reads_configuration_and_opens_spreadsheet_once', async () => {
  // Arrange
  const { context, state } = await loadSheetsContext()

  // Act
  context.loadStudents?.()
  context.loadAccounts?.()
  context.loadCourses?.()
  context.loadRegistrations?.()

  // Assert
  expect(state.configurationReads).toBe(1)
  expect(state.spreadsheetOpenIds).toEqual(['single-spreadsheet'])
})

test('test_loadAccounts_when_sheet_has_rows_then_returns_accounts', async () => {
  // Arrange
  const { context } = await loadSheetsContext()

  // Act
  const accounts = context.loadAccounts?.()

  // Assert
  expect(accounts).toEqual([{ phone: '0912345678', lineUserId: 'student-line-user-id' }])
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

async function loadSheetsContext(spreadsheetRows?: Record<string, unknown[][]>): Promise<{ context: SheetContext, state: SheetState }> {
  const domainSource = await readFile('apps-script/Domain.js', 'utf8')
  let sheetsSource = ''
  try {
    sheetsSource = await readFile('apps-script/Sheets.js', 'utf8')
  }
  catch {
    // The first TDD run intentionally loads an empty context.
  }

  const state: SheetState = {
    configurationReads: 0,
    spreadsheetOpenIds: [],
    writeOperations: [],
    replacedRanges: [],
  }
  const formResponseRows = [
    ['時間戳記', '姓名', '電話', 'Email', '購買堂數'],
    ['2026/08/03 上午 10:00:00', '陳小華', '0987-654-321', 'another@example.com', '2'],
  ]
  const operationsRows: Record<string, unknown[][]> = {
    accounts: [
      ['phone', 'lineUserId'],
      ['0912-345-678', 'student-line-user-id'],
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

  const allRows = {
    '表單回覆 1': formResponseRows,
    ...operationsRows,
    ...spreadsheetRows,
  }
  const mockSheets = Object.fromEntries(
    Object.entries(allRows).map(([name, rows]) => [name, createMockSheet(rows)]),
  )
  const context = {
    Utilities: {
      getUuid: (): string => 'registration-2',
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => {
          state.configurationReads += 1
          return {
            SPREADSHEET_ID: 'single-spreadsheet',
            ADMIN_ACCOUNT: 'coach',
            ADMIN_PASSWORD: 'shared-password',
            SESSION_SECRET: 'session-secret',
            LINE_CHANNEL_ID: '2010930267',
            LINE_CHANNEL_SECRET: 'channel-secret',
            LINE_REDIRECT_URI: 'https://bingji-delta.vercel.app/auth/line-callback',
          }
        },
      }),
    },
    SpreadsheetApp: {
      openById: (spreadsheetId: string) => {
        state.spreadsheetOpenIds.push(spreadsheetId)
        return {
          getSheetByName: (name: string) => mockSheets[name],
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
