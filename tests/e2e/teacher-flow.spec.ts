import { expect, test } from '@playwright/test'

import type { Registration, TeacherDashboard } from '../../shared/types/domain'
import {
  appsScriptFailure,
  appsScriptSuccess,
  stubAppsScript,
} from './support/apps-script-stub'

const registration: Registration = {
  id: 'registration-1',
  courseId: 'course-1',
  phone: '0911709461',
  status: 'registered',
  createdAt: '2026-08-06T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
}

const dashboard: TeacherDashboard = {
  students: [{
    name: 'Lillard',
    phone: '0911709461',
    email: 'd7018600@gmail.com',
    purchasedLessons: 3,
  }],
  courses: [{
    id: 'course-1',
    date: '2026-08-09',
    startTime: '09:00',
    endTime: '11:00',
    isOpen: true,
  }],
  registrations: [registration],
  remainingLessons: { '0911709461': 3 },
}

test('test_teacherLogin_when_credentials_are_valid_then_opens_dashboard', async ({ page }) => {
  // Arrange
  await stubAppsScript(page, {
    loginAsTeacher: payload => payload.username === 'admin'
      && payload.password === 'password'
      ? appsScriptSuccess({ token: 'teacher-token', role: 'teacher' })
      : appsScriptFailure('INVALID_CREDENTIALS'),
    getTeacherDashboard: () => appsScriptSuccess(dashboard),
  })
  await page.goto('/admin')

  // Act
  await page.getByLabel('帳號').fill('admin')
  await page.getByLabel('密碼').fill('password')
  await page.getByRole('button', { name: '登入' }).click()

  // Assert
  await expect(page).toHaveURL(/\/teacher$/)
  await expect(page.getByRole('heading', { name: '課程' })).toBeVisible()
  await expect(page.getByText('Lillard')).toBeVisible()
  await expect(page.getByText('3 堂')).toBeVisible()
})

test('test_teacherDashboard_when_student_attends_then_updates_attendance', async ({ page }) => {
  // Arrange
  await page.addInitScript(() => {
    window.localStorage.setItem('ski_session', JSON.stringify({
      token: 'teacher-token',
      role: 'teacher',
    }))
  })
  await stubAppsScript(page, {
    getTeacherDashboard: () => appsScriptSuccess(dashboard),
    updateAttendance: payload => payload.registrationId === registration.id
      && payload.status === 'attended'
      ? appsScriptSuccess({
          registration: {
            ...registration,
            status: 'attended',
            updatedAt: '2026-08-06T01:00:00.000Z',
          },
        })
      : appsScriptFailure('INVALID_STATUS_TRANSITION'),
  })
  await page.goto('/teacher')

  // Act
  await page.getByRole('button', { name: '標記為已到課' }).click()

  // Assert
  await expect(page.getByText('已到課')).toBeVisible()
  await expect(page.getByText('2 堂')).toBeVisible()
  await expect(page.getByText('已完成')).toBeVisible()
})
