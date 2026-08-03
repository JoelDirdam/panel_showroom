# Contratos de planes — Clínica / Restaurante / Marca

> Documento de arquitectura del **Agente H**. Define la matriz de módulos
> por plan, los flags de features stub y los contratos de API que otro
> agente deberá implementar. **No implementa producto** — solo scaffolding
> (librería de entitlements + rutas/vistas placeholder).
>
> Nota: `apps/api/src/lib/entitlements.ts` ya existía (creado por Agente B
> e integrado en `GET /auth/me` vía `meShape.ts`). Este documento describe
> la versión **extendida** por Agente H sobre ese mismo archivo — se
> mantuvo el contrato original (`EntitlementModule`, `getEntitlements`)
> para no romper a los consumidores ya conectados.

## 1. Fuente de verdad

- Backend: `apps/api/src/lib/entitlements.ts` (módulos + flags por plan)
- Backend: `apps/api/src/lib/meShape.ts` (arma la respuesta de `/auth/me`, incluye `entitlements` y `featureFlags`)
- Frontend (mirror manual, sin build step compartido): `apps/web/src/lib/entitlements.ts`
- Enum de planes: `PlanType` en `apps/api/prisma/schema.prisma` (`NEGOCIO`, `CLINICA`, `RESTAURANTE`, `MARCA`)
- Suscripción del tenant: modelo `TenantSubscription` (`planType`, `status`, `trialEndsAt`)

Ambos archivos (`apps/api` y `apps/web`) declaran los mismos tipos (`EntitlementModule`, `FeatureFlag`) y funciones (`canAccessModule`, `isStubModule`, etc.). Si cambias la matriz en uno, replica el cambio en el otro.

## 2. Forma real de `/auth/me` (ya implementada)

```jsonc
{
  "id": "...", "email": "...", "name": "...", "role": "BUSINESS",
  "tenantId": "...", "brandId": null,
  "tenant": { "id": "...", "name": "...", "slug": "...", /* ... */ },
  "subscription": { "planType": "NEGOCIO", "status": "ACTIVE", "trialEndsAt": "...", "promoCodeUsed": null } /* | null */,
  "entitlements": ["dashboard", "brands", "products", "stock", "..."],
  "featureFlags": [],
  "preferences": { /* BusinessPreferences | null */ }
}
```

- `entitlements` es un **array plano** de `EntitlementModule` (no un objeto `{planType, modules, flags}`). Se calcula con `getEntitlements(subscription?.planType)`.
- `featureFlags` es un **array plano** de `FeatureFlag` habilitados por el plan (nuevo campo agregado por Agente H, aditivo — no rompe consumidores existentes de `entitlements`). Se calcula con `getFeatureFlags(subscription?.planType)`.
- `POST /auth/login` **todavía no** incluye `entitlements`/`subscription` (responde un shape corto). Por eso en el FE ambos campos son opcionales en `User` — ver `apps/web/src/services/api.ts`.

## 3. Matriz de módulos por plan (`EntitlementModule`)

| Módulo | NEGOCIO | CLINICA | RESTAURANTE | MARCA | Estado |
|---|---|---|---|---|---|
| `dashboard` | ✅ | ✅ | ✅ | ✅ | implementado |
| `brands` | ✅ | — | — | — | implementado |
| `products` | ✅ | — | ✅ (platillos) | ✅ | implementado |
| `stock` | ✅ | — | ✅ | ✅ | implementado |
| `productRequests` | ✅ | — | — | ✅ | implementado |
| `agenda` | ✅ | ✅ | — | — | implementado |
| `caja` | ✅ | ✅ | ✅ | — | implementado |
| `sales` | ✅ | ✅ | ✅ | ✅ | implementado |
| `customers` | ✅ | ✅ (pacientes) | ✅ | — | implementado |
| `giftCards` | ✅ | — | — | — | implementado |
| `layaways` | ✅ | — | — | ✅ | implementado |
| `users` | ✅ | ✅ | ✅ | — | implementado |
| `preferences` | ✅ | ✅ | ✅ | ✅ | implementado |
| `business` | ✅ | ✅ | ✅ | — | implementado (config. de negocio) |
| `employees` | ✅ | — | — | — | **stub** (Agente H) |
| `expenses` | ✅ | — | — | — | **stub** (Agente H) |
| `commissions` | ✅ | — | — | — | **stub** (Agente H) |
| `discounts` | ✅ | — | — | — | **stub** (Agente H) |
| `cashRegisters` | ✅ | — | — | — | **stub** (Agente H) |
| `inventory` | — | — | — | ✅ | pendiente (Agente H, alcance BRAND) |
| `orders` | — | — | ✅ (comandas) | ✅ | pendiente (Agente H) |
| `cortes` | — | — | — | ✅ | pendiente (Agente H, cortes de comisión por marca) |
| `mensualidad` | — | — | — | ✅ | pendiente (Agente H, renta/mensualidad de espacio) |

`STUB_MODULES = ['employees', 'expenses', 'commissions', 'discounts', 'cashRegisters']` — declarados para que la UI los muestre como "Próximamente" en vez de ocultarlos por completo (aún sin entrada de menú ni ruta).

