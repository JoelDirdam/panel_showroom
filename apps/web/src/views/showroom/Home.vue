<template>
  <admin-layout>
    <page-breadcrumb page-title="Home" />

    <div
      v-if="trialBanner"
      class="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-500/30 dark:bg-sky-500/10"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-gray-800 dark:text-white">{{ trialBanner.title }}</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ trialBanner.body }}</p>
        </div>
        <span
          class="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200"
        >
          {{ trialBanner.badge }}
        </span>
      </div>
    </div>

    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white">
        ¡Bienvenido{{ auth.user?.name ? `, ${auth.user.name.split(' ')[0]}` : '' }}!
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ auth.user?.tenant?.name ? `Negocio: ${auth.user.tenant.name}` : 'Configura tu panel paso a paso.' }}
      </p>
    </div>

    <div
      v-if="showFirstSteps"
      class="mb-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Primeros pasos
        </h2>
        <button
          v-if="canDismissFirstSteps"
          type="button"
          class="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
          title="Ocultar primeros pasos"
          aria-label="Ocultar primeros pasos"
          @click="dismissFirstSteps"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      <ul class="mt-4 space-y-3">
        <li
          v-for="step in firstSteps"
          :key="step.id"
          class="flex items-start gap-3 text-sm"
        >
          <span
            class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            :class="step.done ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'"
          />
          <div class="flex-1">
            <router-link
              v-if="step.to"
              :to="step.to"
              class="font-medium text-gray-800 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
            >
              {{ step.label }}
            </router-link>
            <span v-else class="font-medium text-gray-800 dark:text-white">{{ step.label }}</span>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ step.hint }}</p>
          </div>
          <span class="text-xs text-gray-400">{{ step.done ? 'Listo' : 'Pendiente' }}</span>
        </li>
      </ul>
    </div>

    <div class="mb-8 grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Ventas hoy</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
            {{ summary?.salesTodayCount ?? 0 }}
          </h3>
          <p class="mt-1 text-xs text-gray-500">${{ formatMoney(summary?.salesTodayTotal ?? 0) }}</p>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Productos</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
            {{ summary?.totalProducts ?? 0 }}
          </h3>
        </div>
      </div>
      <div v-if="auth.isAdmin" class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Marcas</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
            {{ summary?.totalBrands ?? 0 }}
          </h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Stock bajo</p>
          <h3 class="mt-2 text-2xl font-bold text-error-500">{{ summary?.lowStockCount ?? 0 }}</h3>
        </div>
      </div>
    </div>

    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-gray-800 dark:text-white">Módulos</h2>
      <router-link to="/dashboard" class="text-sm font-medium text-brand-500 hover:text-brand-600">
        Ver Dashboard completo →
      </router-link>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <template v-for="module in visibleModules" :key="`${module.name}-${module.path ?? module.id}`">
        <router-link
          v-if="module.path"
          :to="module.path"
          class="group flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
            <component :is="module.icon" class="h-4 w-4" />
          </div>
          <h3 class="text-sm font-semibold text-gray-800 dark:text-white">{{ module.name }}</h3>
          <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{{ module.description }}</p>
        </router-link>
        <div
          v-else
          class="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 opacity-70 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="mb-3 flex items-start justify-between gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
              <component :is="module.icon" class="h-4 w-4" />
            </div>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
              Próximamente
            </span>
          </div>
          <h3 class="text-sm font-semibold text-gray-800 dark:text-white">{{ module.name }}</h3>
          <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{{ module.description }}</p>
        </div>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useAuthStore } from '@/stores/auth'
import { NEGOCIO_MODULE_LINKS } from '@/lib/modules'
import { fetchHomeSummary, type HomeSummary } from '@/services/api'
import { formatMoney } from '@/composables/useCajaSession'

const auth = useAuthStore()
const summary = ref<HomeSummary | null>(null)
const firstStepsDismissed = ref(false)

const setup = computed(() => auth.user?.setupStatus)
const prefsConfigured = computed(() => {
  const p = auth.user?.preferences
  if (!p) return false
  return p.createdAt !== p.updatedAt
})

const prefsDone = computed(() => prefsConfigured.value)
const brandsDone = computed(() => (setup.value?.brandCount ?? 0) > 0)
const productsDone = computed(() => (summary.value?.totalProducts ?? 0) > 0)
const employeesDone = computed(() => (summary.value?.totalEmployees ?? 0) > 0)
const coreStepsDone = computed(() => prefsDone.value && brandsDone.value && productsDone.value)

const firstSteps = computed(() => [
  {
    id: 'prefs',
    label: '1. Llenar preferencias',
    hint: 'Comisiones, IVA, ticket y corte',
    to: '/preferences',
    done: prefsDone.value,
  },
  {
    id: 'brands',
    label: '2. Registrar marcas',
    hint: setup.value?.hasHouseBrand
      ? 'Ya tienes marca propia; puedes agregar más'
      : 'Marca propia u otras marcas de proveedores',
    to: '/brands',
    done: brandsDone.value,
  },
  {
    id: 'products',
    label: '3. Registrar productos',
    hint: 'Catálogo vinculado a tus marcas',
    to: '/products',
    done: productsDone.value,
  },
  {
    id: 'employees',
    label: '4. Registrar empleados (opcional)',
    hint: 'En Caja puedes atender tú si aún no hay empleados',
    to: '/employees',
    done: employeesDone.value,
  },
])

/** Solo se puede cerrar cuando lo obligatorio ya está listo y solo falta empleados. */
const canDismissFirstSteps = computed(
  () => coreStepsDone.value && !employeesDone.value,
)

const showFirstSteps = computed(() => {
  if (firstStepsDismissed.value) return false
  if (coreStepsDone.value && employeesDone.value) return false
  return true
})

function firstStepsDismissKey(tenantId: string) {
  return `first-steps-dismissed:${tenantId}`
}

function dismissFirstSteps() {
  const tenantId = auth.user?.tenantId ?? auth.user?.tenant?.id
  if (!tenantId) return
  localStorage.setItem(firstStepsDismissKey(tenantId), '1')
  firstStepsDismissed.value = true
}

function loadFirstStepsDismissed() {
  const tenantId = auth.user?.tenantId ?? auth.user?.tenant?.id
  if (!tenantId) {
    firstStepsDismissed.value = false
    return
  }
  firstStepsDismissed.value = localStorage.getItem(firstStepsDismissKey(tenantId)) === '1'
}

const visibleModules = computed(() =>
  NEGOCIO_MODULE_LINKS.filter((m) => !m.adminOnly || auth.isAdmin),
)

const trialBanner = computed(() => {
  const sub = auth.user?.subscription
  if (!sub) return null
  if (sub.status === 'EXPIRED') {
    return {
      title: 'Tu prueba o suscripción venció',
      body: 'Renueva tu plan para seguir usando el panel. El pago con Stripe / Mercado Pago estará disponible pronto.',
      badge: 'Cuenta vencida',
    }
  }
  if (sub.status === 'TRIALING') {
    const ends = new Date(sub.trialEndsAt).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    return {
      title: 'Prueba gratuita activa',
      body: `Tienes acceso completo hasta el ${ends}. Después deberás suscribirte para continuar.`,
      badge: 'Tu cuenta está en modo prueba',
    }
  }
  return null
})

onMounted(async () => {
  loadFirstStepsDismissed()
  try {
    summary.value = await fetchHomeSummary()
  } catch {
    summary.value = null
  }
})
</script>
