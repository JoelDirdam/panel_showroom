# COSDI — Productos, planes y roadmap (versión definitiva)

> **COSDI** = **CO**nsultoría y **S**oluciones **DI**gitales · dominio `cosdi.mx`
> Slogan: *Te ofrecemos una solución tecnológica a tu negocio, si no la tenemos te la creamos.*

## 1. Líneas de negocio
1. **Soluciones digitales a la medida** (consultoría/desarrollo para empresas). Es el "si no la tenemos te la creamos".
2. **COSDI ERP + Punto de venta** — lo que ya está hecho (marcas, productos, stock, ventas, caja, cortes, rentas). Ver `plan-implementacion.md`.
3. **COSDI Citas** — **prioridad actual**. Agenda para negocios de citas (estéticas, lashistas, uñas, cejas, maquillaje, barberías) por WhatsApp/Instagram.

## 2. Planes de COSDI Citas

| Plan (código) | Precio sugerido* | Qué incluye | Estado |
|---|---|---|---|
| **Recordatorios** (`CITAS_RECORDATORIOS`) | **$149/mes** | Recordatorios de cita por WhatsApp. Vía panel mínimo o **API para desarrolladores**. | Recordatorios: listos. Falta la API para desarrolladores |
| **Citas** (`CITAS_PANEL`) | **$349/mes** | Panel de citas, crear citas, **link público** de reserva, servicios/horarios, recordatorios por WhatsApp. | **Listo para vender**: panel, link, recordatorios y cobro con tarjeta |
| **Citas + IA** (`CITAS_IA`) | **$549/mes** + créditos de IA | Todo lo anterior + asistente de IA que atiende y agenda por WhatsApp, chats en Kanban. | Motor de IA hecho; falta Kanban y medición de uso |

\*Precios en MXN + IVA, dentro del rango de la competencia (StockPoint Clínica $699, sin WhatsApp ni IA). Se pueden ajustar tras los primeros 5 clientes. **La IA se cobra aparte por créditos** (paquetes de 500 / 2,000 / 6,000 respuestas; ver `plan-implementacion.md` §9).

### Cuenta pausada por falta de pago ✅ (implementado)
- Si vence la prueba/suscripción: el **negocio ve "Cuenta pausada"** y no accede a su panel (la API responde 402).
- Los **clientes siguen agendando** por el link (`/api/public/*` no pasa por ese bloqueo) y las citas se guardan.
- Al reactivar, el negocio ve todo. *No se acepta efectivo*: solo suscripción (ver Pagos abajo).

## 3. Plan Recordatorios para desarrolladores — cómo ejecutarlo
Idea: vender **solo recordatorios por WhatsApp** a quien ya tiene su propio sistema de citas (o a otros desarrolladores/agencias), con una **API simple**:

```
POST /api/v1/reminders          (cabecera Authorization: Bearer <API_KEY>)
{ "phone": "5218112345678", "template": "recordatorio_cita",
  "vars": ["Ana","Corte","10 nov","16:00","Barbería X"], "sendAt": "2026-11-10T20:00:00Z" }
→ 202 { "id": "rem_...", "status": "scheduled" }
GET  /api/v1/reminders/:id      → estado: scheduled | sent | delivered | failed
Webhook de salida (opcional): POST a su URL cuando el cliente responde Confirmar/Cancelar
```
Piezas por construir: tabla `ApiKey` (hash, tenantId, límites), `Reminder` (cola con `sendAt`), job que envía con la plantilla aprobada, medición por mensaje (se cobra por mensaje o paquete) y página de documentación (`/developers`). Reutiliza el módulo de WhatsApp ya hecho. **Cobrar por consumo** (p. ej. $149 incluye 300 recordatorios; extras a $0.40) cubre el costo de Meta (~$0.16 MXN por mensaje de utilidad).

