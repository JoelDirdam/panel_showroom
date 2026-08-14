<template>
  <component-card title="Órdenes / solicitudes de la marca">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Las solicitudes de alta, restock y <strong>retiro</strong> de productos de
      <strong>{{ brand.name }}</strong> aparecen aquí para el negocio. Acepta o rechaza cada solicitud en el
      módulo de Órdenes.
    </p>
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Solicitudes pendientes: <span class="font-semibold text-gray-800 dark:text-white">{{ pendingCount }}</span>
      </p>
      <router-link
        :to="{ path: '/product-requests', query: { brandId: brand.id } }"
        class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        Ir a Órdenes de esta marca
      </router-link>
    </div>
  </component-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type Brand, type ProductRequest } from '@/services/api'

const props = defineProps<{ brand: Brand }>()

const pendingCount = ref(0)

onMounted(async () => {
  try {
    const { data } = await api.get<ProductRequest[]>('/product-requests', { params: { status: 'PENDING' } })
    pendingCount.value = data.filter((r) => r.brandId === props.brand.id).length
  } catch {
    pendingCount.value = 0
  }
})
</script>
