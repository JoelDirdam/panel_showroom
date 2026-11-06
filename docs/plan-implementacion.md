# COSDI — Plan de implementación

> Slogan: *Te ofrecemos una solución tecnológica a tu negocio, si no la tenemos te la creamos.*
> Base: revisión del código actual + `Prompts_sistema_citas.txt` (Gemini) + requisitos del dueño.
> Público: (1) dueños de **showroom / tienda** que reciben productos (propios o en consignación) y aún no tienen registro: ventas, gastos, proveedores, inventario; (2) negocios cuyo canal principal son **citas por WhatsApp o Instagram**. México, MXN.

## 1. Diagnóstico: qué ya existe vs. qué falta

| Prompt | Estado real en el repo | Falta |
|---|---|---|
| **1. BD + API citas** | ✅ Hecho: `WhatsappConfig`, `Service`, `BusinessHour`, `Appointment`, `Sucursal`, `Conversation`, `ConversationMessage`; rutas `/api/v1/services`, `business-hours`, `appointments`, `whatsapp-config`. Validación de solapamiento en `appointments.service.ts`. | Campos `reminderSent` / `reminderSentAt`; `accessToken` de WhatsApp en texto plano (cifrar); revisar que `/api/v1` aplique el gate de suscripción. |
| **2. Webhook WhatsApp** | ✅ Hecho: GET/POST webhook, parser, cola en memoria (EventEmitter) con dedup, `sendTextMessage`, `sendInteractiveButtons`. | Validar firma `X-Hub-Signature-256` (App Secret de Meta); cola en memoria se pierde al reiniciar (aceptable al inicio, migrar a BullMQ/Redis si crece); manejo de `interactive` replies (ver P4). |
| **3. Motor IA** | ✅ Hecho: `processCustomerMessage`, OpenAI con tools (`check_availability`, `create_appointment`, `request_human_agent`), historial en BD, límite de rondas, sanitize, `toggle-ai` por chat. | **Medición de consumo** (tokens por tenant/mensaje) → base para cobrar IA y para el panel de costos. |
| **4. Recordatorios** | ❌ No existe (`modules/notifications` ni cron). Enum sin estado `UNCONFIRMED`. | Todo: job cada 15 min, `reminderSent`, botones confirmar/cancelar, manejo de `interactive_response` en webhook. |
| **5. Frontend citas** | ❌ No existe. Solo hay `Agenda.vue` (que es de citas de *stock/marcas*, otro concepto) y stubs de clínica. Sin stores Pinia de citas. | Calendario, CRUD servicios/horarios, ajustes WhatsApp, **Kanban de chats**, link público, panel de cliente. |

**Pendientes grandes que Gemini no cubría** (sin contexto del proyecto): cobro con suscripción, link público de reserva, panel del cliente final, Kanban, costos en SUPERADMIN, página explicativa de ERP, dominio/WhatsApp en producción.

Producto: dos líneas bajo una misma plataforma — **ERP/Punto de venta** (marcas, stock, ventas, caja; falta infraestructura POS: hardware/Tauri, ver `docs/pos-tauri-app-prompt.md`) y **Citas + asistente IA**.

---

## 2. Fases (orden recomendado)

### Fase 0 — Cimientos y dominio (1–2 días)
- Comprar dominio; apuntar `app.` (web) y `api.` (API) en Railway; actualizar CORS, `FRONTEND_URL`, correos y meta/og de `index.html`.
- Variables de entorno nuevas documentadas en `.env.example` (Stripe, MP, PayPal, Meta, OpenAI).
- Cifrar `WhatsappConfig.accessToken` (AES-256-GCM con clave en env).
- Quitar `skip-payment` cuando exista cobro real (mantener prueba gratis sin tarjeta como decisión de negocio, ver Fase 1).

### Fase 1 — Cobro de suscripciones (PRIORIDAD: sin esto no se puede vender)
Hoy `TenantSubscription` tiene `paymentProvider`, `externalCustomerId`, `currentPeriodEndsAt`, pero `onboarding.ts` es un stub.

1. **Modelo**: ampliar `TenantSubscription` (`externalSubscriptionId`, `cancelAtPeriodEnd`, `lastPaymentAt`, `priceId`); nueva tabla `Payment` (tenantId, provider, externalId, amount, currency, status, kind: PLAN | AI_USAGE, raw JSON) y `ProcessedWebhookEvent` (idempotencia).
2. **Capa de abstracción** `modules/billing/` con interfaz común `BillingProvider { createCheckout, cancel, handleWebhook }` y tres adaptadores:
   - **Stripe** (tarjeta, suscripción recurrente — Checkout + Customer Portal). Principal.
   - **Mercado Pago** (suscripciones/preapproval; OXXO/SPEI según disponibilidad) — clave para México.
   - **PayPal** (Subscriptions API).
