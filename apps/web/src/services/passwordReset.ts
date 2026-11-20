import axios from 'axios'

/** Sin token: la recuperación se usa sin sesión. */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

export type ResetChannel = 'EMAIL' | 'WHATSAPP'

export async function requestResetCode(email: string, channel: ResetChannel) {
  const { data } = await publicApi.post<{ ok: true; message: string; devCode?: string }>(
    '/auth/password/forgot',
    { email, channel },
  )
  return data
}

export async function verifyResetCode(email: string, code: string): Promise<string> {
  const { data } = await publicApi.post<{ resetToken: string }>('/auth/password/verify', { email, code })
  return data.resetToken
}

export async function resetPassword(resetToken: string, newPassword: string) {
  await publicApi.post('/auth/password/reset', { resetToken, newPassword })
}
