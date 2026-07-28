import type { Student } from '../../shared/types/domain'

const EXPECTED_HEADERS = ['姓名', '電話', 'Email', '購買堂數'] as const
const NORMALIZED_PHONE_PATTERN = /^\d{8,15}$/

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function isValidNormalizedPhone(phone: string): boolean {
  return NORMALIZED_PHONE_PATTERN.test(phone)
}

export function parseStudentRows(rows: unknown[][]): Student[] {
  const headerRow = rows[0] ?? []
  const headers = headerRow.map(value => String(value ?? ''))

  if (headers.length !== EXPECTED_HEADERS.length
    || headers.some((header, index) => header !== EXPECTED_HEADERS[index])) {
    throw new Error(`Invalid headers: expected ${EXPECTED_HEADERS.join(', ')}`)
  }

  const phones = new Set<string>()

  return rows.slice(1).filter(row => row.some(value => String(value ?? '').trim() !== '')).map(row => {
    const name = String(row[0] ?? '').trim()
    const phone = normalizePhone(String(row[1] ?? '').trim())
    const email = String(row[2] ?? '').trim()
    const purchasedLessonsText = String(row[3] ?? '').trim()
    const purchasedLessons = Number(purchasedLessonsText)

    if (!phone) {
      throw new Error('Phone is required')
    }

    if (!isValidNormalizedPhone(phone)) {
      throw new Error(`Invalid phone: ${phone}`)
    }

    if (phones.has(phone)) {
      throw new Error(`Duplicate phone: ${phone}`)
    }

    if (!purchasedLessonsText || !Number.isInteger(purchasedLessons) || purchasedLessons < 0) {
      throw new Error(`Invalid purchased lessons: ${purchasedLessonsText}`)
    }

    phones.add(phone)

    return { name, phone, email, purchasedLessons }
  })
}