3. **Webhooks** `/api/v1/billing/webhook/:provider` con verificación de firma e idempotencia; actualizan `status`, `currentPeriodEndsAt`. `assertSubscriptionActive` ya bloquea al expirar.
4. **Frontend**: pantalla de pago en onboarding (reemplaza `PaymentPending`), selector de método, sección "Mi suscripción" en Preferencias (cambiar plan, cancelar, facturas).
5. Planes y precios: definir tabla (NEGOCIO ERP/POS, CITAS) en un solo lugar (`lib/plans.ts` ya existe en web; mirror en API). Decisión pendiente: precios.
6. Pruebas en sandbox de los tres proveedores antes de producción. Para el dueño: comisiones por proveedor entran al panel de costos (Fase 6).

### Fase 2 — Citas: backend faltante (≈3 días)
- Migración: `Appointment.reminderSent`, `reminderSentAt`, `source` (MANUAL | PUBLIC_LINK | WHATSAPP_AI), `customerUserId?`; decidir si se agrega `UNCONFIRMED` (hoy `PENDING` cumple ese rol: recomendado **no** agregarlo y usar `PENDING`).
- **Prompt 4**: `modules/notifications/reminder.job.ts` con `node-cron` (cada 15 min), ventana 3h45–4h15, solo `PENDING`, `reminderSent=false`; botones `btn_confirm_/btn_cancel_`; extender parser/webhook para `interactive.button_reply`.
  - Nota Meta: mensajes iniciados por el negocio fuera de la ventana de 24h requieren **plantilla aprobada**; registrar plantilla `recordatorio_cita` y usar `sendTemplateMessage`.
- **Reserva pública**: endpoints sin auth bajo `/api/v1/public/:slug/` (info del negocio, servicios, disponibilidad por día, crear cita) con rate limit (`lib/rateLimit.ts` ya existe) y captcha ligero. Reusa `availability.ts` de la IA.
- **Cliente final**: nuevo rol `CUSTOMER` (o cuenta ligera por teléfono/email con magic link/OTP; hay base de SMS/email verification) con endpoints "mis citas": ver, reprogramar, cancelar.
- **Kanban**: endpoint `GET /api/v1/conversations?board=1` que agrupa por columnas: *Chats activos* · *IA atendiendo* · *Requiere humano* (`humanRequestedAt`) · *Cita pendiente* · *Cita confirmada*. Reusar `Conversation` + `Appointment`; permitir mover tarjeta → acciones (tomar chat = `aiEnabled=false`, enviar mensaje manual por WhatsApp).
- Respuesta manual del emprendedor desde el panel (enviar vía `sendTextMessage` y guardar como mensaje).

### Fase 3 — Citas: frontend (≈5 días) — Prompt 5 adaptado
Carpeta `apps/web/src/views/appointments/` + stores Pinia (`useAppointmentStore`, `useServiceStore`, `useConversationStore`):
- `AppointmentsView.vue` (calendario día/semana, badges por estado, modal crear/editar).
- `ServicesConfigView.vue` (servicios + horarios por día + sucursales).
- `WhatsappSettingsView.vue` (Phone Number ID, WABA ID, token, prompt, activar IA; guía paso a paso para conectar Meta).
- `ChatsKanbanView.vue` (tablero Kanban; tarjeta = chat + cita ligada; drag & drop con `vuedraggable`).
- `PublicBooking.vue` (ruta pública `/reservar/:slug`) y botón "Copiar mi link / compartir en redes" + QR.
- `MyAppointments.vue` (panel del cliente).
- Agregar módulos al `entitlements` (API y mirror web) y al menú; quitar los stubs de clínica cuando estén cubiertos.

### Fase 4 — WhatsApp con IA en producción (≈3 días + trámites Meta)
- Crear app en Meta for Developers, verificar el negocio (Business Verification), número de WhatsApp Business, **Embedded Signup** para que cada emprendedor conecte su número sin copiar tokens a mano (reduce soporte); token de larga duración.
- Webhook con HTTPS del dominio real + verificación de firma.
- Evaluar `meta-business-agent` (documentación enlazada) vs. nuestro motor propio: mantenemos el motor propio por control de costos y datos; revisar si Meta ofrece algo que simplifique el handoff.
- **IA como cobro aparte** (decisión del dueño): ver Fase 5.

