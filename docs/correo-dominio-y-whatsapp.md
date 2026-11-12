# Correo @cosdi.mx y verificación de Meta (WhatsApp)

## 2. Correo contacto@cosdi.mx → Gmail (Cloudflare Email Routing, gratis)

Cloudflare **reenvía** lo que llegue a `contacto@cosdi.mx` a `joel.madrid.code@gmail.com`. No crea un buzón: tú lees en Gmail.

1. dash.cloudflare.com → el dominio `cosdi.mx` debe estar en Cloudflare (si los DNS ya están ahí, perfecto).
2. **Email → Email Routing → Get started / Enable**.
3. **Routing rules → Create address**:
   - `contacto@cosdi.mx` → destino `joel.madrid.code@gmail.com`
   - `privacidad@cosdi.mx` → mismo destino (el aviso de privacidad lo menciona)
4. Cloudflare manda un correo de verificación a Gmail: dale clic al enlace.
5. Acepta que Cloudflare agregue los registros **MX** y **SPF (TXT)** automáticamente.
6. Prueba: envía un correo a `contacto@cosdi.mx` desde otra cuenta.

Notas:
- **Solo recibe.** Para *responder como* contacto@cosdi.mx hace falta un servicio SMTP (Resend, Brevo o Zoho Mail gratis). Para la verificación de Meta basta con recibir.
- Si la app ya envía correos con otro proveedor (verificación de cuenta), no dupliques el registro SPF: debe quedar **un solo** TXT `v=spf1 ...` que incluya ambos.

## 3. Verificación del negocio (persona física)

Documentos: Constancia de Situación Fiscal (la tuya) y un comprobante de domicilio reciente (luz, agua, teléfono; máx. 3 meses) **a tu nombre y con ese mismo domicilio**.

El sitio ya muestra exactamente ese nombre y domicilio en el pie de página y en el aviso de privacidad. En Meta captura el nombre y dirección **idénticos** a la constancia, el sitio `https://cosdi.mx` y el correo `contacto@cosdi.mx`.

Ruta: business.facebook.com → Configuración del negocio → Centro de seguridad → Iniciar verificación.

## 4. Números de WhatsApp

- **618 321 9919 (nuevo, chip dedicado):** es el que se registra en la API de WhatsApp Business (Meta). **No instales WhatsApp ni WhatsApp Business en ese número**; solo debe poder recibir el SMS/llamada con el código de verificación. Conserva el chip activo (recarga periódica) para no perder la línea.
- **618 292 3010:** queda para soporte con la app WhatsApp Business (la del sitio y `VITE_SUPPORT_WHATSAPP`). No hay que eliminarlo.
- Nombre para mostrar en Meta: "COSDI" (igual que el sitio).

### Pasos en Meta
1. business.facebook.com → Configuración del negocio → crear/seleccionar el portafolio comercial "COSDI".
2. Iniciar la verificación del negocio (sección 3) con la constancia y el comprobante de domicilio.
3. developers.facebook.com → crear app tipo "Business" → agregar el producto **WhatsApp**.
4. WhatsApp → Configuración de la API → **Agregar número de teléfono** (618 321 9919, país México +52) y verificar con el código.
5. Guardar `Phone number ID`, `WhatsApp Business Account ID` y generar un token permanente (usuario del sistema) para el backend.

## 5. Recordatorios de cita por WhatsApp (API de COSDI)

Código: `apps/api/src/services/appointmentReminders.service.ts` (se inicia desde `src/index.ts`). Cada 5 minutos busca citas PENDING/CONFIRMED que empiecen en las próximas N horas y no tengan recordatorio, y envía una **plantilla** por WhatsApp. Si el negocio tiene su propia configuración activa (`WhatsappConfig`) usa esa; si no, usa el número de la plataforma COSDI (variables de entorno).

### Lo que tienes que hacer tú
1. **Crear la plantilla** en Administrador de WhatsApp → Plantillas de mensajes → Crear:
   - Nombre: `recordatorio_cita` · Categoría: **Utilidad** · Idioma: **Español (MEX)**
   - Cuerpo: `Hola {{1}}, te recordamos tu cita en {{2}} ({{3}}) el {{4}}. Si necesitas cambiarla, responde a este mensaje.`
   - Espera la aprobación (minutos u horas).
2. **Crear el token permanente**: Configuración del negocio → Usuarios del sistema → Agregar (rol Administrador) → Asignar activos (tu app COSDI y la cuenta de WhatsApp, control total) → Generar token con permisos `whatsapp_business_messaging` y `whatsapp_business_management`. **Cópialo una vez y no lo compartas.**
3. **Copiar el Phone number ID** del número 618 321 9919 (Administrador de WhatsApp → Números de teléfono, o developers.facebook.com → tu app → WhatsApp → Configuración de la API).
4. **Variables en Railway** (servicio `api`):
   - `WHATSAPP_PHONE_NUMBER_ID` = el Phone number ID
   - `WHATSAPP_ACCESS_TOKEN` = el token permanente
   - `WHATSAPP_VERIFY_TOKEN` = una cadena larga inventada por ti (para el webhook)
   - `WHATSAPP_REMINDERS_ENABLED` = `true` (solo cuando la plantilla esté aprobada)
   - Opcionales: `WHATSAPP_REMINDER_TEMPLATE`, `WHATSAPP_REMINDER_LANG` (`es_MX`), `WHATSAPP_REMINDER_HOURS_BEFORE` (`24`)
5. **Webhook** (developers.facebook.com → tu app → WhatsApp → Configuración):
   - URL de devolución de llamada: `https://api.cosdi.mx/api/v1/whatsapp/webhook`
   - Token de verificación: el mismo `WHATSAPP_VERIFY_TOKEN`
   - Suscribirse al campo **messages**.
6. **Desplegar** la API (la migración `20261111000000_appointment_whatsapp_reminders` se aplica sola al arrancar).
7. **Probar**: crea una cita para dentro de unas horas con tu propio celular y revisa los logs (`[reminders] enviados: 1`).
