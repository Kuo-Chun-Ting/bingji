import { expect, test } from 'vitest'

import { normalizePhone, parseStudentRows } from '../../server/domain/students'

test('test_normalizePhone_when_phone_has_spaces_and_dashes_then_returns_digits_only', () => {
  // Arrange
  const phone = '0912-345 678'

  // Act
  const normalizedPhone = normalizePhone(phone)

  // Assert
  expect(normalizedPhone).toBe('0912345678')
})

test('test_parseStudentRows_when_required_header_is_missing_then_throws_error', () => {
  // Arrange
  const rows = [
    ['姓名', '電話', 'Email'],
    ['王小明', '0912345678', 'ming@example.com'],
  ]

  // Act
  const parseRows = () => parseStudentRows(rows)

  // Assert
  expect(parseRows).toThrow('Missing required header: 購買堂數')
})

test('test_parseStudentRows_when_normalized_phones_are_duplicate_then_throws_error', () => {
  // Arrange
  const rows = [
    ['姓名', '電話', 'Email', '購買堂數'],
    ['王小明', '0912-345-678', 'ming@example.com', '8'],
    ['王小美', '0912345678', 'mei@example.com', '4'],
  ]

  // Act
  const parseRows = () => parseStudentRows(rows)

  // Assert
  expect(parseRows).toThrow('Duplicate phone: 0912345678')
})

test('test_parseStudentRows_when_purchased_lessons_is_numeric_text_then_parses_number', () => {
  // Arrange
  const rows = [
    ['姓名', '電話', 'Email', '購買堂數'],
    ['王小明', '0912-345-678', 'ming@example.com', '8'],
  ]

  // Act
  const students = parseStudentRows(rows)

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