### Fase 5 — Cobro de IA por uso (separado de la mensualidad)
- Tabla `AiUsage` (tenantId, conversationId, model, inputTokens, outputTokens, costUsd, createdAt) alimentada desde `llm.ts` (el SDK devuelve `usage`).
- Modelos de cobro posibles (elegir uno): **paquetes prepago de créditos** (recomendado: sin riesgo de cartera), o **cargo mensual por consumo** con tope.
- Cuando se agoten créditos / llegue al tope → la IA se pausa y el chat pasa a "Requiere humano" (no se pierde el cliente).
- Cuentas de prueba: tope fijo de mensajes IA (p. ej. 50) para acotar costo.
- Compra de créditos reutiliza el módulo de billing (Payment.kind = AI_USAGE).

### Fase 6 — Panel SUPERADMIN de costos
Hoy `platform.ts` ofrece stats/tenants. Agregar vista `PlatformCosts.vue` + `GET /api/platform/costs`:
- **Costos fijos** (tabla editable `PlatformCost`: concepto, monto, moneda, periodicidad, proveedor): Railway (API, web, Postgres), dominio (anual/12), correo/SMS, Meta (WhatsApp por conversación), servicios de IA.
- **Costos variables**: IA real desde `AiUsage` (por tenant, por plan y de cuentas de prueba), comisiones de pasarelas desde `Payment`, SMS/email enviados.
- **Ingresos**: MRR, ingresos por IA, tenants activos/trial/expirados.
- **Margen**: ingresos − costos, costo por tenant, costo de adquirir un trial (IA gastada en trials sin convertir), alertas cuando un tenant consume por encima de su pago.
- Railway: usar su API/CLI de uso si está disponible; si no, capturar manualmente el monto mensual (campo editable) y estimar con métricas.
- Exportar a CSV.

### Fase 7 — Marketing: "¿Qué es un ERP?"
- Nueva página pública `/que-es-un-erp` (contenido propio, no copiar el de Mercado Pago): qué es un ERP, módulos (inventario, ventas, caja, marcas/consignación, agenda), ventajas para pymes, ERP + punto de venta, cómo COSDI lo resuelve, FAQ, CTA a la prueba gratis.
- SEO: title/description únicos, JSON-LD FAQ, enlazar desde landing `/planes` y footer; mismo estilo que `LandingPlanes.vue`.
- Landing con el slogan y secciones ERP/POS vs. Citas+IA.

### Fase 8 — Punto de venta (infraestructura)
Seguir `docs/pos-tauri-app-prompt.md`: app de escritorio (Tauri) con impresión de tickets (`saleTicket.ts` ya existe), lector de código de barras, cajón, modo offline con sincronización. Se planea aparte: es un proyecto de tamaño propio; no bloquea el lanzamiento del ERP web ni de Citas.

---

## 3. Orden de ejecución sugerido

1. **Fase 0 + 1** (dominio y cobro) — habilita vender.
2. **Fase 2 → 3** (citas manuales + link público + panel cliente) — primer producto vendible de Citas, sin depender de Meta.
3. **Fase 7** (página ERP) — se puede hacer en paralelo, es independiente.
4. **Fase 4 → 5** (WhatsApp + IA + cobro IA) — los trámites de Meta tardan: **iniciar la verificación de negocio desde ya**.
5. **Fase 6** (costos SUPERADMIN) — el modelo `AiUsage` debe existir antes que la IA se abra a clientes; el panel puede llegar justo después.
6. **Fase 8** (POS) como proyecto aparte.

Paralelizable: Fase 1 (billing) ∥ Fase 3 (frontend citas) ∥ Fase 7 (marketing), por tocar archivos distintos.

## 4. Riesgos y decisiones abiertas

- **Precios y planes** (mensualidad ERP/POS, mensualidad Citas, créditos IA).
- **Público objetivo** (nota cortada del mensaje).
- **Cobro IA**: prepago vs. consumo.
- **Meta**: verificación de negocio, plantillas aprobadas, límites de mensajes iniciados por el negocio; costo por conversación de WhatsApp (se traslada o se absorbe).
- **Datos personales**: aviso de privacidad (LFPDPPP) y términos para clientes finales que agendan; los Términos actuales cubren al emprendedor, no al cliente final.
- **Secretos**: tokens de Meta cifrados; nunca en logs.
- **Cola en memoria**: aceptable para arrancar; migrar a Redis/BullMQ si hay varios réplicas en Railway (el cron de recordatorios con más de una réplica duplicaría envíos → bloqueo por BD o una sola réplica).
- **Zona horaria**: `lib/timezone.ts` ya existe; los recordatorios y el link público deben usar la zona del negocio.

