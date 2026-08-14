import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import brandsRoutes from './routes/brands.js'
import productsRoutes from './routes/products.js'
import stockRoutes from './routes/stock.js'
import salesRoutes from './routes/sales.js'
import dashboardRoutes from './routes/dashboard.js'
import productRequestsRoutes from './routes/productRequests.js'
import agendaRoutes from './routes/agenda.js'
import usersRoutes from './routes/users.js'
import customersRoutes from './routes/customers.js'
import giftCardsRoutes from './routes/giftCards.js'
import layawaysRoutes from './routes/layaways.js'
import termsRoutes from './routes/terms.js'
import onboardingRoutes from './routes/onboarding.js'
import preferencesRoutes from './routes/preferences.js'
import categoriesRoutes from './routes/categories.js'
import employeesRoutes from './routes/employees.js'
import platformRoutes from './routes/platform.js'
import servicesRoutes from './routes/services.js'
import businessHoursRoutes from './routes/businessHours.js'
import appointmentsRoutes from './routes/appointments.js'
import whatsappConfigRoutes from './routes/whatsappConfig.js'
import { UPLOADS_ROOT } from './lib/storage.js'
import { requireOnboarding, requireTerms } from './middleware/auth.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000

function resolveAllowedOrigins(): string[] {
  const origins = new Set<string>([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])

  const corsOrigin = process.env.CORS_ORIGIN?.trim()
  if (corsOrigin) {
    for (const part of corsOrigin.split(',')) {
      const origin = part.trim()
      // Railway reference vars can resolve to "https://" when the target service has no domain yet.
      if (origin.length > 8 && origin !== 'https://' && origin !== 'http://') {
        origins.add(origin)
      }
    }
  }

  const webHost = process.env.RAILWAY_SERVICE_WEB_URL?.trim()
  if (webHost) {
    origins.add(`https://${webHost}`)
  }

  return [...origins]
}

const allowedOrigins = resolveAllowedOrigins()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(express.json())
app.use(
  '/uploads',
  express.static(UPLOADS_ROOT, {
    setHeaders(res, filePath) {
      const lower = filePath.toLowerCase()
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg')
      } else if (lower.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png')
      } else if (lower.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp')
      }
      res.setHeader('X-Content-Type-Options', 'nosniff')
    },
  }),
)

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'punto-maneki-api' })
})

// Guards globales: no bloquean rutas públicas ni /api/auth, /api/terms,
// /api/onboarding (allowlist interno de requireTerms/requireOnboarding).
app.use(requireTerms, requireOnboarding)

app.use('/api/auth', authRoutes)
app.use('/api/terms', termsRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/brands', brandsRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/product-requests', productRequestsRoutes)
app.use('/api/agenda', agendaRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/gift-cards', giftCardsRoutes)
app.use('/api/layaways', layawaysRoutes)
app.use('/api/preferences', preferencesRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/platform', platformRoutes)
app.use('/api/v1/services', servicesRoutes)
app.use('/api/v1/business-hours', businessHoursRoutes)
app.use('/api/v1/appointments', appointmentsRoutes)
app.use('/api/v1/whatsapp-config', whatsappConfigRoutes)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`)
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`)
})
