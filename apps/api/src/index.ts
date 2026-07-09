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

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((o) => o.trim())
      : corsOrigin,
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
})