---

## 5. Brechas detectadas por el público objetivo

- **Gastos y proveedores**: no existen en el esquema (`grep` sin resultados). El ERP los promete → nuevo módulo `Expense` (concepto, categoría, monto, fecha, proveedor, comprobante) y `Supplier` (contacto, productos que surte, saldo), con reporte de utilidad (ventas − costo − gastos) en el dashboard. **Prioridad alta, va antes de lanzar el plan ERP.**
- **Límites por plan** (marcas, empleados, clientes): hoy `entitlements.ts` solo controla módulos, no cantidades. Agregar `PLAN_LIMITS` y validarlos al crear marcas/empleados/clientes (API + aviso en web).
- **Instagram**: Meta ofrece la *Instagram Messaging API* dentro de la misma app de Meta. Añadir `channel` (WHATSAPP | INSTAGRAM) a `Conversation`/`Appointment.source`, reutilizar el motor de IA y mostrar ambos canales en el Kanban. Se hace después de WhatsApp (Fase 4b).
- **Facturación CFDI**: Ventti la vende y StockPoint la tiene "próximamente". No entra en el lanzamiento; se comunica como "próximamente" si se pregunta.

## 6. Competencia (revisada el 2026-10-19)

| Competidor | Precio | Notas |
|---|---|---|
| **StockPoint Multimarca** (el más parecido al ERP showroom) | Lite $299 · Emprende $399 · Plus $499 · Pro $599 /mes | 5/15/35/ilimitadas marcas; 2/3/5/ilimitados empleados; 15 días gratis sin tarjeta; sin CFDI aún |
| **StockPoint Clínica** | $699 /mes | Agenda, portal de pacientes, recordatorios **por correo**, caja. **Sin WhatsApp ni IA** |
| **Ventti** (ERP/facturación) | Personal $4,499 · Pequeños Negocios $7,000 /año por sucursal (+IVA) | Licencia anual, timbres CFDI incluidos; ≈ $375–583/mes; orientado a facturación |

Ventaja diferencial nuestra: **citas con asistente de IA por WhatsApp/Instagram + link de reserva**, algo que ninguno de los dos ofrece; y un precio de entrada menor en el ERP.

## 7. Precios propuestos (MXN/mes, **más IVA**, como Ventti)

| Plan | Precio | Incluye |
|---|---|---|
| **ERP Lite** | **$249** | 5 marcas · 2 empleados · 200 clientes · ventas, caja, stock, gastos, proveedores |
| **ERP Emprende** | **$329** | 15 marcas · 3 empleados · 600 clientes |
| **ERP Plus** | **$429** | 35 marcas · 5 empleados · 1,500 clientes |
| **ERP Pro** | **$529** | ilimitado |
| **Citas Esencial** | **$349** | 1 profesional/sucursal, link público de reserva, agenda, panel del cliente, Kanban de chats, recordatorios |
| **Citas Pro** | **$549** | hasta 5 profesionales, sucursales, reportes, caja y gastos |
| **Combo ERP + Citas** | **−20 %** sobre la suma | |
| **Anual** | paga 10, recibe 12 | |

Lógica: ERP ≈ 17 % bajo StockPoint en cada escalón (somos nuevos y sin CFDI). Citas Pro queda ≈ 21 % bajo Clínica ($699) y además trae WhatsApp. Prueba gratis 15 días sin tarjeta (igual que la competencia); el código `COSDI30` da 30. **IA se cobra aparte (sección 9).**

## 8. Costos de la plataforma (estimados; USD→MXN a ≈ 18.5, **verificar**)

**Fijos mensuales de arranque** (≈ $1,000–1,500 MXN):

