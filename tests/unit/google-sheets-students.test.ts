import { expect, test } from 'vitest'

import {
  loadGoogleSheetsStudents,
  type GoogleSheetsConfig,
  type GoogleSheetsFetcher,
} from '../../server/repositories/google-sheets-students'

const googleSheetsConfig: GoogleSheetsConfig = {
  googleSheetsApiKey: 'test-api-key',
  googleSpreadsheetId: 'spreadsheet-id',
  googleSheetRange: 'Sheet1!A:D',
}

test('test_loadGoogleSheetsStudents_when_response_contains_valid_rows_then_returns_parsed_students', async () => {
  // Arrange
  const stub_fetcher: GoogleSheetsFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      values: [
        ['姓名', '電話', 'Email', '購買堂數'],
        ['王小明', '0912-345-678', 'ming@example.com', '8'],
      ],
    }),
  })

  // Act
  const students = await loadGoogleSheetsStudents(googleSheetsConfig, stub_fetcher)

  // Assert
  expect(students).toEqual([
    {
      name: '王小明',
      phone: '0912345678',
      email: 'ming@example.com',
      purchasedLessons: 8,
    },
  ])
})

test('test_loadGoogleSheetsStudents_when_api_key_is_missing_then_throws_configuration_error', async () => {
  // Arrange
  const missingApiKeyConfig = { ...googleSheetsConfig, googleSheetsApiKey: '' }
  const stub_fetcher: GoogleSheetsFetcher = async () => {
    throw new Error('Fetcher must not be called')
  }

  // Act & Assert
  await expect(loadGoogleSheetsStudents(missingApiKeyConfig, stub_fetcher))
    .rejects.toThrow('Missing Google Sheets configuration: googleSheetsApiKey')
})
