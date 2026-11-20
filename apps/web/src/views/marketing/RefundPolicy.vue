<template>
  <LegalPage title="Política de reembolsos y cancelación" :updated="POLICIES_UPDATED">
    <p>
      Esta política explica cuándo y cómo devolvemos un pago de una suscripción de <strong>COSDI</strong>, y cómo
      cancelar. Forma parte de los <router-link to="/terminos">Términos y condiciones</router-link>.
    </p>

    <h2>1. La prueba gratuita no se cobra</h2>
    <p>
      Puedes probar COSDI sin costo y sin registrar una tarjeta. Durante la prueba no se hace ningún cobro. Si
      registras una tarjeta durante la prueba, el primer cobro se hace hasta que la prueba termina, y te avisamos por
      correo antes.
    </p>

    <h2>2. Renovación automática</h2>
    <p>
      Los planes son mensuales y <strong>se renuevan automáticamente</strong> cada mes hasta que canceles. Antes de
      cada cobro te enviamos un aviso por correo (normalmente {{ RETENTION.renewalNoticeDays }} días antes) con la
      fecha, el importe y el enlace para cancelar.
    </p>

    <h2>3. Cómo cancelar</h2>
    <p>
      Entra a tu panel, abre <strong>Mi suscripción</strong> y elige <strong>Cancelar suscripción</strong>. Son dos
      clics, sin llamadas ni formularios, y no hay penalización. Al cancelar:
    </p>
    <ul>
      <li>No se te vuelve a cobrar.</li>
      <li>Conservas el acceso hasta el final del periodo que ya pagaste (o de tu prueba).</li>
      <li>Recibes un correo de confirmación que sirve como comprobante.</li>
      <li>Puedes reanudar la suscripción mientras ese periodo siga vigente.</li>
    </ul>

    <h2>4. Cuándo reembolsamos</h2>
    <ul>
      <li>
        <strong>Primer cobro de un plan:</strong> si no quedaste conforme, puedes pedir el reembolso íntegro dentro de
        los <strong>{{ REFUNDS.firstChargeBusinessDays }} días hábiles</strong> siguientes a ese cobro.
      </li>
      <li>
        <strong>Cobros duplicados o erróneos:</strong> se reembolsan íntegramente en cuanto los confirmamos.
      </li>
      <li>
        <strong>Cobro posterior a una cancelación</strong> hecha en tiempo: se reembolsa íntegramente.
      </li>
      <li>
        <strong>Falla del servicio atribuible a COSDI</strong> que te haya impedido usarlo de forma sustancial:
        reembolsamos la parte proporcional al tiempo afectado.
      </li>
    </ul>

    <h2>5. Cuándo no hay reembolso</h2>
    <p>
      Fuera de los casos anteriores, las renovaciones mensuales ya cobradas no se reembolsan ni se prorratean: al
      cancelar conservas el servicio hasta el final del periodo pagado. Nada de lo anterior limita los derechos que la
      Ley Federal de Protección al Consumidor te reconozca.
    </p>

    <h2>6. Cómo pedir un reembolso</h2>
    <p>
      Escríbenos a <a :href="`mailto:${B.email}?subject=Solicitud%20de%20reembolso`">{{ B.email }}</a> desde el
      correo de tu cuenta, indicando la fecha y el importe del cobro y el motivo. Te respondemos en un máximo de
      {{ REFUNDS.responseBusinessDays }} días hábiles.
    </p>
    <p>
      Los reembolsos aprobados se devuelven al mismo medio de pago con el que se hizo el cobro. Según tu banco, el
      dinero puede tardar entre 5 y 10 días hábiles en verse reflejado.
    </p>

    <h2>7. Contacto</h2>
    <p>
      {{ B.legalName }} · <a :href="`mailto:${B.email}`">{{ B.email }}</a> · WhatsApp {{ B.phone }}. Si eres
      consumidor, también puedes acudir a la Procuraduría Federal del Consumidor (PROFECO).
    </p>
  </LegalPage>
</template>

<script setup lang="ts">
import LegalPage from '@/components/marketing/LegalPage.vue'
import { BUSINESS as B } from '@/lib/business'
import { POLICIES_UPDATED, REFUNDS, RETENTION } from '@/lib/legal'
</script>
