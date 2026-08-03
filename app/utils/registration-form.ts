const PHONE_PLACEHOLDER = '{phone}'

export function createRegistrationFormUrl(formUrlTemplate: string, phone: string): string {
  if (!formUrlTemplate.includes(PHONE_PLACEHOLDER)) {
    throw new Error('INVALID_REGISTRATION_FORM_URL')
  }
  const normalizedPhone = phone.replace(/\D/g, '')
  return formUrlTemplate.replace(PHONE_PLACEHOLDER, encodeURIComponent(normalizedPhone))
}

export function getRegistrationFormRedirectUrl(
  error: unknown,
  formUrlTemplate: string,
  phone: string,
): string | null {
  if (!(error instanceof Error) || error.message !== 'STUDENT_NOT_FOUND' || !formUrlTemplate) {
    return null
  }
  try {
    return createRegistrationFormUrl(formUrlTemplate, phone)
  }
  catch {
    return null
  }
}
