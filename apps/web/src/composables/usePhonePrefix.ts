export type PhoneCountry = 'MX' | 'US'

const COUNTRY_PREFIXES: Record<PhoneCountry, string> = {
  MX: '52',
  US: '1',
}

export function parsePhone(stored: string): { country: PhoneCountry; local: string } {
  const digits = stored.replace(/\D/g, '')
  if (!digits) return { country: 'MX', local: '' }
  if (digits.startsWith('52')) {
    return { country: 'MX', local: digits.slice(2) }
  }
  if (digits.startsWith('1') && digits.length >= 11) {
    return { country: 'US', local: digits.slice(1) }
  }
  return { country: 'MX', local: digits }
}

export function formatPhone(country: PhoneCountry, local: string): string {
  const localDigits = local.replace(/\D/g, '')
  if (!localDigits) return ''
  return `${COUNTRY_PREFIXES[country]}${localDigits}`
}

export const PHONE_COUNTRY_OPTIONS: { value: PhoneCountry; label: string; prefix: string }[] = [
  { value: 'MX', label: 'MX', prefix: '+52' },
  { value: 'US', label: 'US', prefix: '+1' },
]
