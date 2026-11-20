/**
 * Texto legal vigente de Términos y Condiciones de COSDI.
 * Usado por seed y por el script de publicación (`publish-terms.ts`).
 *
 * AVISO: Borrador profesional basado en la funcionalidad del producto.
 * Conviene revisión por asesoría legal antes de considerarlo definitivo.
 */
export const TERMS_VERSION = '1.3'
export const TERMS_TITLE = 'Términos y Condiciones de Uso — COSDI'

/** Qué cambió respecto a la versión anterior (se muestra al pedir la nueva aceptación). */
export const TERMS_SUMMARY = `Agregamos las reglas de los códigos de descuento (por ejemplo, el precio de socio fundador) y del programa de recomendación: quien llega recomendado obtiene un descuento en su primer mes y quien recomienda gana un mes gratis por cada negocio que pague, hasta 6. Además, la prueba gratis ahora se obtiene con un código; sin código, el plan se activa al pagar el primer mes.`

export const TERMS_CONTENT = `TÉRMINOS Y CONDICIONES DE USO — COSDI
Versión ${TERMS_VERSION}
Fecha de publicación: 18 de noviembre de 2026

Estos Términos y Condiciones (los “Términos”) regulan el acceso y uso de la plataforma COSDI (la “Plataforma”, el “Servicio” o “nosotros”), operada por Joel Andrés Violante Madrid, persona física con actividad empresarial, con domicilio en Victoria de Durango, Durango, México. COSDI es un software como servicio (SaaS) orientado a la administración de negocios, marcas en consignación, inventario, punto de venta, ventas, agenda y módulos relacionados.

Al crear una cuenta, marcar la casilla de aceptación, continuar con el proceso de alta o utilizar el Servicio, usted (el “Usuario”, el “Cliente” o “usted”) declara haber leído, entendido y aceptado estos Términos. Si no está de acuerdo, no debe registrarse ni usar la Plataforma.

────────────────────────────────────────
1. DEFINICIONES
────────────────────────────────────────
1.1. “Cuenta”: el acceso personal o empresarial identificado mediante correo electrónico y contraseña.
1.2. “Tenant” o “Negocio”: la organización o establecimiento asociado a una suscripción y a los datos operativos del Cliente.
1.3. “Administrador”: Usuario con rol de negocio (BUSINESS) autorizado para configurar el Tenant, marcas, empleados, preferencias y accesos.
1.4. “Usuario de marca”: Usuario con rol de marca (BRAND) vinculado a una o más marcas consignadas.
1.5. “Contenido del Cliente”: toda información cargada o generada por el Cliente en la Plataforma (productos, precios, stock, tickets, clientes, empleados, imágenes, preferencias, etc.).
1.6. “Plan”: el paquete de funcionalidades contratado o en prueba (por ejemplo, Negocio, Citas o Citas + IA, y los que se anuncien en el futuro).
1.7. “Periodo de prueba”: lapso gratuito que otorga un código promocional de prueba válido (p. ej. 15 días) durante el cual el Cliente puede usar el Servicio conforme al Plan seleccionado.
1.8. “Código promocional”: clave que, al elegir un Plan, otorga días de prueba gratis y/o un descuento sobre las mensualidades, según las condiciones publicadas para ese código.
1.9. “Código de recomendación”: clave única de cada Negocio para invitar a otros negocios a COSDI dentro del Programa de recomendación.

────────────────────────────────────────
2. DESCRIPCIÓN DEL SERVICIO
────────────────────────────────────────
2.1. COSDI ofrece herramientas digitales para, entre otras funciones según el Plan y permisos del Usuario:
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
3.1. Para usar el Servicio debe registrarse con datos veraces: nombre completo, correo electrónico y una contraseña segura. El teléfono es opcional.
3.2. Debe verificar su correo electrónico cuando el flujo de onboarding lo requiera.
3.3. Usted es responsable de custodiar sus credenciales y de toda actividad realizada desde su Cuenta. Notifique de inmediato cualquier uso no autorizado.
3.4. El Administrador puede crear o autorizar accesos para empleados y usuarios de marca. El Tenant es responsable de las acciones de sus Usuarios autorizados.
3.5. Nos reservamos el derecho de suspender o restringir Cuentas ante sospecha de fraude, abuso, incumplimiento de estos Términos o riesgo de seguridad.
3.6. Puede proteger su Cuenta con verificación en dos pasos mediante una aplicación de autenticación. Si la activa, usted es responsable de conservar su dispositivo y sus códigos de recuperación.

────────────────────────────────────────
4. ACEPTACIÓN DE TÉRMINOS Y FIRMAS ELECTRÓNICAS
────────────────────────────────────────
4.1. La aceptación de estos Términos se formaliza al marcar la casilla correspondiente durante el registro o al aceptar una nueva versión cuando se le solicite.
4.2. El nombre completo registrado del Usuario se asocia como firma electrónica de aceptación. Conservamos como constancia: el correo de la Cuenta, la versión aceptada y una huella digital de su texto, la fecha y hora, la dirección IP y el navegador utilizado.
4.3. Cuando publiquemos una nueva versión vigente, podremos exigir su aceptación antes de continuar usando el panel.
4.4. La aceptación de estos Términos no incluye el envío de publicidad. Los correos de novedades y promociones solo se envían a quien lo autoriza por separado, mediante una casilla independiente y desmarcada por defecto; esa autorización puede retirarse en cualquier momento desde “Mi cuenta” o con el enlace de baja incluido en cada correo.

────────────────────────────────────────
5. PLANES, PRUEBA GRATUITA, RENOVACIÓN AUTOMÁTICA, CANCELACIÓN Y REEMBOLSOS
────────────────────────────────────────
5.1. Inicio del Servicio y prueba gratuita. Sin un código de prueba, el Plan se activa al pagar la primera mensualidad. Con un código de prueba válido, el acceso puede iniciarse con un Periodo de prueba, sin costo y sin necesidad de registrar una tarjeta; durante la prueba no se realiza ningún cobro y, al finalizar, el acceso se pausa si no existe una suscripción activa.
5.2. Precios. Los precios vigentes de cada Plan se muestran en la Plataforma, en pesos mexicanos (MXN) y con el IVA incluido. Los pagos con tarjeta se procesan a través de Stripe; COSDI no almacena los datos completos de su tarjeta.
5.3. RENOVACIÓN AUTOMÁTICA. Las suscripciones son mensuales y SE RENUEVAN AUTOMÁTICAMENTE: al registrar una tarjeta usted autoriza que se cobre el precio de su Plan cada mes (y, si está en prueba, que el primer cobro se haga al terminar la prueba) hasta que cancele. Antes de cada cobro le enviaremos un aviso por correo electrónico, normalmente con 7 días de anticipación, indicando la fecha y el importe, con el enlace para cancelar.
5.4. Cancelación. Puede cancelar en cualquier momento, en línea y sin penalización, desde la sección “Mi suscripción” del panel, con la misma facilidad con la que se suscribió. La cancelación detiene los cobros futuros; usted conserva el acceso hasta el final del periodo ya pagado (o de la prueba) y recibirá una confirmación por correo.
5.5. Reembolsos. Aplica la Política de Reembolsos publicada en https://cosdi.mx/reembolsos, que forma parte de estos Términos. En resumen: (a) puede solicitar el reembolso íntegro del primer cobro de un Plan dentro de los 5 días hábiles siguientes a ese cobro; (b) los cobros duplicados, erróneos o posteriores a una cancelación se reembolsan íntegramente; (c) fuera de esos casos, los periodos ya iniciados no son reembolsables, salvo que la ley disponga otra cosa.
5.6. Códigos promocionales y descuentos.
   a) Cada código indica su beneficio (días de prueba gratis, un porcentaje o un monto de descuento) y, en su caso, el número de mensualidades que cubre, los Planes en los que aplica, su vigencia y el número máximo de usos. Por ejemplo, el código de socio fundador fija la mensualidad del plan Citas en un precio reducido durante 12 mensualidades pagadas, solo para los primeros negocios que lo usen.
   b) El descuento se muestra antes de confirmar el pago y se aplica automáticamente en el cobro con tarjeta. Al terminar las mensualidades con descuento, el Plan se cobra al precio vigente, del que recibirá el aviso previo de la cláusula 5.3.
   c) Solo puede usarse un código por Negocio al elegir su Plan; los códigos no son acumulables entre sí, no son canjeables por dinero ni transferibles.
   d) Si cambia de Plan, cancela o su suscripción se pausa por falta de pago, el descuento puede perderse para las mensualidades restantes.
   e) Los códigos están sujetos a disponibilidad y pueden modificarse, agotarse o cancelarse para usos futuros sin afectar los beneficios ya otorgados.
5.7. Programa de recomendación.
   a) Cada Negocio con cuenta en COSDI cuenta con un Código de recomendación que puede compartir con otros negocios.
   b) El negocio que se registra con un Código de recomendación obtiene un descuento en su primera mensualidad pagada (actualmente, 50%).
   c) Quien recomienda recibe el equivalente a una mensualidad de su Plan como saldo a favor por cada negocio recomendado que pague su primera mensualidad, hasta un máximo de 6 mensualidades. El saldo se abona en su cuenta de pago y se descuenta automáticamente de sus siguientes cobros; no es reembolsable en efectivo ni transferible, y se pierde si la cuenta se elimina.
   d) No se otorgan beneficios por recomendarse a sí mismo, por cuentas duplicadas o ficticias, ni por recomendaciones obtenidas mediante spam o información engañosa. Si detectamos abuso, podremos anular los beneficios correspondientes.
   e) Podemos modificar o terminar el programa para recomendaciones futuras; los saldos ya abonados se respetan.
5.8. Cambios de precio. Si cambia el precio de su Plan, se lo avisaremos por correo con al menos 30 días de anticipación; el nuevo precio aplicará a partir de la siguiente renovación y podrá cancelar antes de que surta efecto.
5.9. El Cliente es responsable de los impuestos aplicables a su propia operación comercial.

────────────────────────────────────────
6. CONTENIDO DEL CLIENTE Y RESPONSABILIDADES OPERATIVAS
────────────────────────────────────────
6.1. El Cliente conserva la titularidad sobre su Contenido. Nos otorga una licencia limitada para alojarlo, procesarlo y mostrarlo únicamente con el fin de prestar el Servicio.
6.2. El Cliente es el único responsable de:
   a) La exactitud de productos, precios, existencias, comisiones, rentas, datos de marcas y clientes.
   b) El cumplimiento fiscal y de facturación de sus ventas (la Plataforma no sustituye asesoría contable ni emite necesariamente CFDI u otros comprobantes fiscales salvo que se indique expresamente una función específica).
   c) Las relaciones contractuales con marcas consignadas, empleados y clientes finales.
   d) El uso correcto de Caja, cortes, métodos de pago y políticas internas del negocio.
6.3. COSDI es una herramienta de gestión; no garantiza resultados comerciales ni la legalidad de las operaciones del Cliente frente a terceros.

────────────────────────────────────────
7. DATOS PERSONALES Y PRIVACIDAD
────────────────────────────────────────
7.1. Tratamos los datos personales necesarios para operar el Servicio conforme a nuestro Aviso de Privacidad (https://cosdi.mx/privacidad). Solo pedimos los datos que necesitamos para prestar el Servicio.
7.2. El Cliente actúa como responsable del tratamiento de los datos personales que cargue sobre sus clientes, empleados, propietarios de marca u otros titulares, y COSDI como encargado que los trata por su cuenta. El Cliente debe contar con bases legales y avisos de privacidad adecuados.
7.3. Aplicamos medidas técnicas y organizativas razonables (p. ej. autenticación, verificación en dos pasos opcional, control de acceso por roles, cifrado en tránsito mediante HTTPS). Ningún sistema es 100 % seguro; el Cliente debe reportar incidentes relevantes.
7.4. Descarga y eliminación. Desde “Mi cuenta” puede descargar en cualquier momento una copia de sus datos en formato electrónico y eliminar su Cuenta. La eliminación es definitiva: borra el Negocio y su información y cancela la suscripción.
7.5. Conservación. Los plazos durante los que guardamos cada tipo de dato se publican en https://cosdi.mx/conservacion-de-datos. Tras eliminar una Cuenta conservamos únicamente, bloqueados y por tiempo limitado, los registros que la ley permite o exige (como la constancia de aceptación de estos Términos y los comprobantes de pago).
7.6. Proveedores. La lista de proveedores que tratan datos por cuenta de COSDI se publica en https://cosdi.mx/proveedores.
7.7. Cookies. Las herramientas de analítica y publicidad del sitio público solo se activan con su consentimiento, que puede cambiar en cualquier momento desde “Preferencias de cookies”.

────────────────────────────────────────
8. ALMACENAMIENTO DE ARCHIVOS Y MEDIOS
────────────────────────────────────────
8.1. La Plataforma puede permitir cargar imágenes u otros archivos (p. ej. logotipos o fotos de producto). El Cliente garantiza contar con derechos suficientes sobre dichos archivos y que no infringen derechos de terceros ni contienen malware.
8.2. Nos reservamos el derecho de eliminar o bloquear archivos ilícitos, abusivos o que comprometan la seguridad o estabilidad del Servicio.
8.3. Derechos de autor. Si usted considera que algún contenido alojado en la Plataforma infringe sus derechos de autor, puede presentar un aviso en https://cosdi.mx/derechos-de-autor. Revisaremos cada aviso y, cuando proceda, retiraremos o bloquearemos el contenido señalado.

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
10.1. La Plataforma, su código, diseño, marcas, textos y documentación son propiedad de COSDI o de sus licenciantes.
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
12.1. En la máxima medida permitida por la ley aplicable, COSDI no será responsable por: (i) lucro cesante, pérdida de datos del Cliente no recuperables pese a respaldos razonables, o daños indirectos; (ii) decisiones de negocio tomadas con base en información del panel; (iii) fallos de terceros (proveedores de hosting, pasarelas de pago, redes, dispositivos del Cliente).
12.2. Nuestra responsabilidad agregada frente al Cliente por hechos derivados del Servicio, en un periodo de doce (12) meses, no excederá el monto efectivamente pagado por el Cliente a COSDI en ese mismo periodo (o cero, si solo estuvo en Periodo de prueba gratuito), salvo dolo o negligencia inexcusable cuando la ley no permita limitar dicha responsabilidad.

────────────────────────────────────────
13. SUSPENSIÓN Y TERMINACIÓN
────────────────────────────────────────
13.1. El Cliente puede dejar de usar el Servicio en cualquier momento. La baja no libera obligaciones de pago ya generadas.
13.2. Podemos suspender o terminar el acceso por vencimiento de prueba/suscripción, falta de pago, incumplimiento de estos Términos o requerimiento legal.
13.3. Tras el vencimiento de la prueba o de la suscripción, la Cuenta queda pausada: el Cliente puede seguir entrando para pagar, descargar sus datos o eliminar su Cuenta. Las Cuentas que permanezcan 12 meses sin una suscripción vigente se eliminan de forma definitiva, previo aviso por correo con 30 días de anticipación, conforme a la política publicada en https://cosdi.mx/conservacion-de-datos.

────────────────────────────────────────
14. MODIFICACIONES A ESTOS TÉRMINOS
────────────────────────────────────────
Podemos actualizar estos Términos publicando una nueva versión en la Plataforma. Si el cambio es material, solicitaremos aceptación expresa antes de continuar. El uso continuado tras la aceptación de la nueva versión implica conformidad.

────────────────────────────────────────
15. LEGISLACIÓN APLICABLE Y JURISDICCIÓN
────────────────────────────────────────
Salvo norma imperativa en contrario, estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para su interpretación y cumplimiento, las partes se someten a los tribunales competentes de Durango, Durango. Lo anterior es sin perjuicio de los derechos que la Ley Federal de Protección al Consumidor reconoce a quien tenga el carácter de consumidor, incluida la competencia de la Procuraduría Federal del Consumidor (PROFECO).

────────────────────────────────────────
16. CONTACTO
────────────────────────────────────────
Consultas sobre estos Términos, el Servicio, pagos o reembolsos: contacto@cosdi.mx · WhatsApp 618 292 3010.
Datos personales y derechos ARCO: privacidad@cosdi.mx.
Avisos de derechos de autor: https://cosdi.mx/derechos-de-autor.

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
  TERMS_SUMMARY,
  TERMS_CONTENT,
}
