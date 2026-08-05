import type { Page } from '@playwright/test'

interface AppsScriptRequest {
  action: string
  payload: Record<string, unknown>
}

export type AppsScriptResponse =
  | { ok: true, result: unknown }
  | { ok: false, code: string }

export type AppsScriptHandler = (
  payload: Record<string, unknown>,
) => AppsScriptResponse | Promise<AppsScriptResponse>

export type AppsScriptHandlers = Record<string, AppsScriptHandler>

export function appsScriptSuccess(result: unknown): AppsScriptResponse {
  return { ok: true, result }
}

export function appsScriptFailure(code: string): AppsScriptResponse {
  return { ok: false, code }
}

export async function stubAppsScript(
  page: Page,
  handlers: AppsScriptHandlers,
): Promise<void> {
  await page.route('**/__test/apps-script', async (route) => {
    const request = parseRequest(route.request().postData())
    const handler = handlers[request.action]
    const response = handler
      ? await handler(request.payload)
      : appsScriptFailure('UNHANDLED_TEST_ACTION')

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

function parseRequest(body: string | null): AppsScriptRequest {
  const request = JSON.parse(body ?? '{}') as Partial<AppsScriptRequest>
  return {
    action: request.action ?? '',
    payload: request.payload ?? {},
  }
}
