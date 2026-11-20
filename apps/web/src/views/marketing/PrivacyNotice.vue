<template>
  <LegalPage title="Aviso de privacidad integral">
    <p>
      En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares
      (LFPDPPP) y su normatividad aplicable, se emite el presente aviso de privacidad.
    </p>

    <h2>1. ¿Quién es el responsable de tus datos?</h2>
    <p>
      <strong>{{ B.legalName }}</strong>, persona física con actividad empresarial, titular de la
      plataforma <strong>COSDI</strong> ({{ B.site }}), con domicilio en {{ ADDRESS }} (domicilio completo disponible a solicitud de la autoridad o del titular de datos vía {{ B.privacyEmail }}), es responsable del
      tratamiento y la protección de tus datos personales.
    </p>

    <h2>2. ¿Qué datos personales recabamos?</h2>
    <ul>
      <li><strong>Datos de cuenta:</strong> nombre, correo electrónico y contraseña (almacenada cifrada). El teléfono es opcional.</li>
      <li><strong>Constancias de consentimiento:</strong> versión de los términos que aceptaste, fecha y hora, dirección IP y navegador; y, si lo autorizas, tu consentimiento para recibir correos de marketing.</li>
      <li><strong>Datos del negocio:</strong> nombre del negocio, marcas, productos, inventario, ventas, cortes de caja y citas que registras en el panel.</li>
      <li><strong>Datos de tus clientes</strong> que tú captures o que ellos mismos ingresen al agendar una cita: nombre, teléfono y servicio solicitado.</li>
      <li><strong>Datos técnicos:</strong> dirección IP, navegador, sistema operativo y registros de acceso.</li>
      <li><strong>Mensajes de WhatsApp:</strong> número de teléfono y contenido de los mensajes cuando se usan los recordatorios y la atención por WhatsApp.</li>
    </ul>
    <p>
      Solo pedimos los datos que necesitamos para darte el servicio. No recabamos datos personales sensibles ni datos
      financieros completos (por ejemplo, no almacenamos números de tarjeta: los captura directamente nuestro
      procesador de pagos).
    </p>

    <h2>3. ¿Para qué usamos tus datos?</h2>
    <p><strong>Finalidades necesarias</strong> para brindarte el servicio:</p>
    <ul>
      <li>Crear y administrar tu cuenta y autenticar tu acceso.</li>
      <li>Operar las funciones del panel: marcas, productos, stock, ventas, caja y agenda de citas.</li>
      <li>Enviar recordatorios de cita y notificaciones del servicio por correo o WhatsApp.</li>
      <li>Gestionar suscripciones, pagos y soporte técnico.</li>
      <li>Garantizar la seguridad de la plataforma y cumplir obligaciones legales y fiscales.</li>
    </ul>
    <p><strong>Finalidades secundarias</strong> (puedes negarte sin que afecte el servicio):</p>
    <ul>
      <li>Enviarte novedades, promociones o encuestas de COSDI.</li>
      <li>Elaborar estadísticas internas para mejorar el producto.</li>
    </ul>
    <p>
      Los correos de novedades y promociones <strong>solo se envían si lo autorizas</strong> mediante una casilla
      aparte de la aceptación de los términos, que aparece desmarcada. Puedes retirar esa autorización en cualquier
      momento desde <strong>Mi cuenta</strong>, con el enlace “Darme de baja” de cada correo, o escribiendo a
      <a :href="`mailto:${B.privacyEmail}`">{{ B.privacyEmail }}</a>.
    </p>

    <h2>4. ¿Con quién compartimos tus datos?</h2>
    <p>No vendemos tus datos. Los compartimos únicamente con proveedores necesarios para operar el servicio, obligados a protegerlos:</p>
    <ul>
      <li><strong>Meta Platforms (WhatsApp Business Platform):</strong> para enviar y recibir mensajes de WhatsApp.</li>
      <li><strong>Proveedores de infraestructura y alojamiento</strong> (servidores y base de datos) y de <strong>correo electrónico</strong>.</li>
      <li><strong>Procesadores de pago</strong> (Stripe), cuando registras una tarjeta o contratas un plan de pago.</li>
      <li><strong>Proveedor de inteligencia artificial</strong>, solo en el plan Citas + IA, para que el asistente responda los mensajes de WhatsApp.</li>
      <li><strong>Herramientas de analítica y publicidad</strong> del sitio público, solo si aceptas esas cookies.</li>
      <li>Autoridades competentes cuando exista un requerimiento legal.</li>
    </ul>
    <p>
      La lista completa, con el nombre de cada proveedor, qué datos trata, para qué y dónde se ubica, está en
      <router-link to="/proveedores">Proveedores que tratan datos</router-link>. Varios de ellos se encuentran fuera
      de México (principalmente en Estados Unidos); al usar el servicio consientes estas transferencias.
    </p>

    <h2>5. Datos de los clientes de tu negocio</h2>
    <p>
      Cuando como usuario de COSDI registras datos de tus propios clientes, tú eres el responsable de esos datos y
      COSDI actúa como encargado que los trata por tu cuenta y únicamente para prestarte el servicio. Eres responsable
      de contar con el consentimiento o aviso de privacidad que corresponda frente a ellos.
    </p>

    <h2>6. Derechos ARCO y revocación del consentimiento</h2>
    <p>
      Tienes derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>, <strong>Cancelar</strong> u
      <strong>Oponerte</strong> al tratamiento de tus datos, así como a revocar tu consentimiento. Para ejercerlos envía
      una solicitud a <a :href="`mailto:${B.privacyEmail}`">{{ B.privacyEmail }}</a> con tu nombre, medio para
      responderte, descripción clara del derecho que ejerces y copia de una identificación oficial. Responderemos en un
      máximo de 20 días hábiles.
    </p>
    <p>
      Además, sin necesidad de enviar una solicitud, desde <strong>Mi cuenta → Privacidad y datos</strong> puedes en
      cualquier momento <strong>descargar una copia de tus datos</strong> en formato electrónico y
      <strong>eliminar tu cuenta</strong> y la información asociada.
    </p>

    <h2>7. Cookies y tecnologías similares</h2>
    <p>
      Usamos cookies y almacenamiento local estrictamente necesarios para mantener tu sesión y recordar preferencias
      (por ejemplo, el tema claro u oscuro). En las páginas públicas del sitio podemos usar, además, herramientas de
      analítica (Google Analytics, Hotjar, Contentsquare) y de publicidad (Pixel de Meta), que <strong>permanecen bloqueadas hasta
      que las aceptas</strong> en el aviso de cookies y nunca se usan dentro de tu panel. Puedes cambiar tu decisión
      cuando quieras desde “Preferencias de cookies”, al pie del sitio. Más detalle en la
      <router-link to="/cookies">política de cookies</router-link>.
    </p>

    <h2>8. Conservación y seguridad</h2>
    <p>
      Conservamos tus datos mientras tu cuenta exista. Las cuentas que pasan {{ R.inactiveAccountMonths }} meses sin
      una suscripción vigente se eliminan, previo aviso por correo con {{ R.inactiveNoticeDays }} días de
      anticipación. Después de eliminar una cuenta conservamos solo, bloqueados y por {{ R.evidenceYears }} años, los
      registros que la ley permite o exige (como la constancia de aceptación de los términos). Los plazos completos
      están en <router-link to="/conservacion-de-datos">Conservación de datos</router-link>.
    </p>
    <p>
      Aplicamos medidas técnicas, administrativas y físicas razonables (cifrado en tránsito, contraseñas cifradas,
      verificación en dos pasos opcional, control de accesos) para protegerlos contra pérdida, uso o acceso no
      autorizado.
    </p>

    <h2>9. Cambios a este aviso</h2>
    <p>
      Podemos actualizar este aviso. Publicaremos la versión vigente en <a href="/privacidad">{{ B.site }}/privacidad</a>
      indicando la fecha de última actualización y, si el cambio es relevante, te avisaremos por correo.
    </p>

    <h2>10. Contacto</h2>
    <p>
      {{ B.legalName }} · {{ ADDRESS }}<br />
      Correo: <a :href="`mailto:${B.privacyEmail}`">{{ B.privacyEmail }}</a> · <a :href="`mailto:${B.email}`">{{ B.email }}</a><br />
      Teléfono / WhatsApp: {{ B.phone }}
    </p>
    <p>
      Si consideras que tu derecho a la protección de datos ha sido vulnerado, puedes acudir a la autoridad
      competente en materia de protección de datos personales.
    </p>
  </LegalPage>
</template>

<script setup lang="ts">
import LegalPage from '@/components/marketing/LegalPage.vue'
import { BUSINESS as B, BUSINESS_ADDRESS as ADDRESS } from '@/lib/business'
import { RETENTION as R } from '@/lib/legal'
</script>
