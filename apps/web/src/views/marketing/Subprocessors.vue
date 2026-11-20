<template>
  <LegalPage title="Proveedores que tratan datos" :updated="POLICIES_UPDATED">
    <p>
      Para operar <strong>COSDI</strong> nos apoyamos en los siguientes proveedores (encargados), que tratan datos
      personales por nuestra cuenta, solo para la finalidad indicada y obligados a protegerlos. No vendemos tus datos
      a nadie. Algunos proveedores están fuera de México; al usar el servicio consientes esas transferencias, descritas
      también en el <router-link to="/privacidad">aviso de privacidad</router-link>.
    </p>

    <ul class="!list-none !space-y-4 !pl-0">
      <li
        v-for="p in SUBPROCESSORS"
        :key="p.name"
        class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
      >
        <h2 class="!mt-0 !text-base">{{ p.name }}</h2>
        <dl class="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[9rem_1fr]">
          <dt class="font-medium text-gray-800 dark:text-gray-100">Para qué</dt>
          <dd>{{ p.purpose }}</dd>
          <dt class="font-medium text-gray-800 dark:text-gray-100">Datos</dt>
          <dd>{{ p.data }}</dd>
          <dt class="font-medium text-gray-800 dark:text-gray-100">Ubicación</dt>
          <dd>{{ p.location }}</dd>
          <template v-if="p.condition">
            <dt class="font-medium text-gray-800 dark:text-gray-100">Cuándo</dt>
            <dd>{{ p.condition }}</dd>
          </template>
          <dt class="font-medium text-gray-800 dark:text-gray-100">Privacidad</dt>
          <dd><a :href="p.url" target="_blank" rel="noopener noreferrer">Política del proveedor</a></dd>
        </dl>
      </li>
    </ul>

    <h2>Cambios en esta lista</h2>
    <p>
      Actualizamos esta página antes de empezar a trabajar con un proveedor nuevo. Si tienes dudas u objeciones
      escríbenos a <a :href="`mailto:${B.privacyEmail}`">{{ B.privacyEmail }}</a>.
    </p>
  </LegalPage>
</template>

<script setup lang="ts">
import LegalPage from '@/components/marketing/LegalPage.vue'
import { BUSINESS as B } from '@/lib/business'
import { POLICIES_UPDATED, SUBPROCESSORS } from '@/lib/legal'
</script>
