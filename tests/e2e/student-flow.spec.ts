import { expect, test, type Page } from '@playwright/test'

import type { Registration, StudentDashboard } from '../../shared/types/domain'
import {
  appsScriptFailure,
  appsScriptSuccess,
  stubAppsScript,
} from './support/apps-script-stub'

const dashboard: StudentDashboard = {
  student: {
    name: 'Lillard',
    phone: '0911709461',
    email: 'd7018600@gmail.com',
    purchasedLessons: 3,
  },
  remainingLessons: 3,
  courses: [{
    id: 'course-1',
    date: '2026-08-09',
    startTime: '09:00',
    endTime: '11:00',
    isOpen: true,
  }],
  registrations: [],
}

const registration: Registration = {
  id: 'registration-1',
  courseId: 'course-1',
  phone: '0911709461',
  status: 'registered',
  createdAt: '2026-08-06T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
}

test('test_studentLineLogin_when_callback_succeeds_then_opens_dashboard', async ({ page }) => {
  // Arrange
  await stubAppsScript(page, {
    loginWithLine: payload => payload.code === 'authorization-code'
      && payload.nonce === 'test-nonce'
      ? appsScriptSuccess({ token: 'student-token', role: 'student' })
      : appsScriptFailure('INVALID_LINE_TOKEN'),
    getStudentDashboard: () => appsScriptSuccess(dashboard),
  })
  await prepareLineLoginAttempt(page)

  // Act
  await page.goto('/auth/line-callback?code=authorization-code&state=test-state')

  // Assert
  await expect(page).toHaveURL(/\/student$/)
  await expect(page.getByRole('heading', { name: 'Lillard' })).toBeVisible()
  await expect(page.getByLabel('剩餘堂數')).toContainText('3 堂')
})

test('test_studentDashboard_when_course_is_available_then_registers_course', async ({ page }) => {
  // Arrange
  await page.addInitScript(() => {
    window.localStorage.setItem('ski_session', JSON.stringify({
      token: 'student-token',
      role: 'student',
    }))
  })
  await stubAppsScript(page, {
    getStudentDashboard: () => appsScriptSuccess(dashboard),
    registerCourse: payload => payload.courseId === 'course-1'
      ? appsScriptSuccess({ registration })
      : appsScriptFailure('COURSE_NOT_FOUND'),
  })
  await page.goto('/student')

  // Act
  await page.getByRole('button', { name: '報名' }).click()

  // Assert
  await expect(page.getByRole('button', { name: '報名' })).toHaveCount(0)
  await expect(page.getByText('已報名')).toBeVisible()
})

test('test_studentDashboard_when_session_is_invalid_then_returns_to_login', async ({ page }) => {
  // Arrange
  await page.addInitScript(() => {
    window.localStorage.setItem('ski_session', JSON.stringify({
      token: 'expired-token',
      role: 'student',
    }))
  })
  await stubAppsScript(page, {
    getStudentDashboard: () => appsScriptFailure('INVALID_SESSION'),
  })

  // Act
  await page.goto('/student')

  // Assert
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'LINE 登入' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('ski_session'))).toBeNull()
})

test('test_studentLineLogin_when_phone_is_unknown_then_opens_registration_form', async ({ page }) => {
  // Arrange
  await stubAppsScript(page, {
    loginWithLine: () => appsScriptSuccess({ bindingToken: 'binding-token' }),
    bindLineAccount: () => appsScriptFailure('STUDENT_NOT_FOUND'),
  })
  await prepareLineLoginAttempt(page)
  await page.goto('/auth/line-callback?code=authorization-code&state=test-state')

  // Act
  await page.getByRole('textbox', { name: '報名電話' }).fill('0911-709-461')
  await page.getByRole('button', { name: '確認' }).click()

  // Assert
  await expect(page).toHaveURL(/\/__test\/registration-form\?phone=0911709461$/)
})

async function prepareLineLoginAttempt(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (window.location.pathname !== '/auth/line-callback') {
      return
    }
    window.localStorage.setItem('line_login_attempt', JSON.stringify({
      state: 'test-state',
      nonce: 'test-nonce',
      expiresAt: Date.now() + 60_000,
    }))
  })
}
