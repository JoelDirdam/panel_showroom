# Verificación de Meta + WhatsApp Business Platform — paso a paso

> Los requisitos de Meta cambian seguido; los nombres de menús pueden variar. Si una pantalla no coincide, busca el nombre del paso en el Centro de ayuda de Meta. Tiempos: la verificación de negocio suele tardar de unos días a 2 semanas.

## Links que vas a usar
- Meta Business Suite / Portafolio comercial: <https://business.facebook.com>
- Configuración del negocio → **Centro de seguridad** (aquí se inicia la verificación): <https://business.facebook.com/settings/security>
- Meta for Developers (apps): <https://developers.facebook.com/apps>
- Documentación WhatsApp Cloud API: <https://developers.facebook.com/docs/whatsapp/cloud-api/get-started>
- Meta Business Agent (el que me compartiste): <https://developers.facebook.com/documentation/meta-business-agent/overview>

## Antes de empezar (prerrequisitos)
1. **cosdi.mx funcionando** con una página pública que diga qué es COSDI y tenga **Aviso de privacidad** y **Términos** (Meta revisa el sitio). Haz primero el prompt de Cursor del dominio.
2. **Correo con tu dominio** (ej. `contacto@cosdi.mx`). Meta prefiere correo del dominio, no Gmail.
3. **Documentos del negocio a nombre de quien verificas** (mismo nombre/dirección que en el sitio):
   - Persona física con actividad empresarial: **Constancia de Situación Fiscal (SAT)** y comprobante de domicilio reciente (a tu nombre o del negocio).
   - Si fuera empresa: acta constitutiva y constancia fiscal.
4. Cuenta personal de Facebook con **verificación en dos pasos** activa (será el administrador).
5. Un **número de teléfono dedicado** que pueda recibir un código (SMS o llamada) y que **no esté registrado en la app de WhatsApp** (si lo está, hay que eliminarlo ahí primero). Para pruebas Meta te da un número de prueba gratis.

## Fase 1 — Portafolio comercial y verificación del negocio
1. Entra a <https://business.facebook.com> y crea el **Portafolio comercial** "COSDI" (nombre legal o comercial **igual al de tus documentos**).
2. **Configuración del negocio → Información del negocio**: completa nombre legal, domicilio, teléfono, sitio web `https://cosdi.mx`.
3. **Configuración del negocio → Centro de seguridad → Iniciar verificación**. Elige tu país (México), sube la constancia fiscal/documentos, confirma el dominio y el método de contacto (correo de dominio/teléfono).
4. **Verifica el dominio** (Configuración → Seguridad de la marca → Dominios): agrega `cosdi.mx` y publica el registro `TXT` (o la metaetiqueta) que te den. Si usas Cloudflare, pásale ese valor a Cursor en el paso 8 de su prompt.
5. Espera el correo/notificación de aprobación. Si lo rechazan, revisa que el **nombre, dirección y sitio coincidan exactamente** con los documentos y vuelve a enviar.

## Fase 2 — App de desarrollador y WhatsApp
1. En <https://developers.facebook.com/apps> → **Crear app** → tipo **Negocio (Business)** → vincúlala al portafolio "COSDI".
2. Agrega el producto **WhatsApp**. Se crea una **cuenta de WhatsApp Business (WABA)** con un **número de prueba**.
3. Guarda estos datos (los usará el sistema): **Phone number ID**, **WhatsApp Business Account ID** y genera un **token de acceso permanente** (Usuario del sistema en Configuración del negocio → Usuarios del sistema, con permisos `whatsapp_business_messaging` y `whatsapp_business_management`).
4. **Webhook**: en WhatsApp → Configuración → Webhook:
   - URL de devolución: `https://api.cosdi.mx/api/v1/whatsapp/webhook`
   - Token de verificación: el valor de `WHATSAPP_VERIFY_TOKEN` en tu API (o el `webhookVerifyToken` del negocio).
   - Suscríbete al campo **messages**.
5. Envía un mensaje de prueba desde el número de prueba a tu WhatsApp personal y responde para abrir la ventana de 24 h; confirma que el webhook llega a la API.

## Fase 3 — Número real y plantillas
1. **Agregar tu número real** (o el del primer cliente) en WhatsApp → Configuración de la API → Agregar número de teléfono. Define el **nombre para mostrar** (Meta lo revisa: debe coincidir con el negocio).
2. **Método de pago** en la WABA (tarjeta). Meta cobra por mensaje; ver costos en el plan.
3. Crea la **plantilla de recordatorio** (categoría *Utilidad*) en WhatsApp Manager → Plantillas, p. ej.:
   `Hola {{1}}, te recordamos tu cita de {{2}} el {{3}} a las {{4}} en {{5}}. Responde para confirmar o cancelar.`
   Con botones de respuesta rápida *Confirmar* / *Cancelar*. La aprobación toma minutos a horas.
4. **Para atender a negocios de terceros** (tus clientes): primero puedes conectarlos a mano (cada negocio crea su WABA y te comparte token o lo agregas como socio). Para que lo hagan solos (*Embedded Signup*) tu app debe pasar **App Review** y registrarte como **Tech Provider**; déjalo para cuando tengas varios clientes.

## Fase 4 — Instagram (después)
La API de mensajes de Instagram usa la misma app; requiere cuenta de Instagram *profesional* enlazada a una página de Facebook. Se activa en Casos de uso de la app → Mensajería de Instagram. Fuera del alcance del primer lanzamiento.

## Checklist rápido
- [ ] cosdi.mx publicado con aviso de privacidad y términos
- [ ] Portafolio comercial creado, información completa
- [ ] Verificación de negocio enviada (anota fecha)
- [ ] Dominio verificado en Meta
- [ ] App creada + WhatsApp agregado + webhook verificado
- [ ] Token permanente guardado en lugar seguro (gestor de contraseñas), **nunca en el repositorio**
- [ ] Plantilla de recordatorio aprobada
