import { Router } from 'express'
import ExcelJS from 'exceljs'
import { imageUpload, safeImageOriginalName } from '../lib/upload.js'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { generateUniqueSku } from '../lib/sku.js'
import { storage } from '../lib/storage.js'
import {
  brandDisplayName,
  brandDropdownLabel,
  resolveBrandRef,
  sortBrandsForImport,
} from '../lib/brandImportRef.js'
import { authenticate, authorize, brandFilter, tenantFilter, type AuthUser } from '../middleware/auth.js'

const router = Router()

const productSchema = z.object({
  brandId: z.string().optional(),
  name: z.string().min(1),
  sku: z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  quantity: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
})

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

const productInclude = {
  brand: { select: { id: true, name: true, isHouseBrand: true } },
  category: { select: { id: true, name: true } },
  stock: true,
} satisfies Prisma.ProductInclude

router.use(authenticate)

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

router.get('/', async (req, res) => {
  const filter = brandFilter(req.user!)
  // Solo BUSINESS puede acotar por marca explícitamente (BRAND ya queda fijo por brandFilter).
  const brandId = typeof req.query.brandId === 'string' ? req.query.brandId.trim() : ''
  if (brandId && req.user!.role === 'BUSINESS') {
    filter.brandId = brandId
  }
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : ''
  const sku = typeof req.query.sku === 'string' ? req.query.sku.trim() : ''
  const priceMin = parseOptionalNumber(req.query.priceMin)
  const priceMax = parseOptionalNumber(req.query.priceMax)
  const stockMin = parseOptionalNumber(req.query.stockMin)
  const stockMax = parseOptionalNumber(req.query.stockMax)
  const sinStock =
    req.query.sinStock === 'true' || req.query.sinStock === '1' || req.query.sinStock === '__YES__'

  const stockFilter: Prisma.StockWhereInput = {}
  if (sinStock) {
    stockFilter.quantity = 0
  } else {
    if (stockMin !== undefined || stockMax !== undefined) {
      stockFilter.quantity = {
        ...(stockMin !== undefined ? { gte: stockMin } : {}),
        ...(stockMax !== undefined ? { lte: stockMax } : {}),
      }
    }
  }

  const where: Prisma.ProductWhereInput = {
    ...filter,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { brand: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {
          ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
          ...(sku ? { sku: { contains: sku, mode: 'insensitive' } } : {}),
        }),
    ...(priceMin !== undefined || priceMax !== undefined
      ? {
          price: {
            ...(priceMin !== undefined ? { gte: priceMin } : {}),
            ...(priceMax !== undefined ? { lte: priceMax } : {}),
          },
        }
      : {}),
    ...(Object.keys(stockFilter).length > 0 ? { stock: stockFilter } : {}),
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: productInclude,
  })
  return res.json(products)
})

const productImportRowSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().nonnegative().optional(),
  sku: z.string().optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  description: z.string().optional(),
  brandId: z.string().optional(),
})

function importCell(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return undefined
}

async function loadImportBrands(user: AuthUser) {
  const brands = await prisma.brand.findMany({
    where: tenantFilter(user),
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, slug: true, isHouseBrand: true, createdAt: true },
  })
  return sortBrandsForImport(brands)
}

