import { computed, ref, watch, type Ref } from 'vue'
import type { PaymentMethod, Product, SplitPaymentMethod } from '@/services/api'

export const DEFAULT_USD_RATE = 18
export const MAX_CAJAS = 10
export const TAX_RATE = 0.16
const STORAGE_KEY = 'cosdi.caja.tabs.v1'

/** Convierte lo que venga de un input numérico (puede ser '' o NaN) en un número utilizable. */
export function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Importe de una línea ya con su descuento, nunca negativo. */
export function lineTotal(line: Pick<CartLine, 'unitPrice' | 'quantity' | 'discount'>): number {
  return round2(Math.max(0, num(line.unitPrice) * num(line.quantity) - num(line.discount)))
}

export interface CartLine {
  productId: string
  name: string
  sku: string
  brandName: string
  stock: number
  unitPrice: number
  quantity: number
  discount: number
}

export interface CajaTabState {
  id: string
  label: string
  lines: CartLine[]
  paymentMethod: PaymentMethod
  applyTax: boolean
  ticketComment: string
  attendedById: string
  customerId: string | null
  customerLabel: string
  giftCardCode: string
  /** Saldo de la tarjeta validada; 0 si no hay tarjeta aplicada. */
  giftCardBalance: number
  cashReceived: number
  mixed: { efectivo: number; tarjeta: number; transferencia: number }
  converterPesos: number
}

export interface CajaSessionOptions {
  defaultAttendedById: () => string
  defaultApplyTax?: () => boolean
  /** Los precios ya traen IVA: al aplicarlo se desglosa del total en vez de sumarse. */
  pricesIncludeTax?: () => boolean
  /** Separa los carritos guardados por negocio/usuario en el mismo navegador. */
  storageScope?: string
}

