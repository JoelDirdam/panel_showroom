# Cobro de suscripciones con Stripe

## Cómo funciona
- El negocio elige plan y empieza su prueba gratis. En `/onboarding/payment` puede **agregar tarjeta** (Stripe Checkout) o seguir **sin tarjeta**.
- Con tarjeta registrada durante la prueba, Stripe hace el primer cobro al terminar la prueba (no se pierden días ni el código `COSDI30`).
- Stripe avisa por webhook (`POST /api/billing/webhook`) y la API actualiza `TenantSubscription`:
  - pago correcto → `ACTIVE` hasta el fin del periodo pagado;
  - pago fallido → no se extiende el periodo; al vencer, la cuenta se pausa (HTTP 402);
  - cancelación → `CANCELED`. Si cancela "al final del periodo", sigue activa hasta esa fecha.
- Con la cuenta pausada el negocio ve `/suscripcion-vencida` con el botón **Pagar y reactivar mi cuenta**. La reserva pública sigue funcionando.
- `/suscripcion` ("Mi suscripción" en el menú): estado, próximo cobro y acceso al portal de Stripe (cambiar tarjeta, recibos, cancelar).
- Precios: $149 / $349 / $549 MXN al mes **+ IVA 16 %** (tasa `STRIPE_TAX_RATE_ID`). Ejemplo: Citas $349 → $404.84.
- Sin `STRIPE_SECRET_KEY` el cobro queda apagado: los botones de pago no aparecen y la prueba gratis funciona igual.

## Entornos
| Entorno | Web | API | Stripe |
|---|---|---|---|
| production | https://app.cosdi.mx | https://api.cosdi.mx | Real (pendiente: activar la cuenta) |
| dev (Railway) | https://web-dev-46ae7335.up.railway.app | https://api-dev-cd691f6e.up.railway.app | Prueba |

`dev` tiene su propia base de datos, no envía correos (el código de verificación sale en los logs) ni WhatsApp.

## Configurar un entorno (una sola orden)
Desde `apps/api`, con la CLI de Railway enlazada al proyecto y la clave secreta de Stripe en la variable `STRIPE_KEY`:

```bash
node scripts/stripe-setup.mjs production https://api.cosdi.mx https://app.cosdi.mx
```

Crea lo que falte en Stripe (productos, precios, tasa de IVA, portal del cliente, webhook) y guarda en Railway
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TAX_RATE_ID`, `STRIPE_PORTAL_CONFIG_ID`, `APP_URL` y los tres
`STRIPE_PRICE_*`. No imprime secretos. Después hay que redesplegar la API:

```bash
railway redeploy --service api --environment production --yes
```

El modo lo define la clave: `sk_test_…` (prueba) o `sk_live_…` (real). Para `production` exige una clave real.

## Desplegar
Los servicios no están ligados a GitHub; se suben desde la carpeta de cada app:

```bash
railway up . --path-as-root --service api --environment production
```

```bash
railway up . --path-as-root --service web --environment production
```

## Probar en dev
Tarjeta de prueba de Stripe: `4242 4242 4242 4242`, cualquier fecha futura y CVC.
Probado el 14 nov 2026 contra dev: registro → plan → Checkout → pago → `ACTIVE` → cancelar → 402 → pagar de nuevo → `ACTIVE`.
