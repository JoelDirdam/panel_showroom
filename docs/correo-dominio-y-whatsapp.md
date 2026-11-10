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

## 4. Número de WhatsApp (618 292 3010)

- Para poder registrarlo en la API de WhatsApp Business **no puede estar activo en la app de WhatsApp ni WhatsApp Business**. Hay que eliminar la cuenta: WhatsApp → Ajustes → Cuenta → Eliminar cuenta (se pierden chats y grupos; haz respaldo).
- Después de eliminarla, el número solo funcionará vía API (no podrás atenderlo desde el celular salvo con un panel como COSDI).
- Alternativa sin riesgo: usar el **número de prueba gratuito de Meta** mientras desarrollas, y migrar el 618 292 3010 al final.
- Ojo: el footer de la home y `VITE_SUPPORT_WHATSAPP` (Dockerfile web) apuntan a este número. Si lo migras a la API, quien escriba ahí caerá en la API; decide si el soporte usará otro número.