function newId() {
  return `caja-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function emptyTab(
  index: number,
  attendedById = '',
  applyTax = false,
): CajaTabState {
  return {
    id: newId(),
    label: `Caja ${index}`,
    lines: [],
    paymentMethod: 'EFECTIVO',
    applyTax,
    ticketComment: '',
    attendedById,
    customerId: null,
    customerLabel: '',
    giftCardCode: '',
    giftCardBalance: 0,
    cashReceived: 0,
    mixed: { efectivo: 0, tarjeta: 0, transferencia: 0 },
    converterPesos: 0,
  }
}

function loadTabs(key: string): { tabs: CajaTabState[]; activeId: string } | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tabs: CajaTabState[]; activeId: string }
    if (!Array.isArray(parsed.tabs) || !parsed.tabs.length) return null
    // Rellena campos que no existían cuando se guardó la sesión.
    parsed.tabs = parsed.tabs.map((t, i) => ({
      ...emptyTab(i + 1),
      ...t,
      lines: Array.isArray(t.lines) ? t.lines : [],
      mixed: {
        efectivo: num(t.mixed?.efectivo),
        tarjeta: num(t.mixed?.tarjeta),
        transferencia: num(t.mixed?.transferencia),
      },
    }))
    return parsed
  } catch {
    return null
  }
}

export function useCajaSession(options: CajaSessionOptions | (() => string)) {
  const opts: CajaSessionOptions =
    typeof options === 'function' ? { defaultAttendedById: options } : options
  const defaultAttendedById = opts.defaultAttendedById
  const defaultApplyTax = opts.defaultApplyTax || (() => false)
  const pricesIncludeTax = opts.pricesIncludeTax || (() => false)

  const storageKey = opts.storageScope ? `${STORAGE_KEY}:${opts.storageScope}` : STORAGE_KEY
  const saved = loadTabs(storageKey)
  const tabs = ref<CajaTabState[]>(
    saved?.tabs?.length
      ? saved.tabs
      : [emptyTab(1, defaultAttendedById(), defaultApplyTax())],
  )
  const activeId = ref(
    saved?.activeId && tabs.value.some((t) => t.id === saved.activeId)
      ? saved.activeId
      : tabs.value[0].id,
  )

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value) ?? tabs.value[0])

  watch(
    [tabs, activeId],
    () => {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ tabs: tabs.value, activeId: activeId.value }),
        )
      } catch {
        // Almacenamiento lleno o bloqueado: la caja sigue funcionando sin persistir.
      }
    },
    { deep: true },
  )

  function addTab() {
    if (tabs.value.length >= MAX_CAJAS) return
    const tab = emptyTab(tabs.value.length + 1, defaultAttendedById(), defaultApplyTax())
    tabs.value.push(tab)
    activeId.value = tab.id
    renumber()
  }

  function closeTab(id: string) {
    if (tabs.value.length <= 1) {
      resetTab(id)
      return
    }
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx < 0) return
    tabs.value.splice(idx, 1)
    if (activeId.value === id) {
      activeId.value = tabs.value[Math.max(0, idx - 1)].id
    }
    renumber()
  }

  function renumber() {
    tabs.value.forEach((t, i) => {
      t.label = `Caja ${i + 1}`
    })
  }

  function resetTab(id: string) {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx < 0) return
    const label = tabs.value[idx].label
    tabs.value[idx] = {
      ...emptyTab(idx + 1, defaultAttendedById(), defaultApplyTax()),
      id,
      label,
    }
  }

  function selectTab(id: string) {
    activeId.value = id
  }

  /** Agrega un producto al carrito. Devuelve un mensaje si no se pudo (o se topó con el stock). */
  function addProduct(product: Product, qty = 1): string | null {
    const tab = activeTab.value
    if (!tab) return null
    // Sin precio se registraría una venta en $0; sin existencias el servidor la rechaza.
    if (product.price === null || product.price === '' || !Number.isFinite(Number(product.price))) {
      return `"${product.name}" no tiene precio. Asígnale uno en Productos para poder venderlo.`
    }
    const price = Number(product.price)
    const stock = product.stock?.quantity ?? 0
    if (stock <= 0) {
      return `"${product.name}" no tiene existencias.`
    }
    const existing = tab.lines.find((l) => l.productId === product.id)
    if (existing) {
      existing.stock = stock
      const next = num(existing.quantity) + qty
      existing.quantity = Math.min(stock, next)
      return next > stock ? `Solo hay ${stock} en existencia de "${product.name}".` : null
    }
    tab.lines.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      brandName: product.brand.name,
      stock,
      unitPrice: price,
      quantity: Math.min(qty, stock),
      discount: 0,
    })
    return null
  }

  function removeLine(productId: string) {
    const tab = activeTab.value
    if (!tab) return
    tab.lines = tab.lines.filter((l) => l.productId !== productId)
  }

  const grossSubtotal = computed(() =>
    round2(activeTab.value.lines.reduce((s, l) => s + num(l.unitPrice) * num(l.quantity), 0)),
  )

  const discountTotal = computed(() =>
    round2(activeTab.value.lines.reduce((s, l) => s + num(l.discount), 0)),
  )

  const subtotalWithDiscount = computed(() =>
    round2(activeTab.value.lines.reduce((s, l) => s + lineTotal(l), 0)),
  )

  // Mismo cálculo que el servidor (`computeTotals` en apps/api/src/lib/saleMath.ts).
  const taxAmount = computed(() => {
    if (!activeTab.value.applyTax) return 0
    const gross = subtotalWithDiscount.value
    if (pricesIncludeTax()) return round2(gross - round2(gross / (1 + TAX_RATE)))
    return round2(gross * TAX_RATE)
  })

  const totalBeforeGift = computed(() =>
    pricesIncludeTax()
      ? subtotalWithDiscount.value
      : round2(subtotalWithDiscount.value + taxAmount.value),
  )

  /**
   * Lo que cubre la tarjeta de regalo. Se recalcula con el carrito (igual que
   * hace el servidor al cobrar) para que el total mostrado sea el que se registra.
   */
  const giftCardApplied = computed(() =>
    round2(Math.min(Math.max(0, num(activeTab.value.giftCardBalance)), totalBeforeGift.value)),
  )

  const totalToPay = computed(() =>
    round2(Math.max(0, totalBeforeGift.value - giftCardApplied.value)),
  )

  const changeDue = computed(() => {
    if (activeTab.value.paymentMethod !== 'EFECTIVO') return 0
    return round2(Math.max(0, num(activeTab.value.cashReceived) - totalToPay.value))
  })

  function mixedPayments(): Array<{ method: SplitPaymentMethod; amount: number }> {
    const m = activeTab.value.mixed
    return (
      [
        { method: 'EFECTIVO' as const, amount: round2(num(m.efectivo)) },
        { method: 'TARJETA' as const, amount: round2(num(m.tarjeta)) },
        { method: 'TRANSFERENCIA' as const, amount: round2(num(m.transferencia)) },
      ] as Array<{ method: SplitPaymentMethod; amount: number }>
    ).filter((p) => p.amount > 0)
  }

  return {
    tabs,
    activeId,
    activeTab,
    addTab,
    closeTab,
    selectTab,
    resetTab,
    addProduct,
    removeLine,
    grossSubtotal,
    discountTotal,
    subtotalWithDiscount,
    taxAmount,
    totalBeforeGift,
    giftCardApplied,
    totalToPay,
    changeDue,
    mixedPayments,
  }
}

/** @deprecated Use DEFAULT_USD_RATE or prefs-derived rate */
export const USD_RATE = DEFAULT_USD_RATE

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatMoney(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export type { Ref }
