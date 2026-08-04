# Panel Bubbles — Showroom Admin

Panel administrativo para que las marcas gestionen sus productos y stock en el showroom.

## Stack

- **Frontend**: Vue 3 + TailAdmin + Pinia + Axios (`apps/web`)
- **Backend**: Node.js + Express + Prisma + PostgreSQL (`apps/api`)
- **Deploy**: Railway CLI
- **Repo**: https://github.com/JoelDirdam/panel_showroom.git

## Modelo de cuentas, planes y marcas

PuntoManeki separa tres ideas para que un mismo negocio pueda crecer sin crear roles raros ni tablas duplicadas:

1. **Quién inicia sesión (identidad)**  
   El usuario del panel del negocio tiene el rol `BUSINESS`. Eso significa “administra este negocio”, no “solo puede ser un tipo de producto”.  
   El rol `BRAND` es para otra persona: el dueño de una marca externa que consignas en tu local (portal de marca).  
   El rol `SUPER_ADMIN` es de la plataforma.

2. **Qué plan paga (facturación)**  
   Cada negocio (`Tenant`) tiene una suscripción con un plan principal: Negocio, Clínica, Restaurante o Marca.  
   Ahí se guarda si está en prueba, activo o vencido, y hasta cuándo dura la prueba o el periodo pagado.  
   En el futuro, módulos extra (por ejemplo Clínica encima de Negocio, o cobro por marca propia) se modelan como **complementos (add-ons)** del mismo negocio, no como un segundo usuario ni como tablas `BUSINESS` / `CLINIC` / `RESTAURANT` separadas.

3. **Qué ya configuró (capacidades)**  
   - Negocio registrado: el tenant ya completó el alta (`onboardingComplete`).  
   - Marca propia: existe una marca del negocio marcada como marca casa (`isHouseBrand`).  
   - Marcas de terceros: otras marcas del mismo negocio, sin ser la marca casa.  
   Los módulos visibles del menú salen del plan principal más los complementos activos.

### Ejemplos

- **Cafetería:** te registras como negocio, das de alta tu local y, si quieres, creas tu marca propia para los productos de la cafetería. También puedes registrar marcas de proveedores y sus productos. Sigues siendo el mismo usuario `BUSINESS`.  
- **Negocio + clínica (futuro):** pagas o activas el complemento de clínica sobre el mismo negocio; no creas otra cuenta “CLINIC”.  
- **Marca consignadora externa:** esa persona entra con rol `BRAND` y se vincula a una marca concreta; no es lo mismo que “el negocio tiene marca propia”.

### ¿Cómo sabemos si el negocio aún no creó su marca?

Hay marca propia solo si existe un registro `Brand` de ese negocio con `isHouseBrand = true`.  
Si no existe, la interfaz muestra “Marca no registrada” (aunque ya haya marcas de terceros).  
Ese estado se expone en la API (`setupStatus` en `/me`) para Preferencias, Marcas y el Home.

## Requisitos

- Node.js 20+
- Docker (PostgreSQL local)
- [Railway CLI](https://docs.railway.com/cli): `npm i -g @railway/cli`
- [GitHub CLI](https://cli.github.com/) (opcional): `winget install GitHub.cli`

## Desarrollo local

### 1. Base de datos

```powershell
docker compose up -d
```

### 2. API

```powershell
cd apps/api
copy ..\..\.env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

API en `http://localhost:3000`

> **Nota**: PostgreSQL usa el puerto `5433` localmente para evitar conflictos con otras instalaciones en `5432`.

### 3. Web

```powershell
cd apps/web
npm install
npm run dev
```

Web en `http://localhost:5173`

### Credenciales demo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@showroom.com` | `Showroom2026!` |
| Marca | `marca@bubbles.com` | `Showroom2026!` |

## Git y GitHub

```powershell
git status
git checkout -b feat/mi-cambio
git add .
git commit -m "feat: descripción del cambio"
git push -u origin HEAD
```

Con GitHub CLI:

```powershell
gh auth login
gh pr create --title "Mi cambio" --body "Descripción"
gh pr merge --squash
```

## Despliegue en Railway

### Setup inicial (una vez)

```powershell
railway login
railway init
railway add -d postgres
```

Crear dos servicios vacíos (`api` y `web`) en el proyecto Railway.

### Variables de entorno

**Servicio `api`:**
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `JWT_SECRET` = (generar un secreto seguro)
- `CORS_ORIGIN` = `https://${{web.RAILWAY_PUBLIC_DOMAIN}}`

**Servicio `web`:**
- `VITE_API_URL` = `https://${{api.RAILWAY_PUBLIC_DOMAIN}}/api`

### Deploy con CLI

```powershell
.\scripts\deploy.ps1
```

O manualmente:

```powershell
cd apps/api
railway up --path-as-root

cd ../web
railway up --path-as-root
```

### Auto-deploy desde GitHub (opcional)

En Railway Dashboard → cada servicio → Settings:
- Conectar repo `JoelDirdam/panel_showroom`
- Root directory: `apps/api` o `apps/web`

## Estructura

```
panel-bubbles/
├── apps/
│   ├── api/          # REST API + Prisma
│   └── web/          # Vue admin panel
├── docker-compose.yml
├── scripts/deploy.ps1
└── .env.example
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuario actual |
| CRUD | `/api/brands` | Marcas (solo BUSINESS) |
| CRUD | `/api/products` | Productos |
| GET/PATCH | `/api/stock` | Inventario |
| GET | `/api/dashboard` | KPIs |
| GET | `/health` | Health check |