| Concepto | Estimado | Fuente |
|---|---|---|
| Railway (API + web + Postgres, ~3 servicios pequeños) | $20–35 USD ≈ $370–650 | [Railway pricing](https://railway.com/pricing): Pro $20/mes con $20 de uso incluido; vCPU ≈ $20/mes, RAM ≈ $10/GB, volumen ≈ $0.15/GB, egress $0.05/GB. Hobby $5 si cabe en $5 de uso |
| Dominio | ≈ $15–20 USD/año ≈ $25–30 /mes | precio típico, verificar con el registrador |
| Correo transaccional + SMS de verificación | $0–20 USD + ≈ $1 MXN por SMS | depende del proveedor elegido |
| Respaldos / monitoreo | $0–10 USD | opcional |

**Variables:**

| Concepto | Costo | Fuente |
|---|---|---|
| Stripe (tarjeta MX) | 3.6 % + $3 MXN (+ 0.7 % si se usa Stripe Billing) | [Stripe MX](https://stripe.com/mx/pricing) |
| Mercado Pago / PayPal | ≈ 3.5–4 % + cargo fijo (**no verificado**, confirmar en cuenta) | — |
| OpenAI `gpt-4o-mini` | $0.15 / 1M tokens entrada, $0.60 / 1M salida | agregadores ([ejemplo](https://pricepertoken.com/pricing-page/model/openai-gpt-4o-mini)); no pude abrir la página oficial |
| WhatsApp (Meta), México | **Desde el 1-oct-2026** se cobra por mensaje: servicio/utilidad ≈ **$0.0085 USD** (≈ $0.16 MXN) y marketing ≈ $0.0397; **1,000 mensajes de servicio gratis por número al mes** | [Meta](https://developers.facebook.com/docs/whatsapp/pricing) + tarifas reportadas por terceros ([resumen](https://www.flowcall.co/blog/whatsapp-business-api-pricing)); **confirmar en el rate card oficial** |

**Costo por mensaje atendido por IA** (prompt ≈ 2,000 tokens, hasta 3 rondas de herramientas ≈ 6,000 entrada + 400 salida):
- OpenAI ≈ $0.0011 USD ≈ **$0.02 MXN**.
- WhatsApp: **$0** mientras el número no pase de 1,000 mensajes de servicio al mes (≈ 120 citas); después ≈ **$0.16 MXN** por respuesta.
- Un recordatorio (plantilla de utilidad) ≈ $0.16 MXN.
- Cuenta de prueba con tope de 30 respuestas de IA ≈ **$0.60 MXN** de IA + SMS de verificación ≈ $1: costo de cada prueba ≈ **$2 MXN**, despreciable.

**Punto de equilibrio:** con costos fijos de ≈ $1,000–1,500 y ≈ $300 netos por cliente tras comisión de pasarela, bastan **≈ 4–6 clientes** de pago. Con 50 clientes a ≈ $400 promedio: ingreso ≈ $20,000/mes vs. costos ≈ $2,000–3,000.

## 9. Cobro de la IA (tu comisión incluida)

Modelo recomendado: **créditos prepago** (1 crédito = 1 respuesta de IA enviada, incluye el costo de OpenAI y el de WhatsApp si el número pasa de la franja gratis).

| Paquete | Precio | $/crédito | Costo real peor caso (IA + WhatsApp de pago) | Margen peor caso |
|---|---|---|---|---|
| 500 créditos | **$149** | $0.30 | ≈ $0.18 | ≈ 40 % |
| 2,000 créditos | **$499** | $0.25 | ≈ $0.18 | ≈ 28 % |
| 6,000 créditos | **$1,199** | $0.20 | ≈ $0.18 | ≈ 10 % |

- En el caso típico (negocio chico dentro de los 1,000 mensajes gratis de Meta) el costo real es ≈ $0.02, así que el margen ≈ 90 %+. **Esa diferencia es tu comisión**; se ve en el panel SUPERADMIN (costo real vs. cobrado).
- Prepago evita cartera vencida; al agotarse los créditos la IA se pausa y el chat pasa a "Requiere humano".
- Dejar el precio por crédito como **configuración editable** (`PlatformSetting`), para ajustarlo si Meta u OpenAI cambian tarifas.
- Cobro: mismo módulo de billing (pago único, `Payment.kind = AI_CREDITS`), no suscripción.
- Opcional más adelante: recarga automática al bajar de X créditos.

## 10. Decisiones ya tomadas / abiertas

Tomadas: público objetivo, IA prepago con margen, precios propuestos arriba (revisables).
Abiertas: ¿precios con IVA incluido o "+ IVA"? (propuesta: + IVA); verificar tarifas oficiales de Meta (México) y de Mercado Pago/PayPal antes de publicar precios; confirmar tipo de cambio; elegir proveedor de correo/SMS.

Ajuste a las fases: añadir a **Fase 2** los módulos Gastos y Proveedores y `PLAN_LIMITS`; **Fase 4b** Instagram; **Fase 5** usa los paquetes de la sección 9; **Fase 6** muestra costo real vs. cobrado por crédito.
