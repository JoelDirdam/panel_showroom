import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import brandsRoutes from './routes/brands.js'
import productsRoutes from './routes/products.js'
import stockRoutes from './routes/stock.js'
import dashboardRoutes from './routes/dashboard.js'

const app = express()
const PORT = Number(process.env.PORT) || 3000

function resolveAllowedOrigins(): string[] {
  const origins = new Set<string>(['http://localhost:5173'])

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

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'panel-bubbles-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/brands', brandsRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`)
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`)
})