## 4. Flags por plan (`FeatureFlag`)

| Flag | Plan | Descripción | Estado |
|---|---|---|---|
| `patientReminders` | CLINICA | Recordatorios de citas por WhatsApp/email | **stub** |
| `medicalHistory` | CLINICA | Expediente médico por paciente | **stub** |
| `dishes` | RESTAURANTE | Catálogo de platillos (variante de `products`) | **stub** |
| `ordersKitchen` | RESTAURANTE | Tablero de comandas (KDS) | **stub** |
| `ai` | RESTAURANTE | Sugerencias/asistencia con IA sobre comandas | **stub** |
| `sms` | RESTAURANTE | Notificaciones SMS al cliente | **stub** |

## 5. Reglas de acceso

- `canAccessModule(modules, moduleId)`: si `modules` es `null`/`undefined`/vacío → **se permite acceso a todo**. Esto cubre tenants legacy sin `TenantSubscription` y el estado justo después de `POST /auth/login` (que no manda `entitlements` todavía).
- `hasFeatureFlag(flags, flag)`: si `flags` es `null`/`undefined` → `false` (los flags stub no se activan solos).
- `isStubModule(moduleId)`: para que la UI decida si pintar "Próximamente" en vez de la vista real.

## 6. Contratos API futuros (no implementados)

### 6.1 Recordatorios de pacientes (CLINICA · flag `patientReminders`)

```
GET    /api/clinic/reminders/settings        -> { channel: 'whatsapp'|'email'|'both', hoursBefore: number, templateId: string }
PUT    /api/clinic/reminders/settings        <- { channel, hoursBefore, templateId }
GET    /api/clinic/reminders/templates       -> ReminderTemplate[]
POST   /api/clinic/reminders/templates       <- { name, channel, body }
POST   /api/clinic/reminders/test            <- { appointmentId }   // envía un recordatorio de prueba
```

`ReminderTemplate`: `{ id, name, channel: 'whatsapp'|'email', body, createdAt }`. Se dispara desde el modelo `Appointment` existente (no requiere tabla nueva de citas, sólo de plantillas/logs de envío).

### 6.2 Historial médico (CLINICA · flag `medicalHistory`)

```
GET    /api/clinic/patients/:customerId/history      -> MedicalRecord[]
POST   /api/clinic/patients/:customerId/history       <- { note, diagnosis?, attachments?: string[] }
GET    /api/clinic/patients/:customerId/history/:id  -> MedicalRecord
```

`MedicalRecord`: `{ id, customerId, note, diagnosis, attachments: string[], createdById, createdAt }`. `customerId` reutiliza el modelo `Customer` existente (el "paciente" es un `Customer` del tenant).

### 6.3 Platillos (RESTAURANTE · flag `dishes`, módulo `products`)

```
GET    /api/dishes            -> Dish[]                 // análogo a GET /api/products
POST   /api/dishes            <- { name, price, categoryId?, variants?: DishVariant[] }
PATCH  /api/dishes/:id        <- Partial<Dish>
```

`Dish` extiende `Product` con `variants: { name, priceDelta }[]` e `ingredients: { productId?, name, qty }[]` opcionales (se puede modelar como tabla `Dish` 1:1 con `Product`, similar a `Stock`).

### 6.4 Comandas de cocina (RESTAURANTE · módulo `orders`, flags `ordersKitchen`, `ai`, `sms`)

```
GET    /api/kitchen-orders                 -> KitchenOrder[]     // tablero en vivo
POST   /api/kitchen-orders                 <- { saleId, lines: { dishId, qty, notes? }[] }
PATCH  /api/kitchen-orders/:id/status      <- { status: 'PENDING'|'IN_PROGRESS'|'READY'|'DELIVERED' }
POST   /api/kitchen-orders/:id/notify-sms  <- { customerPhone }   // sólo si flag `sms` activo
```

`KitchenOrder` referencia una `Sale` existente (1:1) y agrega `status` + timestamps por transición. El flag `ai` es reservado a futuro (sugerencias de tiempos de preparación); no tiene endpoint propio todavía.

## 7. Plan MARCA — invite redeem

Ya existen en `Brand` los campos `inviteCodeHash` e `inviteCodeExpiresAt` (ver `schema.prisma`), pero el flujo de canje **no está implementado**. Contrato esperado:

```
POST /api/brands/:brandId/invite            -> { code: string, expiresAt: string }   // BUSINESS genera código (hash guardado en inviteCodeHash)
POST /api/auth/redeem-invite                <- { code, name, email, password }
                                             -> { token, user }
```

Efecto de `redeem-invite`:
1. Busca `Brand` cuyo `inviteCodeHash` haga match con `code` (bcrypt.compare) y `inviteCodeExpiresAt > now()`.
2. Crea `User` con `role = 'BRAND'`, `tenantId = brand.tenantId`, `brandId = brand.id`.
3. Si `brand.ownerUserId` es `null`, setea `brand.ownerUserId = user.id`.
4. Invalida el código (`inviteCodeHash = null`).

