import { computed, ref, watch } from 'vue'
import type { PaymentMethod, Product, SplitPaymentMethod } from '@/services/api'

export const USD_RATE = 18
export const MAX_CAJAS = 10
const STORAGE_KEY = 'puntomaneki.caja.tabs.v1'

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
  giftCardApplied: number
  cashReceived: number
  mixed: { efectivo: number; tarjeta: number; transferencia: number }
  converterPesos: number
}

function newId() {
  return `caja-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function emptyTab(index: number, attendedById = ''): CajaTabState {
  return {
    id: newId(),
    label: `Caja ${index}`,
    lines: [],
    paymentMethod: 'EFECTIVO',
    applyTax: false,
    ticketComment: '',
    attendedById,
    customerId: null,
    customerLabel: '',
    giftCardCode: '',
    giftCardApplied: 0,
    cashReceived: 0,
    mixed: { efectivo: 0, tarjeta: 0, transferencia: 0 },
    converterPesos: 0,
  }
}

function loadTabs(): { tabs: CajaTabState[]; activeId: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tabs: CajaTabState[]; activeId: string }
    if (!parsed.tabs?.length) return null
    return parsed
  } catch {
    return null
  }
}

export function useCajaSession(defaultAttendedById: () => string) {
  const saved = loadTabs()
  const tabs = ref<CajaTabState[]>(
    saved?.tabs?.length ? saved.tabs : [emptyTab(1, defaultAttendedById())],
  )
  const activeId = ref(saved?.activeId && tabs.value.some((t) => t.id === saved.activeId)
    ? saved.activeId
    : tabs.value[0].id)

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value) ?? tabs.value[0])

  watch(
    [tabs, activeId],
    () => {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs: tabs.value, activeId: activeId.value }),
      )
    },
    { deep: true },
  )

  function addTab() {
    if (tabs.value.length >= MAX_CAJAS) return
    const tab = emptyTab(tabs.value.length + 1, defaultAttendedById())
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
    tabs.value[idx] = { ...emptyTab(idx + 1, defaultAttendedById()), id, label }
  }

  function selectTab(id: string) {
    activeId.value = id
  }

  function addProduct(product: Product, qty = 1) {
    const tab = activeTab.value
    if (!tab) return
    const price = product.price ? Number(product.price) : 0
    const stock = product.stock?.quantity ?? 0
    const existing = tab.lines.find((l) => l.productId === product.id)
    if (existing) {
      const next = existing.quantity + qty
      existing.quantity = stock > 0 ? Math.min(stock, next) : next
      return
    }
    tab.lines.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      brandName: product.brand.name,
      stock,
      unitPrice: price,
      quantity: stock > 0 ? Math.min(qty, stock) : qty,
      discount: 0,
    })
  }

  function removeLine(productId: string) {
    const tab = activeTab.value
    if (!tab) return
    tab.lines = tab.lines.filter((l) => l.productId !== productId)
  }

  const grossSubtotal = computed(() =>
    round2(activeTab.value.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)),
  )

  const discountTotal = computed(() =>
    round2(activeTab.value.lines.reduce((s, l) => s + (l.discount || 0), 0)),
  )

  const subtotalWithDiscount = computed(() =>
    round2(activeTab.value.lines.reduce((s, l) => s + Math.max(0, l.unitPrice * l.quantity - l.discount), 0)),
  )

  const taxAmount = computed(() =>
    activeTab.value.applyTax ? round2(subtotalWithDiscount.value * 0.16) : 0,
  )

  const totalBeforeGift = computed(() => round2(subtotalWithDiscount.value + taxAmount.value))

  const totalToPay = computed(() =>
    round2(Math.max(0, totalBeforeGift.value - (activeTab.value.giftCardApplied || 0))),
  )

  const changeDue = computed(() => {
    if (activeTab.value.paymentMethod !== 'EFECTIVO') return 0
    return round2(Math.max(0, (activeTab.value.cashReceived || 0) - totalToPay.value))
  })

  function mixedPayments(): Array<{ method: SplitPaymentMethod; amount: number }> {
    const m = activeTab.value.mixed
    return (
      [
        { method: 'EFECTIVO' as const, amount: round2(m.efectivo || 0) },
        { method: 'TARJETA' as const, amount: round2(m.tarjeta || 0) },
        { method: 'TRANSFERENCIA' as const, amount: round2(m.transferencia || 0) },
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
    totalToPay,
    changeDue,
    mixedPayments,
  }
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatMoney(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