## 4. Herramientas ya existentes que conviene usar (no reinventar)
| Necesidad | Herramienta | Nota |
|---|---|---|
| Correo transaccional (códigos, confirmaciones) | **Resend** (o Brevo/Amazon SES) | Ya hay adaptador en `lib/notify.ts`; solo falta `RESEND_API_KEY` y el dominio verificado |
| SMS de verificación | **Twilio** / **Telcel-Infobip** | Hoy solo imprime en consola; mejor **quitar la verificación por SMS** al inicio |
| Cobro de suscripciones | **Stripe Billing** (tarjeta) + **Mercado Pago Suscripciones** (OXXO/SPEI/tarjetas) | Sin efectivo; un webhook activa/pausa la cuenta |
| WhatsApp Cloud API | **Meta directo** (ya integrado) | Alternativas con proveedor (360dialog, Twilio, Gupshup) si Meta se complica; cobran extra |
| Bandeja unificada de chats | **Chatwoot** (open source) | Solo si el Kanban propio tarda; se integra por webhook |
| Automatizaciones/prototipos | **n8n** | Útil para pilotos sin código |
| Agenda alternativa | **Cal.com** (open source) | Referencia/competidor; no necesario porque ya tenemos agenda propia |
| Pruebas end-to-end | **Playwright** / TestSprite (ya en el repo) | |
⚠️ Evita librerías **no oficiales** de WhatsApp (Baileys, Evolution API): riesgo de bloqueo de número y de incumplir los términos de Meta.

## 5. Estado de construcción
**Hecho (esta iteración)**
- Rebranding total a COSDI (`cosdi.mx`, código promo `COSDI30`, base `cosdi`, paquetes `cosdi-api`).
- Link público de reserva `app.cosdi.mx/reservar/<slug>` + API `/api/public/:slug` (servicios, disponibilidad, reservar), con límite de intentos y revalidación de horario en el servidor.
- Panel **Citas** (agenda día/semana, nueva cita, confirmar/completar/cancelar, link para copiar y compartir) y **Servicios y horarios**.
- Tres planes nuevos en BD, permisos y selector (`CITAS_RECORDATORIOS`, `CITAS_PANEL`, `CITAS_IA`) — migración `20261103000000_plan_types_citas`.
- Pantalla "Cuenta pausada" y bloqueo del panel sin bloquear la reserva pública.
- Adaptador real de correo (Resend).

**Pendiente, en orden**
1. Aplicar migración en producción y configurar `RESEND_API_KEY`, `CORS_ORIGIN`, `VITE_API_URL` (prompt de Cursor).
2. ~~Cobro de suscripción con Stripe~~ ✅ hecho (ver `cobro-stripe.md`). Falta activar la cuenta real de Stripe y, después, Mercado Pago (OXXO/SPEI).
3. ~~Recordatorios por WhatsApp~~ ✅ hechos: plantilla `recordatorio_cita` aprobada; salen del número de COSDI o del número propio del negocio (pantalla "Recordatorios WhatsApp").
4. Kanban de chats + medición/cobro de créditos de IA.
5. API de recordatorios para desarrolladores.
6. Aviso de privacidad y términos para el cliente final que agenda (borrador en `docs/legal/`).
7. Panel SUPERADMIN de costos.
8. Aviso: la pantalla "Home" y "Dashboard" actuales son del showroom; para planes Citas el inicio redirige a la agenda. Falta un dashboard propio de citas.

## 6. Limitaciones conocidas
- Las zonas horarias: la reserva pública usa la zona del negocio (`America/Mexico_City` por defecto); el alta manual desde el panel usa la zona del navegador.
- La reserva pública marca la cita **Pendiente**; el negocio la confirma.
- Rate limit en memoria (por proceso): suficiente para una sola instancia de Railway.
- No se pudo probar contra una base de datos local (Docker apagado): el código compila (`tsc`, `vue-tsc`) pero **falta una prueba manual del flujo completo** tras aplicar la migración.
