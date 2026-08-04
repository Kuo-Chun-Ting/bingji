export const APPS_SCRIPT_DIAGNOSTICS_STORAGE_KEY = 'bingji.appsScriptDiagnostics'

const MAX_DIAGNOSTIC_RECORDS = 20

export interface AppsScriptBackendPhase {
  phase: string
  durationMs: number
}

export interface AppsScriptBackendDiagnostics {
  requestId: string
  action: string
  status: 'success' | 'error'
  errorCode: string | null
  durationMs: number
  phases: AppsScriptBackendPhase[]
}

export type AppsScriptRequestStatus =
  | 'success'
  | 'api_error'
  | 'network_error'
  | 'invalid_response'

export interface AppsScriptRequestDiagnostic {
  recordedAt: number
  action: string
  status: AppsScriptRequestStatus
  errorCode: string | null
  httpStatus: number | null
  responseWaitMs: number | null
  parseMs: number | null
  totalMs: number
  backend: AppsScriptBackendDiagnostics | null
}

export interface AppsScriptDiagnosticStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function recordAppsScriptDiagnostic(
  diagnostic: AppsScriptRequestDiagnostic,
  storage: AppsScriptDiagnosticStorage | null = getBrowserStorage(),
): void {
  if (!storage) {
    return
  }

  try {
    const records = getAppsScriptDiagnostics(storage)
    storage.setItem(
      APPS_SCRIPT_DIAGNOSTICS_STORAGE_KEY,
      JSON.stringify([diagnostic, ...records].slice(0, MAX_DIAGNOSTIC_RECORDS)),
    )
  }
  catch {
    // Diagnostics must never interrupt the user request.
  }
}

export function getAppsScriptDiagnostics(
  storage: AppsScriptDiagnosticStorage | null = getBrowserStorage(),
): AppsScriptRequestDiagnostic[] {
  if (!storage) {
    return []
  }

  try {
    const value = storage.getItem(APPS_SCRIPT_DIAGNOSTICS_STORAGE_KEY)
    if (!value) {
      return []
    }
    const records = JSON.parse(value)
    return Array.isArray(records) ? records : []
  }
  catch {
    return []
  }
}

export function clearAppsScriptDiagnostics(
  storage: AppsScriptDiagnosticStorage | null = getBrowserStorage(),
): void {
  storage?.removeItem(APPS_SCRIPT_DIAGNOSTICS_STORAGE_KEY)
}

function getBrowserStorage(): AppsScriptDiagnosticStorage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}
