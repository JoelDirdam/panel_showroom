<template>
  <div
    class="sale-ticket-overlay fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-3 sm:items-center sm:p-6"
    role="dialog"
    aria-modal="true"
    :aria-label="`Ticket ${sale.ticketNumber}`"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white shadow-xl dark:bg-gray-900">
      <!-- Lo que se imprime: siempre en negro sobre blanco -->
      <div id="sale-ticket-print" class="sale-ticket rounded-t-2xl bg-white p-5 font-mono text-[13px] leading-snug text-gray-900">
        <div class="text-center">
          <p class="text-base font-bold">{{ business.name }}</p>
          <p v-if="business.address" class="break-words">{{ business.address }}</p>
          <p v-if="business.rfc">RFC: {{ business.rfc }}</p>
        </div>

        <div class="my-3 border-t border-dashed border-gray-400"></div>

        <p v-if="cancelled" class="mb-2 text-center font-bold">*** VENTA CANCELADA ***</p>
        <div class="flex justify-between gap-2">
          <span>Ticket #{{ sale.ticketNumber }}</span>
          <span>{{ formatDateTime(sale.soldAt) }}</span>
        </div>
        <p v-if="attendedBy">Atendió: {{ attendedBy }}</p>
        <p v-if="sale.customer" class="break-words">Cliente: {{ sale.customer.name }}</p>

        <div class="my-3 border-t border-dashed border-gray-400"></div>

        <div v-for="line in sale.lines" :key="line.id" class="mb-1.5">
          <p class="break-words">{{ line.product.name }}</p>
          <div class="flex justify-between gap-2">
            <span>{{ line.quantity }} x ${{ money(line.unitPrice) }}</span>
            <span>${{ money(line.subtotal) }}</span>
          </div>
          <div v-if="Number(line.discount) > 0" class="flex justify-between gap-2">
            <span>&nbsp;&nbsp;Descuento</span>
            <span>−${{ money(line.discount) }}</span>
          </div>
        </div>

        <div class="my-3 border-t border-dashed border-gray-400"></div>

        <div v-if="taxAmount > 0" class="flex justify-between gap-2">
          <span>Subtotal</span>
          <span>${{ money(sale.subtotal) }}</span>
        </div>
        <div v-if="taxAmount > 0" class="flex justify-between gap-2">
          <span>IVA ({{ taxPercent }}%)</span>
          <span>${{ money(taxAmount) }}</span>
        </div>
        <div v-if="giftCard > 0" class="flex justify-between gap-2">
          <span>Tarjeta de regalo</span>
          <span>−${{ money(giftCard) }}</span>
        </div>
        <div class="mt-1 flex justify-between gap-2 text-base font-bold">
          <span>TOTAL</span>
          <span>${{ money(sale.total) }}</span>
        </div>

        <div class="mt-2">
          <template v-if="sale.payments?.length">
            <div v-for="p in sale.payments" :key="p.id" class="flex justify-between gap-2">
              <span>{{ PAYMENT_LABELS[p.method] }}</span>
              <span>${{ money(p.amount) }}</span>
            </div>
          </template>
          <p v-else>Pago: {{ PAYMENT_LABELS[sale.paymentMethod] }}</p>
          <div v-if="cashReceived && cashReceived > 0" class="flex justify-between gap-2">
            <span>Recibido</span>
            <span>${{ money(cashReceived) }}</span>
          </div>
          <div v-if="change && change > 0" class="flex justify-between gap-2">
            <span>Cambio</span>
            <span>${{ money(change) }}</span>
          </div>
        </div>

        <template v-if="sale.ticketComment || fixedComment">
          <div class="my-3 border-t border-dashed border-gray-400"></div>
          <p v-if="sale.ticketComment" class="whitespace-pre-line break-words">{{ sale.ticketComment }}</p>
          <p v-if="fixedComment" class="mt-1 whitespace-pre-line break-words text-center">{{ fixedComment }}</p>
        </template>
      </div>

      <div class="sale-ticket-actions flex flex-wrap gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
        <button
          ref="printBtn"
          type="button"
          class="flex-1 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          @click="print"
        >
          Imprimir
        </button>
        <a
          :href="whatsappUrl"
          target="_blank"
          rel="noopener"
          class="flex-1 rounded-lg border border-success-500 px-3 py-2.5 text-center text-sm font-medium text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10"
        >
          WhatsApp
        </a>
        <button
          type="button"
          class="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          @click="$emit('close')"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Sale } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { formatMoney } from '@/composables/useCajaSession'
