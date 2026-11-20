<template>
  <LegalPage title="Política de cookies" :updated="POLICIES_UPDATED">
    <p>
      Las cookies y el almacenamiento local son pequeños datos que un sitio guarda en tu navegador. Aquí explicamos
      cuáles usa <strong>COSDI</strong> y cómo decidir sobre ellas.
    </p>

    <h2>Tu decisión actual</h2>
    <p role="status">
      <template v-if="consent.decided">
        Analítica: <strong>{{ consent.analytics ? 'aceptada' : 'rechazada' }}</strong> · Publicidad:
        <strong>{{ consent.marketing ? 'aceptada' : 'rechazada' }}</strong>.
      </template>
      <template v-else>Todavía no has elegido: las cookies opcionales están desactivadas.</template>
    </p>
    <p>
      <button
        type="button"
        class="ui-btn ui-btn-secondary"
        @click="openCookiePreferences"
      >
        Cambiar mis preferencias de cookies
      </button>
    </p>

    <h2>1. Necesarias (siempre activas)</h2>
    <p>Sin ellas el sitio no funciona; no requieren consentimiento y no se usan para rastrearte.</p>
    <ul>
      <li><strong>Sesión</strong> (<code>token</code>, almacenamiento local): mantiene tu sesión iniciada en el panel.</li>
      <li><strong>Preferencias</strong> (tema claro/oscuro, guías ya vistas): recuerdan cómo usas el panel.</li>
      <li><strong>Consentimiento</strong> (<code>cosdi.cookieConsent</code>): recuerda tu decisión sobre las cookies durante 12 meses.</li>
      <li><strong>Pago</strong>: al pagar, Stripe usa sus propias cookies en su página para prevenir fraude.</li>
    </ul>

    <h2>2. Analítica (opcionales)</h2>
    <p>
      Solo si las aceptas, y solo en las páginas públicas del sitio (nunca dentro de tu panel ni en la página de
      reservas de un negocio):
    </p>
    <ul>
      <li><strong>Google Analytics 4</strong> (<code>_ga</code>, <code>_ga_*</code>): cuántas personas visitan el sitio y qué páginas ven.</li>
      <li><strong>Hotjar</strong> (<code>_hj*</code>): mapas de calor y recorridos de navegación para mejorar el sitio.</li>
      <li>
        <strong>Contentsquare</strong> (<code>_cs_*</code>): grabaciones de sesión, mapas de calor y embudos para mejorar
        el sitio. Los textos y números que escribes se ocultan en las grabaciones.
      </li>
    </ul>

    <h2>3. Publicidad (opcionales)</h2>
    <ul>
      <li><strong>Pixel de Meta</strong> (<code>_fbp</code>): mide si nuestros anuncios en Facebook e Instagram generan visitas o registros.</li>
    </ul>

    <h2>4. Cómo funciona el bloqueo</h2>
    <p>
      Mientras no aceptes una categoría, sus herramientas no se descargan ni se ejecutan: no es que se “apaguen”, es
      que no llegan a tu navegador. Si aceptas y luego cambias de opinión, al retirar tu consentimiento borramos sus
      cookies y recargamos la página sin ellas. Rechazar no afecta el uso del sitio ni del panel.
    </p>

    <h2>5. Más información</h2>
    <p>
      Los proveedores de estas herramientas están en <router-link to="/proveedores">Proveedores que tratan datos</router-link>
      y el tratamiento de tus datos en el <router-link to="/privacidad">aviso de privacidad</router-link>. Dudas:
      <a :href="`mailto:${B.privacyEmail}`">{{ B.privacyEmail }}</a>.
    </p>
  </LegalPage>
</template>

<script setup lang="ts">
import LegalPage from '@/components/marketing/LegalPage.vue'
import { BUSINESS as B } from '@/lib/business'
import { POLICIES_UPDATED } from '@/lib/legal'
import { consent, openCookiePreferences } from '@/lib/consent'
</script>
