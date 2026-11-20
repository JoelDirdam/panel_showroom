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
          <li><router-link to="/terminos" class="hover:text-brand-500">Términos y condiciones</router-link></li>
          <li><router-link to="/privacidad" class="hover:text-brand-500">Aviso de privacidad</router-link></li>
          <li><router-link to="/reembolsos" class="hover:text-brand-500">Reembolsos y cancelación</router-link></li>
          <li><router-link to="/conservacion-de-datos" class="hover:text-brand-500">Conservación de datos</router-link></li>
          <li><router-link to="/proveedores" class="hover:text-brand-500">Proveedores que tratan datos</router-link></li>
          <li><router-link to="/derechos-de-autor" class="hover:text-brand-500">Reclamos de derechos de autor</router-link></li>
          <li><router-link to="/cookies" class="hover:text-brand-500">Política de cookies</router-link></li>
          <li>
            <button type="button" class="text-left underline hover:text-brand-500" @click="openCookiePreferences">
              Preferencias de cookies
            </button>
          </li>
          <li><a href="/licencias-terceros.txt" class="hover:text-brand-500">Licencias de software de terceros</a></li>
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
import { openCookiePreferences } from '@/lib/consent'

const year = new Date().getFullYear()
</script>
