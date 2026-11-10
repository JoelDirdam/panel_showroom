<template>
  <footer id="contacto" class="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
    <div class="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-3">
      <div>
        <div class="flex items-center gap-2.5">
          <span class="text-2xl font-extrabold text-gray-800 dark:text-white">COSDI</span>
        </div>
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Consultoría y Soluciones Digitales. Software a la medida y app para administrar negocios y agendar citas, desde Durango, México.
        </p>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Contacto</h3>
        <ul class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>
            <a :href="`mailto:${BUSINESS.email}`" class="hover:text-brand-500">{{ BUSINESS.email }}</a>
          </li>
          <li>
            <a :href="BUSINESS.whatsappLink" target="_blank" rel="noopener" class="hover:text-brand-500">
              WhatsApp {{ BUSINESS.phone }}
            </a>
          </li>
          <li>{{ BUSINESS.city }}, {{ BUSINESS.state }}, {{ BUSINESS.country }}</li>
        </ul>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Legal</h3>
        <ul class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li><router-link to="/privacidad" class="hover:text-brand-500">Aviso de privacidad</router-link></li>
          <li><router-link to="/terminos" class="hover:text-brand-500">Términos y condiciones</router-link></li>
          <li><router-link to="/login" class="hover:text-brand-500">Ingresar al panel</router-link></li>
        </ul>
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-800">
      <p class="mx-auto max-w-7xl px-6 py-5 text-xs text-gray-500 dark:text-gray-500">
        © {{ year }} COSDI · Operado por {{ BUSINESS.legalName }}
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { BUSINESS } from '@/lib/business'

const year = new Date().getFullYear()
</script>
