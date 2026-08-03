import { expect, test } from 'vitest'

import {
  createRegistrationFormUrl,
  getRegistrationFormRedirectUrl,
} from '../../app/utils/registration-form'

test('test_createRegistrationFormUrl_when_phone_is_provided_then_prefills_phone_field', () => {
  // Arrange
  const formUrl = 'https://docs.google.com/forms/d/e/form-id/viewform?usp=pp_url&entry.123={phone}'

  // Act
  const registrationUrl = createRegistrationFormUrl(formUrl, '0912-345-678')

  // Assert
  expect(registrationUrl).toBe(
    'https://docs.google.com/forms/d/e/form-id/viewform'
    + '?usp=pp_url&entry.123=0912345678',
  )
})

test('test_createRegistrationFormUrl_when_placeholder_is_missing_then_throws_configuration_error', () => {
  // Arrange
  const formUrl = 'https://docs.google.com/forms/d/e/form-id/viewform'

  // Act & Assert
  expect(() => createRegistrationFormUrl(formUrl, '0912345678'))
    .toThrow('INVALID_REGISTRATION_FORM_URL')
})

test('test_getRegistrationFormRedirectUrl_when_student_is_not_found_then_returns_prefilled_url', () => {
  // Arrange
  const formUrl = 'https://docs.google.com/forms/d/e/form-id/viewform?entry.123={phone}'

  // Act
  const redirectUrl = getRegistrationFormRedirectUrl(
    new Error('STUDENT_NOT_FOUND'),
    formUrl,
    '0912-345-678',
  )

  // Assert
  expect(redirectUrl).toBe(
    'https://docs.google.com/forms/d/e/form-id/viewform?entry.123=0912345678',
  )
})

test('test_getRegistrationFormRedirectUrl_when_error_is_unrelated_then_returns_null', () => {
  // Arrange
  const formUrl = 'https://docs.google.com/forms/d/e/form-id/viewform?entry.123={phone}'

  // Act
  const redirectUrl = getRegistrationFormRedirectUrl(new Error('PHONE_ALREADY_LINKED'), formUrl, '0912345678')

  // Assert
  expect(redirectUrl).toBeNull()
})

test('test_getRegistrationFormRedirectUrl_when_form_url_is_missing_then_returns_null', () => {
  // Arrange
  const error = new Error('STUDENT_NOT_FOUND')

  // Act
  const redirectUrl = getRegistrationFormRedirectUrl(error, '', '0912345678')

  // Assert
  expect(redirectUrl).toBeNull()
})
