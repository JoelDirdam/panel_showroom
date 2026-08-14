/**
 * Texto legal vigente de Términos y Condiciones de PuntoManeki.
 * Usado por seed y por el script de publicación (`publish-terms.ts`).
 *
 * AVISO: Borrador profesional basado en la funcionalidad del producto.
 * Conviene revisión por asesoría legal antes de considerarlo definitivo.
 */
export const TERMS_VERSION = '1.1'
export const TERMS_TITLE = 'Términos y Condiciones de Uso — PuntoManeki'

export const TERMS_CONTENT = `TÉRMINOS Y CONDICIONES DE USO — PuntoManeki
Versión ${TERMS_VERSION}
Fecha de publicación: 3 de agosto de 2026

Estos Términos y Condiciones (los “Términos”) regulan el acceso y uso de la plataforma PuntoManeki (la “Plataforma”, el “Servicio” o “nosotros”), un software como servicio (SaaS) orientado a la administración de negocios, marcas en consignación, inventario, punto de venta, ventas, agenda y módulos relacionados.

Al crear una cuenta, marcar la casilla de aceptación, continuar con el proceso de alta o utilizar el Servicio, usted (el “Usuario”, el “Cliente” o “usted”) declara haber leído, entendido y aceptado estos Términos. Si no está de acuerdo, no debe registrarse ni usar la Plataforma.

────────────────────────────────────────
1. DEFINICIONES
────────────────────────────────────────
1.1. “Cuenta”: el acceso personal o empresarial identificado mediante correo electrónico y contraseña.
1.2. “Tenant” o “Negocio”: la organización o establecimiento asociado a una suscripción y a los datos operativos del Cliente.
1.3. “Administrador”: Usuario con rol de negocio (BUSINESS) autorizado para configurar el Tenant, marcas, empleados, preferencias y accesos.
1.4. “Usuario de marca”: Usuario con rol de marca (BRAND) vinculado a una o más marcas consignadas.
1.5. “Contenido del Cliente”: toda información cargada o generada por el Cliente en la Plataforma (productos, precios, stock, tickets, clientes, empleados, imágenes, preferencias, etc.).
1.6. “Plan”: el paquete de funcionalidades contratado o en prueba (por ejemplo, Negocio, y en el futuro Clínica, Restaurante o Marca).
1.7. “Periodo de prueba”: lapso gratuito inicial (p. ej. 15 días, extensible con código promocional válido) durante el cual el Cliente puede usar el Servicio conforme al Plan seleccionado.

────────────────────────────────────────
2. DESCRIPCIÓN DEL SERVICIO
────────────────────────────────────────
2.1. PuntoManeki ofrece herramientas digitales para, entre otras funciones según el Plan y permisos del Usuario:
   a) Gestión de marcas propias y de terceros (consignación), propietarios y accesos.
   b) Catálogo de productos, categorías, stock e inventario.
   c) Solicitudes de productos (altas, restock, retiros) y flujo de órdenes.
   d) Punto de venta (Caja), registro de ventas/tickets y métodos de pago del negocio (efectivo, tarjeta, transferencia u otros configurados por el Cliente).
   e) Agenda de entregas, cortes u eventos programados.
   f) Preferencias del negocio (comisiones, IVA, ticket, cortes, etc.).
   g) Gestión de empleados y usuarios del equipo.
   h) Módulos adicionales (clientes, apartados, tarjetas de regalo, gastos, descuentos, múltiples cajas, etc.) que pueden estar disponibles, en prueba o anunciados como “próximamente”.
2.2. Algunas funciones pueden mostrarse como “próximamente” o estar limitadas por Plan. Su mera visualización no implica un compromiso de disponibilidad inmediata.
2.3. La Plataforma está diseñada para uso empresarial/profesional. El Cliente es responsable de que su uso cumpla la normativa aplicable a su actividad (comercial, fiscal, sanitaria, de consumo, etc.).

────────────────────────────────────────
3. REGISTRO, CUENTAS Y ACCESO
────────────────────────────────────────
3.1. Para usar el Servicio debe registrarse con datos veraces: nombre completo, correo electrónico, teléfono y una contraseña segura.
3.2. Debe verificar su correo electrónico cuando el flujo de onboarding lo requiera.
3.3. Usted es responsable de custodiar sus credenciales y de toda actividad realizada desde su Cuenta. Notifique de inmediato cualquier uso no autorizado.
3.4. El Administrador puede crear o autorizar accesos para empleados y usuarios de marca. El Tenant es responsable de las acciones de sus Usuarios autorizados.
3.5. Nos reservamos el derecho de suspender o restringir Cuentas ante sospecha de fraude, abuso, incumplimiento de estos Términos o riesgo de seguridad.

────────────────────────────────────────
4. ACEPTACIÓN DE TÉRMINOS Y FIRMAS ELECTRÓNICAS
────────────────────────────────────────
4.1. La aceptación de estos Términos se formaliza al marcar la casilla correspondiente durante el registro o al aceptar una nueva versión cuando se le solicite.
4.2. El nombre completo registrado del Usuario se asocia como firma electrónica de aceptación, junto con la versión aceptada, la fecha/hora y, cuando esté disponible, la dirección IP.
4.3. Cuando publiquemos una nueva versión vigente, podremos exigir su aceptación antes de continuar usando el panel.

────────────────────────────────────────
5. PLANES, PRUEBA GRATUITA Y PAGOS
────────────────────────────────────────
5.1. El acceso al Servicio puede iniciarse con un Periodo de prueba. Al finalizar, el acceso puede restringirse si no existe una suscripción activa o un periodo pagado vigente.
5.2. Los planes, precios, monedas, ciclos de facturación y condiciones comerciales vigentes se comunicarán en la Plataforma o por canales oficiales. Algunas pasarelas de pago (p. ej. Stripe o Mercado Pago) podrán integrarse de forma progresiva; mientras no estén habilitadas, el cobro podrá gestionarse por los medios que indiquemos.
5.3. Códigos promocionales (p. ej. extensión de días de prueba) están sujetos a disponibilidad, vigencia y reglas de uso; pueden modificarse o cancelarse sin efecto retroactivo indebido.
5.4. Salvo disposición legal imperativa en contrario, los cargos por periodos ya iniciados no son reembolsables.
5.5. El Cliente es responsable de impuestos aplicables a su contratación y a su operación comercial.

────────────────────────────────────────
6. CONTENIDO DEL CLIENTE Y RESPONSABILIDADES OPERATIVAS
────────────────────────────────────────
6.1. El Cliente conserva la titularidad sobre su Contenido. Nos otorga una licencia limitada para alojarlo, procesarlo y mostrarlo únicamente con el fin de prestar el Servicio.
6.2. El Cliente es el único responsable de:
   a) La exactitud de productos, precios, existencias, comisiones, rentas, datos de marcas y clientes.
   b) El cumplimiento fiscal y de facturación de sus ventas (la Plataforma no sustituye asesoría contable ni emite necesariamente CFDI u otros comprobantes fiscales salvo que se indique expresamente una función específica).
   c) Las relaciones contractuales con marcas consignadas, empleados y clientes finales.
   d) El uso correcto de Caja, cortes, métodos de pago y políticas internas del negocio.
6.3. PuntoManeki es una herramienta de gestión; no garantiza resultados comerciales ni la legalidad de las operaciones del Cliente frente a terceros.

────────────────────────────────────────
7. DATOS PERSONALES Y PRIVACIDAD
────────────────────────────────────────
7.1. Tratamos datos personales necesarios para operar el Servicio (identificación, contacto, autenticación, uso de la plataforma y registros de aceptación de términos).
7.2. El Cliente actúa como responsable del tratamiento de los datos personales que cargue sobre sus clientes, empleados, propietarios de marca u otros titulares. Debe contar con bases legales y avisos de privacidad adecuados.
7.3. Aplicamos medidas técnicas y organizativas razonables (p. ej. autenticación, control de acceso por roles, cifrado en tránsito mediante HTTPS). Ningún sistema es 100 % seguro; el Cliente debe reportar incidentes relevantes.
7.4. Podemos conservar registros de aceptación de términos, auditoría operativa y respaldos por el tiempo necesario para prestar el Servicio, cumplir obligaciones legales o resolver controversias.

────────────────────────────────────────
8. ALMACENAMIENTO DE ARCHIVOS Y MEDIOS
────────────────────────────────────────
8.1. La Plataforma puede permitir cargar imágenes u otros archivos (p. ej. logotipos o fotos de producto). El Cliente garantiza contar con derechos suficientes sobre dichos archivos y que no infringen derechos de terceros ni contienen malware.
8.2. Nos reservamos el derecho de eliminar o bloquear archivos ilícitos, abusivos o que comprometan la seguridad o estabilidad del Servicio.

────────────────────────────────────────
9. USOS PROHIBIDOS
────────────────────────────────────────
El Cliente y sus Usuarios no deben:
a) Usar el Servicio de forma ilegal, fraudulenta o que vulnere derechos de terceros.
b) Intentar vulnerar la seguridad, acceder a datos de otros Tenants o realizar ingeniería inversa no autorizada.
c) Sobrecargar deliberadamente la infraestructura o automatizar scrapers abusivos.
d) Revender, sublicenciar o reutilizar el Servicio como si fuera propio sin autorización escrita.
e) Cargar contenido ilegal, difamatorio, obsceno o que infrinja propiedad intelectual.

────────────────────────────────────────
10. PROPIEDAD INTELECTUAL
────────────────────────────────────────
10.1. La Plataforma, su código, diseño, marcas, textos y documentación son propiedad de PuntoManeki o de sus licenciantes.
10.2. Estos Términos no transfieren al Cliente ningún derecho de propiedad sobre el software, salvo la licencia de uso limitada, no exclusiva e intransferible mientras exista una suscripción o prueba válida.

────────────────────────────────────────
11. DISPONIBILIDAD, SOPORTE Y CAMBIOS
────────────────────────────────────────
11.1. Procuramos mantener el Servicio disponible de forma continua, sin perjuicio de mantenimientos, actualizaciones o incidencias fuera de nuestro control razonable.
11.2. Podemos modificar funciones, interfaces y módulos, siempre que no se desnaturalice de forma abusiva el objeto principal del Plan contratado durante un periodo pagado vigente.
11.3. El soporte se canalizará por los medios que indiquemos (correo, formularios u otros canales oficiales).

────────────────────────────────────────
12. LIMITACIÓN DE RESPONSABILIDAD
────────────────────────────────────────
12.1. En la máxima medida permitida por la ley aplicable, PuntoManeki no será responsable por: (i) lucro cesante, pérdida de datos del Cliente no recuperables pese a respaldos razonables, o daños indirectos; (ii) decisiones de negocio tomadas con base en información del panel; (iii) fallos de terceros (proveedores de hosting, pasarelas de pago, redes, dispositivos del Cliente).
12.2. Nuestra responsabilidad agregada frente al Cliente por hechos derivados del Servicio, en un periodo de doce (12) meses, no excederá el monto efectivamente pagado por el Cliente a PuntoManeki en ese mismo periodo (o cero, si solo estuvo en Periodo de prueba gratuito), salvo dolo o negligencia inexcusable cuando la ley no permita limitar dicha responsabilidad.

────────────────────────────────────────
13. SUSPENSIÓN Y TERMINACIÓN
────────────────────────────────────────
13.1. El Cliente puede dejar de usar el Servicio en cualquier momento. La baja no libera obligaciones de pago ya generadas.
13.2. Podemos suspender o terminar el acceso por vencimiento de prueba/suscripción, falta de pago, incumplimiento de estos Términos o requerimiento legal.
13.3. Tras la terminación, el acceso al Contenido del Cliente podrá limitarse. Cuando sea razonablemente posible, facilitaremos exportación o recuperación durante un periodo limitado; después podremos eliminar o anonimizar datos conforme a nuestras políticas de retención.

────────────────────────────────────────
14. MODIFICACIONES A ESTOS TÉRMINOS
────────────────────────────────────────
Podemos actualizar estos Términos publicando una nueva versión en la Plataforma. Si el cambio es material, solicitaremos aceptación expresa antes de continuar. El uso continuado tras la aceptación de la nueva versión implica conformidad.

────────────────────────────────────────
15. LEGISLACIÓN APLICABLE Y JURISDICCIÓN
────────────────────────────────────────
Salvo norma imperativa en contrario, estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Las partes se someten a los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles por razón de domicilio presente o futuro.

────────────────────────────────────────
16. CONTACTO
────────────────────────────────────────
Para consultas sobre estos Términos o el Servicio, utilice los canales de contacto publicados en la Plataforma o el correo de soporte indicado por PuntoManeki.

────────────────────────────────────────
17. DISPOSICIONES GENERALES
────────────────────────────────────────
17.1. Si alguna cláusula se declara inválida, el resto permanecerá vigente.
17.2. La falta de ejercicio de un derecho no implica renuncia.
17.3. Estos Términos constituyen el acuerdo principal respecto del uso de la Plataforma, sin perjuicio de condiciones comerciales específicas de un Plan o contrato particular por escrito.

Al aceptar estos Términos, usted confirma que actúa con capacidad legal suficiente para obligarse en nombre propio o, en su caso, del Negocio que representa.
`

export default {
  TERMS_VERSION,
  TERMS_TITLE,
  TERMS_CONTENT,
}
