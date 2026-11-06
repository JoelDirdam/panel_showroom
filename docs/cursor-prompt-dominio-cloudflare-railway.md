# Prompt para Cursor — conectar cosdi.mx (Cloudflare) con Railway

> Cópialo completo en Cursor (con los MCP de **Cloudflare** y **Railway** activos).
> Antes de pegarlo reemplaza lo que está entre `<...>`.

---

Actúa como DevOps. Tienes los MCP de Cloudflare y Railway. Objetivo: que el dominio **cosdi.mx** (zona ya existente en mi cuenta de Cloudflare) sirva mi aplicación alojada en Railway. **No borres ni modifiques registros DNS existentes sin mostrármelos antes y pedir confirmación.**

## Arquitectura destino
| Host | Destino en Railway | Uso |
|---|---|---|
| `app.cosdi.mx` | servicio **web** (Vue/Vite) | panel y landing |
| `api.cosdi.mx` | servicio **API** (Express, `apps/api`) | API REST y webhook de WhatsApp |
| `cosdi.mx` (raíz) | redirección 301 → `https://app.cosdi.mx` | evita duplicar contenido |
| `www.cosdi.mx` | redirección 301 → `https://app.cosdi.mx` | |

El repo es un monorepo: `apps/api` y `apps/web` son servicios separados (root directory respectivo).

## Pasos
1. **Inspecciona** con Railway MCP: proyecto, servicios (web y API), dominios actuales y variables. Con Cloudflare MCP: la zona `cosdi.mx` y sus registros DNS. Muéstrame un resumen antes de cambiar nada.
2. **Railway → dominios personalizados**: agrega `app.cosdi.mx` al servicio web y `api.cosdi.mx` al servicio API (puerto del servicio). Anota el **CNAME target** y el **TXT de verificación** (`_railway-verify...`) que Railway entregue para cada uno.
3. **Cloudflare → DNS**: crea
   - `CNAME app` → target de Railway del servicio web
   - `CNAME api` → target de Railway del servicio API
   - `TXT _railway-verify.app` y `TXT _railway-verify.api` con los valores que dio Railway
   - Los CNAME deben estar en **DNS only (nube gris)** hasta que Railway emita el certificado; luego puedes activar el proxy (nube naranja).
4. **SSL/TLS en Cloudflare**: modo **Full (strict)**. Activa "Always Use HTTPS".
5. **Redirecciones** (Rules → Redirect Rules): `cosdi.mx/*` y `www.cosdi.mx/*` → `https://app.cosdi.mx/${1}` (301). La raíz necesita un registro proxied (por ejemplo un `A` ficticio `192.0.2.1` proxied) para que la regla se ejecute.
6. **Variables de entorno en Railway**
   - Servicio **API**: `CORS_ORIGIN=https://app.cosdi.mx` (el código acepta varios separados por coma). Verifica que `NODE_ENV=production`.
   - Servicio **web** (variable de *build*): `VITE_API_URL=https://api.cosdi.mx/api` y `VITE_SUPPORT_WHATSAPP=52 6182923010`. **Dispara un redeploy del web** porque Vite las incrusta al compilar.
7. **Correo transaccional (Resend)**: cuando yo te dé el dominio verificado en Resend, crea en Cloudflare los registros que Resend indique (SPF `TXT`, DKIM `CNAME`/`TXT`, y DMARC `TXT _dmarc` con `v=DMARC1; p=none; rua=mailto:joel.madrid.code@gmail.com`). Luego configura en el servicio API: `RESEND_API_KEY=<ya esta en .env>` y `EMAIL_FROM=COSDI <no-reply@cosdi.mx>`. Pídeme la API key; no la inventes ni la imprimas en logs.
8. **Verificación de dominio de Meta**: reserva un paso para agregar el `TXT` que Meta me entregue (te lo pasaré luego).
9. **Valida**: `curl -I https://api.cosdi.mx/health` debe responder 200 con `{"ok":true,"service":"cosdi-api"}`; `https://app.cosdi.mx` debe cargar el login sin errores de CORS en consola; `http://cosdi.mx` redirige a `https://app.cosdi.mx`. Reporta qué quedó listo y qué falta (por ejemplo propagación DNS).

## Reglas
- Muestra cada cambio de DNS antes de aplicarlo y pide confirmación para borrar/editar registros existentes.
- No expongas secretos en la salida. No cambies planes de pago ni elimines servicios o volúmenes de Railway.
- Si algo del MCP no soporta una operación, dame el paso manual exacto (pantalla y valores).
