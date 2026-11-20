import axios from 'axios'
import api from './api'

export type TestimonialSource = 'PANEL' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'GOOGLE' | 'WHATSAPP'
export type TestimonialStatus = 'PENDING' | 'APPROVED' | 'HIDDEN'

export interface PublicTestimonial {
  id: string
  authorName: string
  businessName: string
  authorRole: string | null
  quote: string
  rating: number | null
  source: TestimonialSource
  sourceUrl: string | null
}

export interface MyTestimonial extends PublicTestimonial {
  status: TestimonialStatus
  updatedAt: string
}

export interface PlatformTestimonial extends PublicTestimonial {
  status: TestimonialStatus
  tenantId: string | null
  consentAt: string
  approvedAt: string | null
  createdAt: string
}

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

export async function listPublicTestimonials(): Promise<PublicTestimonial[]> {
  const { data } = await publicApi.get<{ testimonials: PublicTestimonial[] }>('/site/testimonials')
  return data.testimonials
}

export async function getMyTestimonial(): Promise<MyTestimonial | null> {
  const { data } = await api.get<{ testimonial: MyTestimonial | null }>('/testimonials/mine')
  return data.testimonial
}

export async function saveMyTestimonial(body: {
  authorName: string
  authorRole?: string | null
  quote: string
  rating: number
  consent: true
}): Promise<MyTestimonial> {
  const { data } = await api.put<{ testimonial: MyTestimonial }>('/testimonials/mine', body)
  return data.testimonial
}

export async function deleteMyTestimonial() {
  await api.delete('/testimonials/mine')
}

export async function listPlatformTestimonials(): Promise<PlatformTestimonial[]> {
  const { data } = await api.get<{ testimonials: PlatformTestimonial[] }>('/platform/testimonials')
  return data.testimonials
}

export async function addPlatformTestimonial(body: {
  authorName: string
  businessName: string
  authorRole?: string | null
  quote: string
  rating?: number | null
  source: TestimonialSource
  sourceUrl?: string | null
  permissionConfirmed: true
}) {
  const { data } = await api.post<{ testimonial: PlatformTestimonial }>('/platform/testimonials', body)
  return data.testimonial
}

export async function setTestimonialStatus(id: string, status: TestimonialStatus) {
  await api.patch(`/platform/testimonials/${encodeURIComponent(id)}`, { status })
}

export async function deletePlatformTestimonial(id: string) {
  await api.delete(`/platform/testimonials/${encodeURIComponent(id)}`)
}

export const SOURCE_LABEL: Record<TestimonialSource, string> = {
  PANEL: 'Panel de COSDI',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  GOOGLE: 'Google',
  WHATSAPP: 'WhatsApp',
}