/** Plantilla XLSX para alta masiva de productos. */
router.get('/template', authorize('BUSINESS', 'BRAND'), async (req, res) => {
  const queryBrandId = typeof req.query.brandId === 'string' ? req.query.brandId.trim() : ''
  const scopedBrandId = req.user!.role === 'BRAND' ? req.user!.brandId! : queryBrandId
  const brands = await loadImportBrands(req.user!)

  if (scopedBrandId) {
    const scoped = brands.find((brand) => brand.id === scopedBrandId)
    if (!scoped) return res.status(400).json({ error: 'Marca no encontrada' })
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Productos')
  const includeMarca = !scopedBrandId
  const headers = includeMarca
    ? ['nombre', 'precio', 'stock', 'sku', 'stock_min', 'descripcion', 'marca']
    : ['nombre', 'precio', 'stock', 'sku', 'stock_min', 'descripcion']
  sheet.addRow(headers)
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.columns = headers.map((header) => ({
    width: header === 'descripcion' ? 28 : header === 'nombre' || header === 'marca' ? 24 : 14,
  }))

  const exampleBrand = scopedBrandId
    ? brands.find((brand) => brand.id === scopedBrandId)
    : brands[0]
  const exampleRow: Array<string | number> = [
    'Producto de ejemplo',
    199,
    10,
    '',
    5,
    'Descripción opcional',
  ]
  if (includeMarca) exampleRow.push(exampleBrand ? brandDisplayName(exampleBrand) : '')
  sheet.addRow(exampleRow)

  if (includeMarca) {
    const marcaCell = sheet.getCell('G1')
    marcaCell.note = 'Usa el nombre o el número de la hoja Marcas.'

    const refSheet = workbook.addWorksheet('Marcas')
    refSheet.addRow(['#', 'nombre', 'etiqueta'])
    refSheet.getRow(1).font = { bold: true }
    refSheet.views = [{ state: 'frozen', ySplit: 1 }]
    brands.forEach((brand, index) => {
      refSheet.addRow([index + 1, brandDisplayName(brand), brandDropdownLabel(index, brand)])
    })
    refSheet.getColumn(1).width = 8
    refSheet.getColumn(2).width = 28
    refSheet.getColumn(3).width = 32
    refSheet.getColumn(3).hidden = true

    if (brands.length > 0) {
      const validations = (
        sheet as ExcelJS.Worksheet & {
          dataValidations: { add: (range: string, options: ExcelJS.DataValidation) => void }
        }
      ).dataValidations
      validations.add('G2:G1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`Marcas!$C$2:$C$${brands.length + 1}`],
        showErrorMessage: false,
        promptTitle: 'Marca',
        prompt: 'Elige de la lista, o escribe el nombre o el número (#) de la hoja Marcas.',
        showInputMessage: true,
      })
    }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"')
  await workbook.xlsx.write(res)
  res.end()
})

/** Alta masiva desde filas JSON (tras preview editable). */
router.post('/import', authorize('BUSINESS', 'BRAND'), async (req, res) => {
  const body = req.body as { rows?: unknown[]; brandId?: string }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return res.status(400).json({ error: 'No hay filas para importar' })
  }

  const defaultBrandId =
    req.user!.role === 'BRAND' ? req.user!.brandId! : typeof body.brandId === 'string' ? body.brandId : ''

  const brands = await loadImportBrands(req.user!)
  const created: string[] = []
  const errors: Array<{ row: number; name?: string; error: string }> = []

  for (let i = 0; i < body.rows.length; i++) {
    const raw = body.rows[i] as Record<string, unknown>
    const rawBrandRef = importCell(raw, 'brandId', 'marca', 'brand', 'brandid')
    const resolvedBrandId =
      req.user!.role === 'BRAND'
        ? req.user!.brandId!
        : resolveBrandRef(rawBrandRef == null ? '' : String(rawBrandRef), brands) || defaultBrandId
    const parsed = productImportRowSchema.safeParse({
      name: importCell(raw, 'name', 'nombre', 'producto'),
      price: importCell(raw, 'price', 'precio'),
      quantity: importCell(raw, 'quantity', 'stock') ?? 0,
      sku: importCell(raw, 'sku') || undefined,
      minStock: importCell(raw, 'minStock', 'minstock', 'stock_min', 'stockmin') ?? 5,
      description: importCell(raw, 'description', 'descripcion') ?? undefined,
      brandId: resolvedBrandId || undefined,
    })

    if (!parsed.success) {
      errors.push({
        row: i + 1,
        name: String(importCell(raw, 'name', 'nombre', 'producto') ?? ''),
        error: 'Datos inválidos',
      })
      continue
    }

    const brandId = req.user!.role === 'BRAND' ? req.user!.brandId! : parsed.data.brandId
    if (!brandId) {
      errors.push({ row: i + 1, name: parsed.data.name, error: 'Falta marca' })
      continue
    }

    const brand = brands.find((item) => item.id === brandId)
    if (!brand) {
      errors.push({ row: i + 1, name: parsed.data.name, error: 'Marca no encontrada' })
      continue
    }

    try {
      const quantity = parsed.data.quantity ?? 0
      const minStock = parsed.data.minStock ?? 5

      if (req.user!.role === 'BRAND') {
        await prisma.productRequest.create({
          data: {
            tenantId: req.user!.tenantId!,
            brandId: req.user!.brandId!,
            requestedById: req.user!.id,
            type: 'CREATE_PRODUCT',
            name: parsed.data.name,
            sku: parsed.data.sku?.trim() || null,
            description: parsed.data.description || null,
            price: new Prisma.Decimal(parsed.data.price),
            quantity,
            minStock,
          },
        })
        created.push(parsed.data.name)
        continue
      }

      const sku = parsed.data.sku?.trim() || (await generateUniqueSku(brandId, parsed.data.name))
      const product = await prisma.product.create({
        data: {
          brandId,
          name: parsed.data.name,
          sku,
          description: parsed.data.description || null,
          price: new Prisma.Decimal(parsed.data.price),
          stock: { create: { quantity, minStock } },
        },
      })
      if (quantity > 0) {
        await prisma.stockEntry.create({
          data: {
            productId: product.id,
            quantity,
            note: 'Importación masiva',
            createdById: req.user!.id,
          },
        })
      }
      created.push(product.name)
    } catch {
      errors.push({ row: i + 1, name: parsed.data.name, error: 'No se pudo crear (¿SKU duplicado?)' })
    }
  }

  return res.json({ createdCount: created.length, errorCount: errors.length, errors })
})

