import type { Student } from '../../shared/types/domain'
import { parseStudentRows } from '../domain/students'

export interface GoogleSheetsConfig {
  googleSheetsApiKey: string
  googleSpreadsheetId: string
  googleSheetRange: string
}

export interface GoogleSheetsFetcherResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

export type GoogleSheetsFetcher = (url: string) => Promise<GoogleSheetsFetcherResponse>

export async function loadGoogleSheetsStudents(
  config: GoogleSheetsConfig,
  fetcher: GoogleSheetsFetcher = fetch,
): Promise<Student[]> {
  assertGoogleSheetsConfig(config)

  const response = await fetcher(createGoogleSheetsUrl(config))
  if (!response.ok) {
    throw new Error(`Google Sheets request failed with status ${response.status}`)
  }

  const responseBody = await response.json()
  return parseStudentRows(getSheetValues(responseBody))
}

function assertGoogleSheetsConfig(config: GoogleSheetsConfig): void {
  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    throw new Error(`Missing Google Sheets configuration: ${missingKeys.join(', ')}`)
  }
}

function createGoogleSheetsUrl(config: GoogleSheetsConfig): string {
  const spreadsheetId = encodeURIComponent(config.googleSpreadsheetId)
  const sheetRange = encodeURIComponent(config.googleSheetRange)
  const apiKey = encodeURIComponent(config.googleSheetsApiKey)

  return `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetRange}?key=${apiKey}`
}

function getSheetValues(responseBody: unknown): unknown[][] {
  if (!responseBody || typeof responseBody !== 'object' || !Array.isArray((responseBody as { values?: unknown }).values)) {
    throw new Error('Google Sheets response does not contain values')
  }

  const values = (responseBody as { values: unknown[] }).values
  if (!values.every(Array.isArray)) {
    throw new Error('Google Sheets response values must be rows')
  }

  return values
}