import { PAYMENT_LABELS, formatDateTime } from '@/services/pos'

const props = defineProps<{
  sale: Sale
  /** Solo al cobrar en efectivo: lo que entregó el cliente y su cambio. */
  cashReceived?: number
  change?: number
  cancelled?: boolean
}>()
defineEmits<{ close: [] }>()

const auth = useAuthStore()
const printBtn = ref<HTMLButtonElement | null>(null)

const business = computed(() => ({
  name: auth.user?.tenant?.name || 'Mi negocio',
  address: auth.user?.tenant?.address || '',
  rfc: auth.user?.tenant?.rfc || '',
}))
const fixedComment = computed(() => auth.user?.preferences?.ticketFixedComment?.trim() || '')
const attendedBy = computed(
  () => props.sale.attendedBy?.name || props.sale.attendedByUser?.name || props.sale.createdBy?.name || '',
)
const taxAmount = computed(() => Number(props.sale.taxAmount ?? 0))
const taxPercent = computed(() => Math.round(Number(props.sale.taxRate ?? 0.16) * 100))
const giftCard = computed(() => Number(props.sale.giftCardAmount ?? 0))

function money(value: string | number | undefined | null): string {
  return formatMoney(Number(value ?? 0))
}

/** Texto plano del ticket para compartir. */
const shareText = computed(() => {
  const s = props.sale
  const rows = [
    `*${business.value.name}*`,
    `Ticket #${s.ticketNumber} · ${formatDateTime(s.soldAt)}`,
    '',
    ...s.lines.map(
      (l) =>
        `${l.quantity} x ${l.product.name} — $${money(l.total)}` +
        (Number(l.discount) > 0 ? ` (desc. $${money(l.discount)})` : ''),
    ),
    '',
  ]
  if (taxAmount.value > 0) {
    rows.push(`Subtotal: $${money(s.subtotal)}`, `IVA (${taxPercent.value}%): $${money(taxAmount.value)}`)
  }
  if (giftCard.value > 0) rows.push(`Tarjeta de regalo: −$${money(giftCard.value)}`)
  rows.push(`*Total: $${money(s.total)}*`, `Pago: ${PAYMENT_LABELS[s.paymentMethod]}`)
  if (s.ticketComment) rows.push('', s.ticketComment)
  if (fixedComment.value) rows.push('', fixedComment.value)
  return rows.join('\n')
})

/** Con teléfono del cliente abre su chat; sin él, deja elegir el contacto. */
const whatsappUrl = computed(() => {
  const digits = (props.sale.customer?.phone || '').replace(/\D/g, '')
  // Los números nacionales a 10 dígitos necesitan la lada de México.
  const phone = digits.length === 10 ? `52${digits}` : digits
  const text = encodeURIComponent(shareText.value)
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`
})

function print() {
  window.print()
}

const previousOverflow = document.body.style.overflow
onMounted(() => {
  document.body.style.overflow = 'hidden'
  // Con el foco en "Imprimir", Enter manda el ticket a la impresora.
  void nextTick(() => printBtn.value?.focus())
})
onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
})
</script>

<style>
/* Al imprimir solo sale el ticket, a ancho de impresora térmica (80 mm). */
@media print {
  body * {
    visibility: hidden !important;
  }
  #sale-ticket-print,
  #sale-ticket-print * {
    visibility: visible !important;
  }
  .sale-ticket-overlay {
    position: absolute !important;
    inset: 0 auto auto 0 !important;
    display: block !important;
    overflow: visible !important;
    background: none !important;
    padding: 0 !important;
  }
  #sale-ticket-print {
    width: 72mm;
    padding: 0 !important;
    font-size: 12px;
  }
  @page {
    margin: 4mm;
  }
}
</style>
