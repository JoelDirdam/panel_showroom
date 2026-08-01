<template>
  <admin-layout>
    <page-breadcrumb page-title="Módulos de tu negocio" />

    <div class="mb-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
        ¡Listo, {{ auth.user?.tenant?.name ?? 'tu negocio' }} está configurado!
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Este es tu Plan Negocio. Explora los módulos disponibles o continúa a tu Dashboard.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <template v-for="module in visibleModules" :key="module.id">
        <router-link
          v-if="module.path"
          :to="module.path"
          class="group flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-gray-800 dark:text-white">{{ module.name }}</h3>
          <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{{ module.description }}</p>
          <span class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-500 group-hover:text-brand-600">
            Abrir <ArrowRight class="h-3.5 w-3.5" />
          </span>
        </router-link>
        <div
          v-else
          class="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 opacity-70 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="flex items-start justify-between">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">{{ module.name }}</h3>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
              Próximamente
            </span>
          </div>
          <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{{ module.description }}</p>
        </div>
      </template>
    </div>

    <div class="mt-8 flex justify-center">
      <router-link
        to="/"
        class="rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
      >
        Ir a mi Dashboard
      </router-link>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useAuthStore } from '@/stores/auth'
import { NEGOCIO_MODULE_LINKS } from '@/lib/modules'

const auth = useAuthStore()

const visibleModules = computed(() =>
  NEGOCIO_MODULE_LINKS.filter((m) => !m.adminOnly || auth.isAdmin),
)
</script>
