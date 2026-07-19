# Prompt: App de escritorio POS (Tauri) — Panel Showroom

Documento de contexto para implementar la app de punto de venta de escritorio en el monorepo **panel-bubbles**. Usar este archivo como prompt de implementación.

**Requisito relacionado en Notion:** [Agregar registro de ventas/tickets](https://app.notion.com/p/b12e7cacfe9f47a9befe82749852e7ff) (Área Ventas). El POS consumirá esa API de tickets cuando exista; este documento cubre la app de escritorio y su integración.

---

## Prompt para el agente / desarrollador

```
Implementa una app de escritorio POS para los showrooms del monorepo panel-bubbles.

## Objetivo

Crear `apps/pos`: aplicación de escritorio con Tauri + Vue 3 que permita a una estación de showroom autenticarse, consultar productos/precios/stock y, en fases posteriores, registrar ventas y hablar con periféricos (impresora, cajón, scanner, terminal).

## Arquitectura (obligatoria)

- La app POS se conecta a la API existente (`apps/api`) por HTTPS/HTTP. NO depende del panel web (`apps/web`) ni embebe el panel.
- `apps/web` sigue siendo el panel administrativo en navegador (marcas, catálogo, stock, reportes).
- `apps/pos` es la UI de caja/showroom en escritorio.
- Misma base de datos vía API; catálogo, precios y stock son los de Prisma (`Product`, `Stock`, etc.).
- Auth: mismo flujo que el web — `POST /api/auth/login` y `Authorization: Bearer <token>` (ver `apps/web/src/stores/auth.ts` y `apps/web/src/services/api.ts`).
- CORS: revisar `apps/api/src/index.ts` (`resolveAllowedOrigins`). Tauri puede no enviar Origin de navegador o usar un scheme propio; ajustar CORS/allowlist cuando haga falta para desarrollo y producción.

Diagrama:

  [apps/web Panel admin] --HTTPS--> [apps/api] --> [PostgreSQL]
  [apps/pos Tauri POS]   --HTTPS--> [apps/api]
  [apps/pos] --USB/serial local--> [impresora / cajón / terminal]

## Ubicación en el monorepo

- Nueva app: `apps/pos` (Tauri 2 + Vue 3 + TypeScript, alineado al stack de `apps/web`).
- Scripts sugeridos en el `package.json` raíz:
  - `dev:pos`
  - `build:pos`
- Configurar `VITE_API_URL` (o equivalente) apuntando a la API local (`http://localhost:3000/api`) o a Railway en prod.
- No inventar un segundo backend de negocio: todo dato de negocio pasa por `apps/api`.

## Acceso a productos y consulta de precio

Sí: el POS DEBE tener acceso al catálogo para que un cajero/cliente consulte precio sin abrir el panel web.

- Usar `GET /api/products` con filtros ya existentes (`name`, `sku`, `priceMin`, `priceMax`, `stockMin`, `stockMax`, `sinStock`) — ver `apps/api/src/routes/products.ts`.
- Mostrar al menos: nombre, SKU, marca, precio, stock disponible.
- UI táctil-friendly: búsqueda rápida por nombre o SKU (input siempre enfocable para lectores HID que actúan como teclado).
- Roles: respetar `brandFilter` / auth existente (`ADMIN` ve todo; `BRAND` solo su marca). Si más adelante se añade rol de caja, documentarlo en API; el MVP puede usar usuarios ADMIN (o un usuario operativo del showroom) ya existentes.

## Fases de implementación

### Fase 1 — MVP (hacer primero)

1. Scaffold Tauri + Vue en `apps/pos`.
2. Login contra `/api/auth/login` y persistencia local del token.
3. Pantalla de consulta: listar/buscar productos y mostrar precio + stock.
4. Arranque verificable en Windows conectado a API local.

Criterios de aceptación MVP:

- [ ] La app abre en Windows (dev build Tauri).
- [ ] Login exitoso contra la API del monorepo.
- [ ] Se puede buscar un producto por nombre o SKU y ver su precio.
- [ ] No requiere abrir `apps/web` para consultar el catálogo.

### Fase 2 — Ventas

- Consumir/crear endpoints de tickets/ventas del requerimiento Notion “Agregar registro de ventas/tickets”.
- Carrito, cobro (al menos efectivo), registro de venta y baja o movimiento de stock vía API.
- Historial básico de tickets en la estación (lectura desde API).

### Fase 3 — Estaciones y periféricos

- Modelo de “estación de caja” (config local + opcional en API).
- Scanner: captura HID (teclado) primero.
- Impresora de tickets ESC/POS y cajón vía comandos locales (capa Rust/Tauri).
- Terminal de tarjetas: integración con proveedor concreto (fuera del alcance hasta elegir adquirente).
- Health-check al abrir turno: impresora / cajón / API respondiendo.

## Fuera de alcance de la Fase 1

- No implementar hardware real todavía.
- No reemplazar el panel web.
- No duplicar lógica de negocio fuera de `apps/api`.

## Referencias del repo

- Stack: Vue 3 + Express + Prisma + PostgreSQL (ver README raíz).
- Productos: `apps/api/prisma/schema.prisma` (`Product`, `Stock`, `StockEntry`).
- Rutas: `apps/api/src/routes/products.ts`, `auth.ts`, `stock.ts`.
- Cliente HTTP de referencia: `apps/web/src/services/api.ts`.
```

---

## Notas de diseño (para humanos)

| Pregunta | Decisión |
|----------|----------|
| ¿POS se conecta al panel web? | No. Se conecta a la **API**. |
| ¿Puede consultar precios? | Sí, vía `GET /api/products` (y filtros). |
| ¿Dónde vive el código? | `apps/pos` en este monorepo. |
| ¿Cuándo hay tickets reales? | Cuando exista la API de ventas del req de Notion; Fase 2. |
