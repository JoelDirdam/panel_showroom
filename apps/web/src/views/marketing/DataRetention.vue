<template>
  <LegalPage title="Conservación de datos" :updated="POLICIES_UPDATED">
    <p>
      Guardamos tus datos solo el tiempo necesario para darte el servicio y cumplir la ley. Esta página indica cuánto
      tiempo conservamos cada tipo de dato y cuándo se elimina. Complementa el
      <router-link to="/privacidad">aviso de privacidad</router-link>.
    </p>

    <h2>1. Plazos de conservación</h2>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th scope="col" class="py-2 pr-4 font-semibold text-gray-800 dark:text-white">Dato</th>
            <th scope="col" class="py-2 font-semibold text-gray-800 dark:text-white">Cuánto tiempo lo guardamos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.data" class="border-b border-gray-100 align-top dark:border-gray-800">
            <th scope="row" class="py-3 pr-4 font-medium text-gray-800 dark:text-gray-100">{{ row.data }}</th>
            <td class="py-3">{{ row.period }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>2. Cuentas sin suscripción vigente</h2>
    <p>
      Si tu prueba o tu suscripción vence, tu cuenta queda en pausa y tus datos se conservan: puedes entrar para
      pagar, descargar tus datos o eliminar tu cuenta. Si pasan
      <strong>{{ R.inactiveAccountMonths }} meses</strong> sin una suscripción vigente, eliminamos la cuenta y su
      información de forma definitiva. Antes te avisamos por correo con al menos
      <strong>{{ R.inactiveNoticeDays }} días</strong> de anticipación; si no podemos enviarte ese aviso, no
      eliminamos la cuenta.
    </p>

    <h2>3. Eliminación a petición tuya</h2>
    <p>
      Puedes eliminar tu cuenta cuando quieras desde <strong>Mi cuenta → Privacidad y datos</strong>. La eliminación
      es inmediata y definitiva: borra el negocio, sus usuarios, productos, ventas, clientes, citas, conversaciones y
      archivos, y cancela tu suscripción. Antes de hacerlo puedes descargar una copia de tus datos desde la misma
      pantalla.
    </p>

    <h2>4. Qué conservamos después de eliminar una cuenta</h2>
    <p>
      Conservamos únicamente, bloqueados (sin usarlos para nada más) y durante
      <strong>{{ R.evidenceYears }} años</strong>, los registros necesarios para atender responsabilidades legales:
    </p>
    <ul>
      <li>La constancia de aceptación de los términos (correo, nombre, versión, fecha, IP y navegador).</li>
      <li>El historial de consentimientos para correos de marketing.</li>
      <li>El registro de que la cuenta fue eliminada (correo, nombre del negocio y fecha).</li>
    </ul>
    <p>
      Los comprobantes de pago los conserva además nuestro procesador de pagos (Stripe) por el tiempo que le exigen
      las leyes fiscales y financieras. Pasado el plazo, esos registros se eliminan.
    </p>

    <h2>5. Datos de los clientes de tu negocio</h2>
    <p>
      Los datos que registras de tus propios clientes (nombre, teléfono, citas, mensajes) son responsabilidad de tu
      negocio: tú decides cuánto tiempo conservarlos y puedes borrarlos desde el panel. COSDI los elimina cuando se
      elimina tu cuenta.
    </p>

    <h2>6. Dudas</h2>
    <p>
      Escríbenos a <a :href="`mailto:${B.privacyEmail}`">{{ B.privacyEmail }}</a>.
    </p>
  </LegalPage>
</template>

<script setup lang="ts">
import LegalPage from '@/components/marketing/LegalPage.vue'
import { BUSINESS as B } from '@/lib/business'
import { POLICIES_UPDATED, RETENTION as R } from '@/lib/legal'

const rows = [
  {
    data: 'Datos de tu cuenta y de tu negocio (usuarios, productos, ventas, clientes, citas, conversaciones, archivos)',
    period: `Mientras tu cuenta exista. Se eliminan cuando eliminas la cuenta, o a los ${R.inactiveAccountMonths} meses sin suscripción vigente (con aviso previo de ${R.inactiveNoticeDays} días).`,
  },
  {
    data: 'Registros que no verificaron su correo',
    period: `${R.unverifiedSignupDays} días desde el registro; después se eliminan.`,
  },
  {
    data: 'Códigos de verificación (correo / teléfono)',
    period: `Se borran al usarse; los no usados, ${R.verificationCodeHours} horas después de vencer.`,
  },
  {
    data: 'Constancia de aceptación de términos y consentimientos',
    period: `Mientras la cuenta exista y ${R.evidenceYears} años después de eliminarla (bloqueados).`,
  },
  {
    data: 'Registro de cuentas eliminadas',
    period: `${R.evidenceYears} años.`,
  },
  {
    data: 'Bitácora de acciones del administrador de la plataforma',
    period: `${R.adminAuditYears} años.`,
  },
  {
    data: 'Reclamos de derechos de autor',
    period: `${R.copyrightClaimYears} años después de resolverse.`,
  },
  {
    data: 'Registro técnico de notificaciones de cobro',
    period: `${R.webhookEventDays} días.`,
  },
  {
    data: 'Comprobantes y datos de pago',
    period: 'Los conserva Stripe por el plazo que exigen las leyes fiscales y financieras. COSDI no guarda números de tarjeta.',
  },
  {
    data: 'Preferencia de cookies',
    period: 'Se guarda en tu navegador por 12 meses; después te volvemos a preguntar.',
  },
]
</script>
