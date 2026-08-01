<template>
  <admin-layout>
    <page-breadcrumb :page-title="auth.isAdmin ? 'Órdenes de Stock' : 'Solicitudes de productos'" />

    <template v-if="auth.isAdmin">
      <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Revisa, filtra y resuelve las órdenes de alta, restock y retiro de stock que envían las marcas. Usa los
        filtros para acotar por fecha, estado o marca antes de aceptar, rechazar o imprimir etiquetas.
      </p>

      <component-card title="Órdenes pendientes" class-name="mb-6" data-tour="requests-pending">
        <div class="flex flex-wrap items-center gap-6">
          <div>
            <p class="text-3xl font-semibold text-gray-800 dark:text-white">
              {{ productRequestsStore.pendingCount }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Solicitudes pendientes de revisión</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-full bg-warning-50 px-3 py-1 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
              Pendientes: {{ statusCounts.PENDING }}
            </span>
            <span class="rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
              Aceptadas: {{ statusCounts.ACCEPTED }}
            </span>
            <span class="rounded-full bg-error-50 px-3 py-1 text-xs font-medium text-error-700 dark:bg-error-500/10 dark:text-error-400">
              Rechazadas: {{ statusCounts.REJECTED }}
            </span>
          </div>
        </div>
      </component-card>

      <component-card title="Filtros" class-name="mb-6">
        <form class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" @submit.prevent="applyFilters">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Desde</label>
            <input v-model="filters.from" type="date" class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Hasta</label>
            <input v-model="filters.to" type="date" class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Estado</label>
            <select v-model="filters.status" class="field">
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="ACCEPTED">Aceptada</option>
              <option value="REJECTED">Rechazada</option>
            </select>
          </div>
          <div>
            <label data-tour="requests-brand-filter" class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Marca</label>
            <select v-model="filters.brandId" class="field">
              <option value="">Todas las marcas</option>
              <option v-for="brand in brandsList" :key="brand.id" :value="brand.id">{{ brand.name }}</option>
            </select>
          </div>
          <button type="submit" class="primary-button h-[42px]">Aplicar filtro</button>
        </form>
      </component-card>

      <component-card title="Solicitudes">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            Seleccionar todos ({{ requests.length }})
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              :disabled="selectedLabelItems.length === 0"
              @click="showLabelModal = true"
            >
              Imprimir etiquetas ({{ selectedLabelItems.length }})
            </button>
            <button
              type="button"
              class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="selectedPendingIds.length === 0 || rejecting || saving"
              @click="rejectSelected"
            >
              {{ rejecting ? 'Rechazando…' : `Rechazar seleccionadas (${selectedPendingIds.length})` }}
            </button>
            <button
              data-tour="requests-accept"
              type="button"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="selectedPendingIds.length === 0 || saving || rejecting"
              @click="acceptSelected"
            >
              {{ saving ? 'Aceptando…' : `Aceptar seleccionadas (${selectedPendingIds.length})` }}
            </button>
          </div>
        </div>

        <p v-if="error" class="mb-3 text-sm text-error-500">{{ error }}</p>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th class="py-3 pr-3"></th>
                <th class="py-3 pr-4">Marca</th>
                <th class="py-3 pr-4">Solicitud</th>
                <th class="py-3 pr-4">Producto</th>
                <th class="py-3 pr-4">Cantidad</th>
                <th class="py-3 pr-4">Estado</th>
                <th class="py-3 pr-4">Observaciones</th>
                <th class="py-3 pr-4">Contacto</th>
                <th class="py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in groupedRequests" :key="group.brandId">
                <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                  <td colspan="9" class="px-1 py-2.5">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <span class="font-semibold text-gray-800 dark:text-white">
                        {{ group.brandName }}
                        <span class="ml-1 font-normal text-gray-500">
                          · {{ group.requests.length }}
                          {{ group.requests.length === 1 ? 'solicitud' : 'solicitudes' }}
                        </span>
                      </span>
                      <button
                        type="button"
                        class="text-xs text-brand-500 hover:underline"
                        @click="toggleBrandSelection(group)"
                      >
                        {{ isBrandFullySelected(group) ? 'Quitar selección' : 'Seleccionar marca' }}
                      </button>
                    </div>
                  </td>
                </tr>
                <tr
                  v-for="request in group.requests"
                  :key="request.id"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="py-3 pr-3">
                    <input v-model="selected" type="checkbox" :value="request.id" />
                  </td>
                  <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ request.brand.name }}</td>
                  <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ typeLabel(request.type) }}</td>
                  <td class="py-3 pr-4 text-gray-800 dark:text-white">
                    {{ request.product?.name || request.name }}
                    <span class="block text-xs text-gray-400">{{ request.product?.sku || request.sku }}</span>
                  </td>
                  <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ request.quantity }}</td>
                  <td class="py-3 pr-4">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusMeta(request.status).class">
                      {{ statusMeta(request.status).label }}
                    </span>
                  </td>
                  <td class="max-w-xs py-3 pr-4 text-gray-600 dark:text-gray-300">{{ request.notes || '—' }}</td>
                  <td class="py-3 pr-4">
                    <a
                      v-if="request.brand.whatsapp"
                      :href="whatsappUrl(request)"
                      target="_blank"
                      rel="noopener"
                      class="text-success-500 hover:underline"
                    >
                      WhatsApp
                    </a>
                    <span v-else class="text-gray-400">—</span>
                  </td>
                  <td class="py-3">
                    <button type="button" class="text-brand-500 hover:underline" @click="openDetail(request)">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              </template>
              <tr v-if="requests.length === 0">
                <td colspan="9" class="py-8 text-center text-gray-500">
                  No hay solicitudes con estos filtros.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </component-card>
    </template>

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-2">
        <component-card title="Solicitar nuevo producto" data-tour="requests-new-product">
          <form class="space-y-4" @submit.prevent="submitProduct">
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                Nombre <span class="text-error-500">*</span>
              </label>
              <input v-model="productForm.name" required class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                SKU <span class="text-error-500">*</span>
              </label>
              <input v-model="productForm.sku" required class="field" />
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                  Precio <span class="text-error-500">*</span>
                </label>
                <input
                  v-model.number="productForm.price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  class="field"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                  Cantidad <span class="text-error-500">*</span>
                </label>
                <input
                  v-model.number="productForm.quantity"
                  required
                  type="number"
                  min="0"
                  class="field"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                  Stock mínimo <span class="text-error-500">*</span>
                </label>
                <input
                  v-model.number="productForm.minStock"
                  required
                  type="number"
                  min="0"
                  class="field"
                />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Descripción</label>
              <textarea v-model="productForm.description" rows="2" class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Observaciones</label>
              <textarea v-model="productForm.notes" rows="2" class="field" />
            </div>
            <button class="primary-button" :disabled="saving">Enviar solicitud</button>
          </form>
        </component-card>

        <component-card title="Solicitar restock" data-tour="requests-restock">
          <form class="space-y-4" @submit.prevent="submitRestock">
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Producto</label>
              <select v-model="restockForm.productId" required class="field">
                <option value="">Selecciona un producto</option>
                <option v-for="product in products" :key="product.id" :value="product.id">
                  {{ product.name }} — {{ product.sku }} (actual: {{ product.stock?.quantity ?? 0 }})
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad</label>
              <input v-model.number="restockForm.quantity" required type="number" min="1" class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Observaciones</label>
              <textarea v-model="restockForm.notes" rows="3" class="field" />
            </div>
            <button class="primary-button" :disabled="saving">Enviar solicitud</button>
          </form>
        </component-card>
      </div>

      <p v-if="error" class="mt-4 text-sm text-error-500">{{ error }}</p>
      <p v-if="success" class="mt-4 text-sm text-success-500">{{ success }}</p>

      <component-card title="Mis solicitudes" class-name="mt-6">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th class="py-3 pr-4">Fecha</th>
                <th class="py-3 pr-4">Tipo</th>
                <th class="py-3 pr-4">Producto</th>
                <th class="py-3 pr-4">Cantidad</th>
                <th class="py-3 pr-4">Estado</th>
                <th class="py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="request in requests" :key="request.id" class="border-b border-gray-100 dark:border-gray-800">
                <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ formatDate(request.createdAt) }}</td>
                <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ typeLabel(request.type) }}</td>
                <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ request.product?.name || request.name }}</td>
                <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ request.quantity }}</td>
                <td class="py-3 pr-4">
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusMeta(request.status).class">
                    {{ statusMeta(request.status).label }}
                  </span>
                </td>
                <td class="py-3">
                  <div class="flex flex-wrap items-center gap-3">
                    <button
                      v-if="request.status === 'PENDING'"
                      type="button"
                      class="text-brand-500 hover:underline"
                      @click="openEdit(request)"
                    >
                      Editar
                    </button>
                    <button
                      v-if="request.status === 'ACCEPTED' && (request.product || request.productId)"
                      type="button"
                      class="text-brand-500 hover:underline"
                      @click="printOwnLabel(request)"
                    >
                      Imprimir etiqueta
                    </button>
                    <button type="button" class="text-gray-500 hover:underline" @click="openDetail(request)">
                      Ver detalle
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="requests.length === 0">
                <td colspan="6" class="py-8 text-center text-gray-500">Aún no hay solicitudes.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </component-card>

      <div v-if="editing" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
          <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Editar solicitud pendiente
          </h3>
          <form class="space-y-4" @submit.prevent="saveEdit">
            <template v-if="editing.type === 'CREATE_PRODUCT'">
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                  Nombre <span class="text-error-500">*</span>
                </label>
                <input v-model="editForm.name" required class="field" />
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                  SKU <span class="text-error-500">*</span>
                </label>
                <input v-model="editForm.sku" required class="field" />
              </div>
              <div class="grid gap-3 sm:grid-cols-3">
                <div>
                  <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                    Precio <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model.number="editForm.price"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    class="field"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                    Cantidad <span class="text-error-500">*</span>
                  </label>
                  <input v-model.number="editForm.quantity" required type="number" min="0" class="field" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                    Stock mínimo <span class="text-error-500">*</span>
                  </label>
                  <input v-model.number="editForm.minStock" required type="number" min="0" class="field" />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Descripción</label>
                <textarea v-model="editForm.description" rows="2" class="field" />
              </div>
            </template>
            <template v-else>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Producto</label>
                <select v-model="editForm.productId" required class="field">
                  <option value="">Selecciona un producto</option>
                  <option v-for="product in products" :key="product.id" :value="product.id">
                    {{ product.name }} — {{ product.sku }}
                  </option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad</label>
                <input v-model.number="editForm.quantity" required type="number" min="1" class="field" />
              </div>
            </template>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Observaciones</label>
              <textarea v-model="editForm.notes" rows="2" class="field" />
            </div>
            <p v-if="editError" class="text-sm text-error-500">{{ editError }}</p>
            <div class="flex justify-end gap-2">
              <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600" :disabled="saving" @click="closeEdit">
                Cancelar
              </button>
              <button type="submit" class="primary-button" :disabled="saving">
                {{ saving ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>

    <!-- Ver detalle (admin y marca) -->
    <div v-if="detailRequest" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4" @click.self="detailRequest = null">
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Detalle de la solicitud</h3>
          <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusMeta(detailRequest.status).class">
            {{ statusMeta(detailRequest.status).label }}
          </span>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Marca</dt>
            <dd class="text-gray-800 dark:text-white">{{ detailRequest.brand.name }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Tipo</dt>
            <dd class="text-gray-800 dark:text-white">{{ typeLabel(detailRequest.type) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Producto</dt>
            <dd class="text-gray-800 dark:text-white">{{ detailRequest.product?.name || detailRequest.name || '—' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">SKU</dt>
            <dd class="text-gray-800 dark:text-white">{{ detailRequest.product?.sku || detailRequest.sku || '—' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Cantidad</dt>
            <dd class="text-gray-800 dark:text-white">{{ detailRequest.quantity }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Precio</dt>
            <dd class="text-gray-800 dark:text-white">
              {{ (detailRequest.product?.price ?? detailRequest.price) ? `$${detailRequest.product?.price ?? detailRequest.price}` : '—' }}
            </dd>
          </div>
          <div class="col-span-2">
            <dt class="text-gray-500 dark:text-gray-400">Observaciones</dt>
            <dd class="text-gray-800 dark:text-white">{{ detailRequest.notes || '—' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Solicitado por</dt>
            <dd class="text-gray-800 dark:text-white">{{ detailRequest.requestedBy?.name || '—' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Fecha</dt>
            <dd class="text-gray-800 dark:text-white">{{ formatDate(detailRequest.createdAt) }}</dd>
          </div>
          <template v-if="detailRequest.status === 'ACCEPTED'">
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Aceptado por</dt>
              <dd class="text-gray-800 dark:text-white">{{ detailRequest.acceptedBy?.name || '—' }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Fecha de aceptación</dt>
              <dd class="text-gray-800 dark:text-white">{{ detailRequest.acceptedAt ? formatDate(detailRequest.acceptedAt) : '—' }}</dd>
            </div>
          </template>
          <template v-if="detailRequest.status === 'REJECTED'">
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Rechazado por</dt>
              <dd class="text-gray-800 dark:text-white">{{ detailRequest.rejectedBy?.name || '—' }}</dd>
            </div>
            <div>
              <dt class="text-gray-500 dark:text-gray-400">Fecha de rechazo</dt>
              <dd class="text-gray-800 dark:text-white">{{ detailRequest.rejectedAt ? formatDate(detailRequest.rejectedAt) : '—' }}</dd>
            </div>
          </template>
        </dl>
        <div class="mt-5 flex justify-end">
          <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300" @click="detailRequest = null">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <LabelPrintModal v-model="showLabelModal" :items="selectedLabelItems" :default-size-id="defaultLabelSizeId" />
    <LabelPrintModal v-model="showOwnLabelModal" :items="ownLabelItems" :default-size-id="defaultLabelSizeId" />
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import LabelPrintModal from '@/components/labels/LabelPrintModal.vue'
import api, {
  acceptProductRequests,
  fetchPreferences,
  fetchProductRequests,
  rejectProductRequests,
  type Brand,
  type Product,
  type ProductRequest,
  type ProductRequestStatus,
  type ProductRequestType,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useProductRequestsStore } from '@/stores/productRequests'
import { matchLabelSizeFromMm, type LabelPrintItem, type LabelSizeId } from '@/utils/labelPdf'

const route = useRoute()
const auth = useAuthStore()
const productRequestsStore = useProductRequestsStore()
const requests = ref<ProductRequest[]>([])
const products = ref<Product[]>([])
const brandsList = ref<Brand[]>([])
const selected = ref<string[]>([])
const saving = ref(false)
const rejecting = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const detailRequest = ref<ProductRequest | null>(null)
const showLabelModal = ref(false)
const showOwnLabelModal = ref(false)
const ownLabelItems = ref<LabelPrintItem[]>([])
const defaultLabelSizeId = ref<LabelSizeId | null>(null)

const filters = reactive({
  from: '',
  to: '',
  status: 'PENDING' as ProductRequestStatus | 'ALL',
  brandId: '',
})

const productForm = reactive({
  name: '',
  sku: '',
  price: null as number | null,
  quantity: null as number | null,
  minStock: null as number | null,
  description: '',
  notes: '',
})
const restockForm = reactive({ productId: '', quantity: 1, notes: '' })
const editing = ref<ProductRequest | null>(null)
const editError = ref<string | null>(null)
const editForm = reactive({
  name: '',
  sku: '',
  price: null as number | null,
  quantity: null as number | null,
  minStock: null as number | null,
  description: '',
  notes: '',
  productId: '',
})

type BrandGroup = {
  brandId: string
  brandName: string
  requests: ProductRequest[]
}

const groupedRequests = computed(() => {
  const map = new Map<string, BrandGroup>()
  for (const request of requests.value) {
    const existing = map.get(request.brandId)
    if (existing) {
      existing.requests.push(request)
    } else {
      map.set(request.brandId, {
        brandId: request.brandId,
        brandName: request.brand.name,
        requests: [request],
      })
    }
  }
  return [...map.values()].sort((a, b) => a.brandName.localeCompare(b.brandName, 'es'))
})

const allSelected = computed(
  () => requests.value.length > 0 && requests.value.every((request) => selected.value.includes(request.id)),
)

const statusCounts = computed(() => {
  const counts: Record<ProductRequestStatus, number> = { PENDING: 0, ACCEPTED: 0, REJECTED: 0 }
  for (const request of requests.value) counts[request.status] += 1
  return counts
})

const selectedRequests = computed(() => requests.value.filter((request) => selected.value.includes(request.id)))

const selectedPendingIds = computed(() =>
  selectedRequests.value.filter((request) => request.status === 'PENDING').map((request) => request.id),
)

const selectedLabelItems = computed<LabelPrintItem[]>(() => requestsToLabelItems(selectedRequests.value))

function requestsToLabelItems(items: ProductRequest[]): LabelPrintItem[] {
  return items
    .filter((request) => request.status === 'ACCEPTED')
    .map((request) => ({
      sku: request.product?.sku || request.sku || '',
      name: request.product?.name || request.name || '',
      price: request.product?.price ?? request.price,
      quantity: request.quantity,
    }))
    .filter((item) => item.sku)
}

async function load() {
  if (auth.isAdmin) {
    requests.value = await fetchProductRequests({
      status: filters.status,
      brandId: filters.brandId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    })
    selected.value = []
    await productRequestsStore.fetchPendingCount()
  } else {
    const data = await fetchProductRequests({ status: 'ALL' })
    requests.value = data
    selected.value = []
    productRequestsStore.setPendingCount(data.filter((request) => request.status === 'PENDING').length)
    const response = await api.get<Product[]>('/products')
    products.value = response.data
  }
}

function applyFilters() {
  return load()
}

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selected.value = checked ? requests.value.map((request) => request.id) : []
}

function isBrandFullySelected(group: BrandGroup) {
  return group.requests.every((request) => selected.value.includes(request.id))
}

function toggleBrandSelection(group: BrandGroup) {
  const ids = group.requests.map((request) => request.id)
  if (isBrandFullySelected(group)) {
    selected.value = selected.value.filter((id) => !ids.includes(id))
    return
  }
  selected.value = [...new Set([...selected.value, ...ids])]
}

async function acceptSelected() {
  if (selectedPendingIds.value.length === 0) return
  saving.value = true
  error.value = null
  try {
    await acceptProductRequests(selectedPendingIds.value)
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudieron aceptar las solicitudes')
  } finally {
    saving.value = false
  }
}

async function rejectSelected() {
  if (selectedPendingIds.value.length === 0) return
  rejecting.value = true
  error.value = null
  try {
    await rejectProductRequests(selectedPendingIds.value)
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudieron rechazar las solicitudes')
  } finally {
    rejecting.value = false
  }
}

function openDetail(request: ProductRequest) {
  detailRequest.value = request
}

function printOwnLabel(request: ProductRequest) {
  ownLabelItems.value = requestsToLabelItems([request])
  showOwnLabelModal.value = true
}

async function submitProduct() {
  error.value = null
  if (!productForm.name.trim() || !productForm.sku.trim()) {
    error.value = 'Nombre y SKU son obligatorios'
    return
  }
  if (
    productForm.price == null ||
    Number.isNaN(productForm.price) ||
    productForm.quantity == null ||
    Number.isNaN(productForm.quantity) ||
    productForm.minStock == null ||
    Number.isNaN(productForm.minStock)
  ) {
    error.value = 'Precio, cantidad y stock mínimo son obligatorios'
    return
  }

  await submit({
    type: 'CREATE_PRODUCT',
    name: productForm.name.trim(),
    sku: productForm.sku.trim(),
    price: productForm.price,
    quantity: productForm.quantity,
    minStock: productForm.minStock,
    description: productForm.description || null,
    notes: productForm.notes || null,
  })
  if (!error.value) {
    Object.assign(productForm, {
      name: '',
      sku: '',
      price: null,
      quantity: null,
      minStock: null,
      description: '',
      notes: '',
    })
  }
}

async function submitRestock() {
  await submit({
    type: 'RESTOCK',
    productId: restockForm.productId,
    quantity: restockForm.quantity,
    notes: restockForm.notes || null,
  })
  if (!error.value) Object.assign(restockForm, { productId: '', quantity: 1, notes: '' })
}

async function submit(payload: Record<string, unknown>) {
  saving.value = true
  error.value = null
  success.value = null
  try {
    await api.post('/product-requests', payload)
    success.value = 'Solicitud enviada al showroom.'
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo enviar la solicitud')
  } finally {
    saving.value = false
  }
}

function openEdit(request: ProductRequest) {
  if (request.status !== 'PENDING') return
  editing.value = request
  editError.value = null
  Object.assign(editForm, {
    name: request.name || '',
    sku: request.sku || '',
    price: request.price != null ? Number(request.price) : null,
    quantity: request.quantity,
    minStock: request.minStock,
    description: request.description || '',
    notes: request.notes || '',
    productId: request.productId || '',
  })
}

function closeEdit() {
  if (saving.value) return
  editing.value = null
  editError.value = null
}

async function saveEdit() {
  const request = editing.value
  if (!request) return

  if (request.type === 'CREATE_PRODUCT') {
    if (!editForm.name.trim() || !editForm.sku.trim()) {
      editError.value = 'Nombre y SKU son obligatorios'
      return
    }
    if (
      editForm.price == null ||
      Number.isNaN(editForm.price) ||
      editForm.quantity == null ||
      Number.isNaN(editForm.quantity) ||
      editForm.minStock == null ||
      Number.isNaN(editForm.minStock)
    ) {
      editError.value = 'Precio, cantidad y stock mínimo son obligatorios'
      return
    }
  }

  saving.value = true
  editError.value = null
  error.value = null
  success.value = null
  try {
    const payload =
      request.type === 'CREATE_PRODUCT'
        ? {
            name: editForm.name.trim(),
            sku: editForm.sku.trim(),
            price: editForm.price,
            quantity: editForm.quantity,
            minStock: editForm.minStock,
            description: editForm.description || null,
            notes: editForm.notes || null,
          }
        : {
            productId: editForm.productId,
            quantity: editForm.quantity,
            notes: editForm.notes || null,
          }

    await api.patch(`/product-requests/${request.id}`, payload)
    success.value = 'Solicitud actualizada.'
    editing.value = null
    await load()
  } catch (e: unknown) {
    editError.value = apiError(e, 'No se pudo actualizar la solicitud')
  } finally {
    saving.value = false
  }
}

function typeLabel(type: ProductRequestType) {
  if (type === 'CREATE_PRODUCT') return 'Nuevo producto'
  if (type === 'RESTOCK') return 'Restock'
  return 'Retiro'
}

function statusMeta(status: ProductRequestStatus) {
  if (status === 'ACCEPTED') {
    return {
      label: 'Aceptada',
      class: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
    }
  }
  if (status === 'REJECTED') {
    return {
      label: 'Rechazada',
      class: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400',
    }
  }
  return {
    label: 'Pendiente',
    class: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  }
}

function whatsappUrl(request: ProductRequest) {
  const phone = request.brand.whatsapp?.replace(/\D/g, '') || ''
  const item = request.product?.name || request.name || 'producto'
  const message = request.notes
    ? `Hola, tenemos observaciones sobre tu solicitud de ${item}.`
    : `Hola, te contactamos por tu solicitud de ${item}.`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

function apiError(error: unknown, fallback: string) {
  return (error as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
}

onMounted(async () => {
  // Permite llegar filtrado desde la pestaña Órdenes de una marca.
  const brandIdParam = route.query.brandId
  if (typeof brandIdParam === 'string' && brandIdParam) {
    filters.brandId = brandIdParam
  }

  if (auth.isAdmin) {
    try {
      const [{ data: brands }, prefs] = await Promise.all([api.get<Brand[]>('/brands'), fetchPreferences()])
      brandsList.value = brands
      defaultLabelSizeId.value = matchLabelSizeFromMm(prefs.labelWidthMm, prefs.labelHeightMm)
    } catch {
      brandsList.value = []
    }
  }

  return load()
})
</script>

<style scoped>
.field {
  width: 100%;
  border: 1px solid #d0d5dd;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.primary-button {
  border-radius: 0.5rem;
  background: #465fff;
  padding: 0.5rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.primary-button:disabled {
  opacity: 0.5;
}

:global(.dark) .field {
  border-color: #344054;
  background: #1d2939;
  color: white;
}
</style>
