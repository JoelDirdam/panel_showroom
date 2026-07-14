/**
 * Local smoke: multi-brand sale, stock decrement, BRAND visibility.
 */
const API = 'http://localhost:3000/api'

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const results = []
function ok(name, detail = '') {
  results.push({ name, pass: true, detail })
  console.log(`PASS: ${name}${detail ? ' — ' + detail : ''}`)
}
function fail(name, detail = '') {
  results.push({ name, pass: false, detail })
  console.error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`)
}

async function main() {
  const adminLogin = await req('POST', '/auth/login', {
    body: { email: 'admin@showroom.com', password: 'Showroom2026!' },
  })
  const adminToken = adminLogin.token
  ok('Login ADMIN')

  const brandLogin = await req('POST', '/auth/login', {
    body: { email: 'marca@bubbles.com', password: 'Showroom2026!' },
  })
  const brandToken = brandLogin.token
  const brandIdA = brandLogin.user.brandId
  ok('Login BRAND', brandIdA)

  // Ensure second brand + product
  let brands = await req('GET', '/brands', { token: adminToken })
  let brandB = brands.find((b) => b.slug === 'otra-marca-demo')
  if (!brandB) {
    brandB = await req('POST', '/brands', {
      token: adminToken,
      body: {
        name: 'Otra Marca Demo',
        slug: 'otra-marca-demo',
        contactEmail: 'otra@demo.com',
        active: true,
      },
    })
  }
  ok('Brand B ready', brandB.id)

  let products = await req('GET', '/products', { token: adminToken })
  let productA = products.find((p) => p.brandId === brandIdA && (p.stock?.quantity ?? 0) > 0)
  let productB = products.find((p) => p.brandId === brandB.id && (p.stock?.quantity ?? 0) > 0)

  if (!productA) {
    throw new Error('No hay producto con stock de marca Bubbles Demo')
  }
  if (!productB || (productB.stock?.quantity ?? 0) < 1) {
    productB = await req('POST', '/products', {
      token: adminToken,
      body: {
        brandId: brandB.id,
        name: 'Producto Otra Marca',
        sku: `OTR-${Date.now()}`,
        price: 15.5,
        quantity: 20,
        minStock: 2,
      },
    })
  }
  ok('Products A/B ready', `${productA.sku} / ${productB.sku || productB.id}`)

  // Refresh stock quantities; top up if needed
  products = await req('GET', '/products', { token: adminToken })
  productA = products.find((p) => p.id === productA.id)
  productB = products.find((p) => p.id === productB.id)

  for (const p of [productA, productB]) {
    if ((p.stock?.quantity ?? 0) < 1) {
      await req('POST', `/stock/${p.id}/entries`, {
        token: adminToken,
        body: { quantity: 10, note: 'smoke top-up' },
      })
    }
  }

  products = await req('GET', '/products', { token: adminToken })
  productA = products.find((p) => p.id === productA.id)
  productB = products.find((p) => p.id === productB.id)
  const stockA0 = productA.stock?.quantity ?? 0
  const stockB0 = productB.stock?.quantity ?? 0
  assert(stockA0 >= 1 && stockB0 >= 1, 'Stock insuficiente para la prueba')

  // BRAND cannot create sale
  try {
    await req('POST', '/sales', {
      token: brandToken,
      body: {
        paymentMethod: 'EFECTIVO',
        lines: [{ productId: productA.id, quantity: 1 }],
      },
    })
    fail('BRAND blocked from POST /sales', 'se permitió crear')
  } catch (e) {
    if (e.status === 403) ok('BRAND blocked from POST /sales')
    else fail('BRAND blocked from POST /sales', e.message)
  }

  const sale = await req('POST', '/sales', {
    token: adminToken,
    body: {
      paymentMethod: 'TARJETA',
      lines: [
        { productId: productA.id, quantity: 1, discount: 1, commission: 2 },
        { productId: productB.id, quantity: 1, discount: 0, commission: 1.5 },
      ],
    },
  })
  assert(sale.ticketNumber >= 1, 'ticketNumber missing')
  assert(sale.lines.length === 2, 'expected 2 lines')
  ok('ADMIN multi-brand sale created', `ticket #${sale.ticketNumber}`)

  products = await req('GET', '/products', { token: adminToken })
  const stockA1 = products.find((p) => p.id === productA.id).stock.quantity
  const stockB1 = products.find((p) => p.id === productB.id).stock.quantity
  assert(stockA1 === stockA0 - 1, `stock A ${stockA0} -> ${stockA1}`)
  assert(stockB1 === stockB0 - 1, `stock B ${stockB0} -> ${stockB1}`)
  ok('Stock decremented for both products')

  const brandSales = await req('GET', '/sales', { token: brandToken })
  for (const s of brandSales) {
    for (const line of s.lines) {
      assert(line.product.brandId === brandIdA, `BRAND saw foreign brand line ${line.product.brandId}`)
    }
  }
  const hasOwnLine = brandSales.some((s) =>
    s.lines.some((l) => l.productId === productA.id && s.ticketNumber === sale.ticketNumber),
  )
  const hasForeign = brandSales.some((s) =>
    s.lines.some((l) => l.productId === productB.id),
  )
  assert(hasOwnLine, 'BRAND should see own product line from ticket')
  assert(!hasForeign, 'BRAND should not see other brand lines')
  ok('BRAND visibility filtered by product.brandId')

  const lineA = sale.lines.find((l) => l.productId === productA.id)
  const patched = await req('PATCH', `/sales/lines/${lineA.id}`, {
    token: adminToken,
    body: { inSettlement: true, paid: true },
  })
  assert(patched.inSettlement === true && patched.paid === true, 'flags not updated')
  ok('PATCH line flags inSettlement/paid')

  const failed = results.filter((r) => !r.pass)
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
