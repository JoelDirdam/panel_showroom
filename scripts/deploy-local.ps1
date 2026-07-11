param(
    [switch]$SkipSeed,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontro '$Name' en el PATH. Instálalo e inténtalo de nuevo."
    }
}

# Con $ErrorActionPreference=Stop, stderr de docker se convierte en excepcion.
# Ejecutamos via cmd para comprobar solo el exit code.
function Test-DockerReady {
    cmd /c "docker info >nul 2>&1"
    return ($LASTEXITCODE -eq 0)
}

function Wait-DockerReady([int]$TimeoutSec = 180) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    do {
        if (Test-DockerReady) { return }
        Write-Host "  Esperando al daemon de Docker..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    throw "Docker no respondio a tiempo. Abre Docker Desktop manualmente y vuelve a ejecutar el script."
}

function Wait-PostgresReady([int]$TimeoutSec = 60) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    do {
        cmd /c "docker compose -f `"$root\docker-compose.yml`" exec -T postgres pg_isready -U postgres >nul 2>&1"
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "PostgreSQL no quedo listo a tiempo."
}

# En Windows, prisma generate falla con EPERM si node (API/web) tiene
# cargado query_engine-windows.dll.node.
function Stop-LocalDevServers {
    foreach ($port in @(3000, 5173)) {
        $pids = @(
            Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -Unique
        )
        foreach ($procId in $pids) {
            if ($procId -and $procId -gt 0) {
                Write-Host "  Deteniendo proceso en puerto ${port} (PID $procId)..." -ForegroundColor DarkGray
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
    # Hijos npm/node que a veces quedan sin el puerto en Listen
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and (
                $_.CommandLine -like "*apps\api*" -or
                $_.CommandLine -like "*apps/api*" -or
                $_.CommandLine -like "*apps\web*" -or
                $_.CommandLine -like "*apps/web*" -or
                $_.CommandLine -like "*prisma*"
            )
        } |
        ForEach-Object {
            Write-Host "  Deteniendo node (PID $($_.ProcessId))..." -ForegroundColor DarkGray
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
    Start-Sleep -Milliseconds 800
}

function Clear-PrismaEngineFiles([string]$ApiDir) {
    $clientDir = Join-Path $ApiDir "node_modules\.prisma\client"
    if (-not (Test-Path $clientDir)) { return }
    Get-ChildItem $clientDir -Filter "query_engine-windows.dll.node*" -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

function Invoke-PrismaGenerate([string]$ApiDir, [int]$MaxAttempts = 3) {
    Stop-LocalDevServers
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        Clear-PrismaEngineFiles $ApiDir
        npx prisma generate
        if ($LASTEXITCODE -eq 0) { return }
        Write-Host "  prisma generate fallo (intento $attempt/$MaxAttempts). Liberando locks..." -ForegroundColor Yellow
        Stop-LocalDevServers
        Start-Sleep -Seconds 2
    }
    throw "prisma generate fallo (EPERM: cierra procesos que usen la API y reintenta)."
}

Assert-Command "docker"
Assert-Command "npm"
Assert-Command "node"

# 1. Docker Desktop
Write-Step "Comprobando Docker Desktop"
if (-not (Test-DockerReady)) {
    $dockerDesktop = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $dockerDesktop) {
        throw "Docker Desktop no esta instalado o no se encontro el ejecutable."
    }

    Write-Host "Docker no esta en marcha. Iniciando Docker Desktop..." -ForegroundColor Yellow
    Start-Process $dockerDesktop | Out-Null
    Wait-DockerReady
}
Write-Host "Docker listo." -ForegroundColor Green

# 2. Base de datos
Write-Step "Levantando PostgreSQL (docker compose up -d)"
Push-Location $root
docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up -d fallo." }
Pop-Location
Wait-PostgresReady
Write-Host "PostgreSQL listo en localhost:5433." -ForegroundColor Green

# 3. API
Write-Step "Preparando API"
$apiDir = Join-Path $root "apps\api"
$apiEnv = Join-Path $apiDir ".env"
$envExample = Join-Path $root ".env.example"

if (-not (Test-Path $apiEnv)) {
    if (-not (Test-Path $envExample)) {
        throw "No existe .env.example en la raiz del repo."
    }
    Copy-Item $envExample $apiEnv
    Write-Host "Creado apps/api/.env desde .env.example" -ForegroundColor Yellow
}

Push-Location $apiDir
if (-not (Test-Path "node_modules")) {
    Write-Host "npm install (api)..."
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install fallo en apps/api." }
}

Invoke-PrismaGenerate $apiDir

npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy fallo." }

if (-not $SkipSeed) {
    npm run db:seed
    if ($LASTEXITCODE -ne 0) { throw "db:seed fallo." }
}
Pop-Location
Write-Host "API preparada." -ForegroundColor Green

# 4. Web
Write-Step "Preparando Web"
$webDir = Join-Path $root "apps\web"
$webEnv = Join-Path $webDir ".env"

if (-not (Test-Path $webEnv)) {
    @"
VITE_API_URL=http://localhost:3000/api
"@ | Set-Content -Path $webEnv -Encoding UTF8
    Write-Host "Creado apps/web/.env" -ForegroundColor Yellow
}

Push-Location $webDir
if (-not (Test-Path "node_modules")) {
    Write-Host "npm install (web)..."
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install fallo en apps/web." }
}
Pop-Location
Write-Host "Web preparada." -ForegroundColor Green

# Arranque de servicios
if (-not $NoStart) {
    Write-Step "Iniciando servicios en ventanas nuevas"
    Start-Process powershell -WorkingDirectory $apiDir -ArgumentList @(
        "-NoExit",
        "-Command",
        "Write-Host 'API -> http://localhost:3000' -ForegroundColor Green; npm run dev"
    )
    Start-Process powershell -WorkingDirectory $webDir -ArgumentList @(
        "-NoExit",
        "-Command",
        "Write-Host 'Web -> http://localhost:5173' -ForegroundColor Green; npm run dev"
    )
}

Write-Host "`nListo." -ForegroundColor Green
Write-Host "  API:  http://localhost:3000"
Write-Host "  Web:  http://localhost:5173"
Write-Host "  Admin: admin@showroom.com / Showroom2026!"
Write-Host "  Marca: marca@bubbles.com / Showroom2026!"
if ($NoStart) {
    Write-Host "`nUsa -NoStart omitido la proxima vez, o arranca manualmente:" -ForegroundColor Yellow
    Write-Host "  npm run dev:api"
    Write-Host "  npm run dev:web"
}