Módulos permitidos para `role = 'BRAND'` (ver matriz §3, columna MARCA): `dashboard`, `products`, `stock`, `sales`, `productRequests`, `preferences`, `inventory`, `layaways`, `orders`, `cortes`, `mensualidad`. Esto es un filtro por **plan** (`PlanType.MARCA`); el filtro adicional por **rol** (`role = 'BRAND'`) ya existe hoy en la sidebar vía `auth.isAdmin`.

## 8. Rutas stub creadas (FE)

Componentes placeholder en español, sin lógica de negocio, listos para reemplazar cuando se implemente el módulo real:

| Ruta | Vista | `meta.planRequired` | `meta.moduleId` | `meta.flagRequired` |
|---|---|---|---|---|
| `/stubs/clinic/reminders` | `views/stubs/clinic/ClinicReminders.vue` | `CLINICA` | `agenda` | `patientReminders` |
| `/stubs/clinic/history` | `views/stubs/clinic/ClinicHistory.vue` | `CLINICA` | `customers` | `medicalHistory` |
| `/stubs/restaurant/dishes` | `views/stubs/restaurant/RestaurantDishes.vue` | `RESTAURANTE` | `products` | `dishes` |
| `/stubs/restaurant/kitchen-orders` | `views/stubs/restaurant/RestaurantKitchenOrders.vue` | `RESTAURANTE` | `orders` | `ordersKitchen` |

Todas reutilizan `views/stubs/StubModulePage.vue` (tarjeta "Próximamente"). El guard en `router/index.ts` compara `to.meta.planRequired` contra `auth.user?.subscription?.planType`; si este último es `undefined` (usuario legacy o login reciente sin `/auth/me`), no bloquea nada. `meta.flagRequired` queda declarado para cuando se quiera bloquear también por flag, pero el guard actual sólo evalúa `planRequired` (agregar el chequeo de flag es trivial con `auth.hasFlag(...)`, ya expuesto en el store).

## 9. Sidebar

`apps/web/src/components/layout/AppSidebar.vue` anota cada item del grupo "Showroom" con `moduleId` (usando los mismos ids que `EntitlementModule`: `dashboard`, `brands`, `products`, `stock`, `productRequests`, `agenda`, `caja`, `sales`) y filtra con `auth.canAccess(item.moduleId)` (nuevo método en `stores/auth.ts`, wrapper de `canAccessModule`). Como `POST /auth/login` no manda `entitlements` todavía, el filtro es un no-op justo tras iniciar sesión — se vuelve real en cuanto `fetchMe()` puebla `user.entitlements`. No se agregaron items de Clínica/Restaurante/Marca al sidebar (viven en `/stubs/...` sin entrada de menú) para no confundir al showroom NEGOCIO actual.

## 10. Checklist de este agente

- [x] Extender `apps/api/src/lib/entitlements.ts` (ya creado por Agente B) con módulos stub, módulos MARCA/RESTAURANTE nuevos y `FeatureFlag`/`getFeatureFlags`/`hasFeatureFlag`/`isStubModule`
- [x] Agregar `featureFlags` a `GET /auth/me` (`apps/api/src/lib/meShape.ts`), aditivo
- [x] `apps/web/src/lib/entitlements.ts` (mirror FE, mismo shape que el backend real)
- [x] `User.entitlements` / `User.featureFlags` / `User.subscription` opcionales en `apps/web/src/services/api.ts`
- [x] `auth.canAccess(moduleId)` y `auth.hasFlag(flag)` en `apps/web/src/stores/auth.ts`
- [x] Vistas stub Clínica (`reminders`, `history`) y Restaurante (`dishes`, `kitchen-orders`)
- [x] Rutas `/stubs/clinic/...` y `/stubs/restaurant/...` con `meta.planRequired`/`meta.moduleId`/`meta.flagRequired`
- [x] Guard de `planRequired` en `router/index.ts` contra `subscription.planType` (fallback: no bloquea si no hay suscripción cargada)
- [x] Sidebar anotado con `moduleId` real y filtrado por `auth.canAccess` (no-op hasta que `/auth/login` incluya entitlements)
- [x] `apps/web` (`vue-tsc --build`) y `apps/api` (`tsc`) compilan sin errores tras los cambios
- [x] Este documento de contratos (`docs/plans-contracts.md`)
- [ ] **Pendiente (otro agente):** incluir `entitlements`/`subscription`/`featureFlags` también en `POST /api/auth/login` (hoy sólo `/auth/me` los manda)
- [ ] **Pendiente (otro agente):** implementar endpoints de §6 (recordatorios, historial médico, platillos, comandas)
- [ ] **Pendiente (otro agente):** implementar `POST /api/brands/:id/invite` + `POST /api/auth/redeem-invite` (§7)
- [ ] **Pendiente (otro agente):** UI real de Marca (inventory, cortes, mensualidad) — hoy sin stub porque no hay decisión de rutas todavía
- [ ] **Pendiente (otro agente):** evaluar si el guard de router debe bloquear también por `flagRequired`, no sólo por `planRequired`
