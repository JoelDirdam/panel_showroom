<template>
  <LegalPage title="Términos y condiciones de uso">
    <p>
      Estos términos regulan el uso de <strong>COSDI</strong> ({{ B.site }}), plataforma operada por
      <strong>{{ B.legalName }}</strong>, con domicilio en {{ ADDRESS }} (en adelante, “COSDI”).
      Al crear una cuenta o usar el servicio aceptas estos términos y el
      <router-link to="/privacidad">aviso de privacidad</router-link>.
    </p>

    <h2>1. El servicio</h2>
    <p>
      COSDI (Consultoría y Soluciones Digitales) ofrece servicios de desarrollo de software a la medida y una aplicación en línea (nombre por definir) para que negocios y marcas administren productos, inventario, ventas, caja y
      agenda de citas, con recordatorios por correo y WhatsApp. Algunas funciones se publican como “próximamente” y
      pueden cambiar antes de su lanzamiento.
    </p>

    <h2>2. Cuenta y seguridad</h2>
    <p>
      Debes proporcionar información veraz y mantener la confidencialidad de tus credenciales. Eres responsable de la
      actividad realizada con tu cuenta y de avisarnos de inmediato si detectas un uso no autorizado.
    </p>

    <h2>3. Uso aceptable</h2>
    <ul>
      <li>Usar COSDI solo para fines lícitos relacionados con la operación de tu negocio.</li>
      <li>No enviar spam, mensajes no solicitados ni contenido ilegal, engañoso u ofensivo por WhatsApp o correo.</li>
      <li>Contar con el consentimiento de tus clientes para contactarlos y cumplir las políticas de WhatsApp Business de Meta.</li>
      <li>No intentar vulnerar, copiar, descompilar o sobrecargar la plataforma.</li>
    </ul>

    <h2>4. Planes, prueba gratuita y pagos</h2>
    <p>
      Puedes iniciar con una prueba gratuita de 15 días (hasta 30 con código promocional). Al terminar, deberás
      contratar un plan de pago para seguir usando las funciones correspondientes. Los precios se muestran en pesos
      mexicanos. Puedes cancelar tu suscripción en cualquier momento; la cancelación surte efecto al final del periodo
      ya pagado y, salvo disposición legal en contrario, no se reembolsan periodos en curso.
    </p>

    <h2>5. Tus datos y los de tus clientes</h2>
    <p>
      Conservas la propiedad de la información que capturas. Nos autorizas a tratarla únicamente para prestarte el
      servicio, conforme al aviso de privacidad. Eres responsable de la licitud de los datos de tus clientes que
      registres.
    </p>

    <h2>6. Disponibilidad</h2>
    <p>
      Procuramos mantener el servicio disponible, pero no garantizamos que sea ininterrumpido o libre de errores.
      Podremos realizar mantenimientos, modificar funciones o suspender cuentas que incumplan estos términos,
      avisándote con anticipación razonable cuando sea posible.
    </p>

    <h2>7. Limitación de responsabilidad</h2>
    <p>
      En la medida permitida por la ley, COSDI no será responsable por daños indirectos, pérdida de ingresos o de
      datos derivados del uso o la imposibilidad de usar el servicio, ni por fallas de terceros (por ejemplo, WhatsApp,
      proveedores de internet o de pago). Te recomendamos respaldar periódicamente la información crítica. Nada de lo
      aquí dispuesto limita los derechos que la ley te otorga como consumidor.
    </p>

    <h2>8. Propiedad intelectual</h2>
    <p>
      El software, la marca COSDI, logotipos, diseños y contenidos de la plataforma son propiedad de su titular. Se te
      concede una licencia limitada, revocable y no exclusiva para usar el servicio mientras tu cuenta esté vigente.
    </p>

    <h2>9. Modificaciones</h2>
    <p>
      Podemos actualizar estos términos; publicaremos la versión vigente en
      <a href="/terminos">{{ B.site }}/terminos</a> y, si el cambio es relevante, te avisaremos por correo. El uso
      continuado del servicio implica la aceptación de los cambios.
    </p>

    <h2>10. Legislación y jurisdicción</h2>
    <p>
      Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para su interpretación y cumplimiento, las
      partes se someten a los tribunales competentes de Durango, Durango, sin perjuicio de los derechos del consumidor
      ante la Procuraduría Federal del Consumidor (PROFECO).
    </p>

    <h2>11. Contacto</h2>
    <p>
      Dudas o aclaraciones: <a :href="`mailto:${B.email}`">{{ B.email }}</a> · WhatsApp {{ B.phone }}.
    </p>
  </LegalPage>
</template>

<script setup lang="ts">
import LegalPage from '@/components/marketing/LegalPage.vue'
import { BUSINESS as B, BUSINESS_ADDRESS as ADDRESS } from '@/lib/business'
</script>
