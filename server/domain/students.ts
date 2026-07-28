import type { Student } from '../../shared/types/domain'

const REQUIRED_HEADERS = ['姓名', '電話', 'Email', '購買堂數'] as const

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function parseStudentRows(rows: unknown[][]): Student[] {
  const headerRow = rows[0] ?? []
  const headers = headerRow.map(value => String(value ?? '').trim())
  const indexes = REQUIRED_HEADERS.map(header => {
    const index = headers.indexOf(header)

    if (index === -1) {
      throw new Error(`Missing required header: ${header}`)
    }

    return index
  })

  const phones = new Set<string>()

  return rows.slice(1).filter(row => row.some(value => String(value ?? '').trim() !== '')).map(row => {
    const name = String(row[indexes[0]] ?? '').trim()
    const phone = normalizePhone(String(row[indexes[1]] ?? '').trim())
    const email = String(row[indexes[2]] ?? '').trim()
    const purchasedLessonsText = String(row[indexes[3]] ?? '').trim()
    const purchasedLessons = Number(purchasedLessonsText)

    if (!phone) {
      throw new Error('Phone is required')
    }

    if (phones.has(phone)) {
      throw new Error(`Duplicate phone: ${phone}`)
    }

    if (!Number.isInteger(purchasedLessons) || purchasedLessons < 0) {
      throw new Error(`Invalid purchased lessons: ${purchasedLessonsText}`)
    }

    phones.add(phone)

    return { name, phone, email, purchasedLessons }
  })
}