router.get('/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const filter = brandFilter(req.user!)
  const product = await prisma.product.findFirst({
    where: { id, ...filter },
    include: {
      ...productInclude,
      stockEntries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
  return res.json(product)
})

router.post('/', authorize('BUSINESS'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const brandId =
    req.user!.role === 'BRAND'
      ? req.user!.brandId!
      : parsed.data.brandId

  if (!brandId) {
    return res.status(400).json({ error: 'brandId es requerido' })
  }

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, ...tenantFilter(req.user!) },
  })
  if (!brand) {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }

  const { quantity = 0, minStock = 5, sku: requestedSku, ...productData } = parsed.data
  const sku = requestedSku?.trim() || (await generateUniqueSku(brandId, productData.name))

  try {
    const product = await prisma.product.create({
      data: {
        ...productData,
        sku,
        brandId,
        price: productData.price != null ? new Prisma.Decimal(productData.price) : null,
        stock: {
          create: { quantity, minStock },
        },
      },
      include: productInclude,
    })
    if (quantity > 0) {
      await prisma.stockEntry.create({
        data: {
          productId: product.id,
          quantity,
          note: 'Alta inicial de producto',
          createdById: req.user!.id,
        },
      })
    }
    return res.status(201).json(product)
  } catch {
    return res.status(409).json({ error: 'SKU duplicado para esta marca' })
  }
})

/** Sube una imagen de producto y regresa la URL para usarla en create/update. */
router.post('/upload-image', (req, res, next) => {
  imageUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Archivo inválido' })
    }
    next()
  })
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' })
  }
  const saved = await storage.save(req.file.buffer, safeImageOriginalName(req.file), 'products')
  return res.status(201).json({ url: saved.url })
})

/** Elimina varios productos a la vez (solo BUSINESS). */
router.post('/bulk-delete', authorize('BUSINESS'), async (req, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Selecciona al menos un producto' })
  }

  const filter = brandFilter(req.user!)
  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.ids }, ...filter },
    select: { id: true },
  })

  const result = await prisma.product.deleteMany({
    where: { id: { in: products.map((p) => p.id) } },
  })

  return res.json({ deleted: result.count, skipped: parsed.data.ids.length - result.count })
})

router.patch('/:id', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = productSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const filter = brandFilter(req.user!)
  const existing = await prisma.product.findFirst({
    where: { id, ...filter },
  })
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })

  const { quantity, minStock, brandId: _brandId, sku: _sku, ...productData } = parsed.data

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...productData,
      price:
        productData.price != null
          ? new Prisma.Decimal(productData.price)
          : productData.price === null
            ? null
            : undefined,
      stock:
        quantity !== undefined || minStock !== undefined
          ? {
              upsert: {
                create: { quantity: quantity ?? 0, minStock: minStock ?? 5 },
                update: {
                  ...(quantity !== undefined ? { quantity } : {}),
                  ...(minStock !== undefined ? { minStock } : {}),
                },
              },
            }
          : undefined,
    },
    include: {
      ...productInclude,
      stockEntries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  })

  return res.json(product)
})

router.delete('/:id', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const filter = brandFilter(req.user!)
  const existing = await prisma.product.findFirst({
    where: { id, ...filter },
  })
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })

  await prisma.product.delete({ where: { id } })
  return res.status(204).send()
})

export default router
