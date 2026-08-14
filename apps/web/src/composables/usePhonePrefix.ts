export type PhoneCountry = 'MX' | 'US'

const COUNTRY_PREFIXES: Record<PhoneCountry, string> = {
  MX: '52',
  US: '1',
}

export const PHONE_COUNTRY_OPTIONS: { value: PhoneCountry; label: string; prefix: string }[] = [
  { value: 'MX', label: 'MX', prefix: '+52' },
  { value: 'US', label: 'US', prefix: '+1' },
]

export function countryPrefixDisplay(country: PhoneCountry): string {
  return PHONE_COUNTRY_OPTIONS.find((o) => o.value === country)?.prefix ?? '+52'
}

/** Digits-only national number (without country calling code). */
export function parsePhone(stored: string): { country: PhoneCountry; local: string } {
  const digits = stored.replace(/\D/g, '')
  if (!digits) return { country: 'MX', local: '' }
  if (digits.startsWith('52') && digits.length > 2) {
    return { country: 'MX', local: digits.slice(2) }
  }
  if (digits.startsWith('1') && digits.length >= 11) {
    return { country: 'US', local: digits.slice(1) }
  }
  // Stored as display value starting with +52 / +1 already stripped above
  if (stored.trim().startsWith('+52')) {
    return { country: 'MX', local: digits.startsWith('52') ? digits.slice(2) : digits }
  }
  if (stored.trim().startsWith('+1')) {
    return { country: 'US', local: digits.startsWith('1') ? digits.slice(1) : digits }
  }
  return { country: 'MX', local: digits }
}

/** Persist as country code + national digits (e.g. 5215512345678). */
export function formatPhone(country: PhoneCountry, local: string): string {
  let localDigits = local.replace(/\D/g, '')
  const cc = COUNTRY_PREFIXES[country]
  // Strip leading country code if user typed/kept the prefix in the field
  if (localDigits.startsWith(cc) && localDigits.length > cc.length) {
    localDigits = localDigits.slice(cc.length)
  }
  if (!localDigits) return ''
  return `${cc}${localDigits}`
}

/** Visible input value: "+52" / "+1" plus optional national digits. */
export function toDisplayValue(country: PhoneCountry, local: string): string {
  const prefix = countryPrefixDisplay(country)
  const localDigits = local.replace(/\D/g, '')
  if (!localDigits) return prefix
  return `${prefix}${localDigits}`
}

/** Parse what the user typed in the input into country + national digits. */
export function parseDisplayInput(
  value: string,
  fallbackCountry: PhoneCountry,
): { country: PhoneCountry; local: string } {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')

  if (trimmed.startsWith('+52') || digits.startsWith('52')) {
    const local = digits.startsWith('52') ? digits.slice(2) : digits
    return { country: 'MX', local }
  }
  if (trimmed.startsWith('+1') || (digits.startsWith('1') && digits.length >= 11)) {
    const local = digits.startsWith('1') ? digits.slice(1) : digits
    return { country: 'US', local }
  }
  // User cleared or is editing; keep country, treat remaining digits as local
  return { country: fallbackCountry, local: digits }
}
