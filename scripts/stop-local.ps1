# Detiene los servidores locales de API (3000) y Web (5173).
# No toca Docker Desktop ni los contenedores de docker compose.

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Stop-LocalDevServers {
    $stopped = $false

    foreach ($port in @(3000, 5173)) {
        $pids = @(
            Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -Unique
        )
        foreach ($procId in $pids) {
            if ($procId -and $procId -gt 0) {
                Write-Host "  Deteniendo proceso en puerto ${port} (PID $procId)..." -ForegroundColor DarkGray
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                $stopped = $true
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
            $stopped = $true
        }

    # Ventanas PowerShell abiertas por deploy-local.ps1 (npm run dev)
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and (
                $_.CommandLine -like "*apps\api*" -or
                $_.CommandLine -like "*apps/api*" -or
                $_.CommandLine -like "*apps\web*" -or
                $_.CommandLine -like "*apps/web*"
            ) -and (
                $_.CommandLine -like "*npm run dev*" -or
                $_.CommandLine -like "*localhost:3000*" -or
                $_.CommandLine -like "*localhost:5173*"
            )
        } |
        ForEach-Object {
            Write-Host "  Cerrando ventana PowerShell (PID $($_.ProcessId))..." -ForegroundColor DarkGray
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
            $stopped = $true
        }

    Start-Sleep -Milliseconds 800
    return $stopped
}

Write-Step "Deteniendo servidores locales (API + Web)"
$hadProcesses = Stop-LocalDevServers

if ($hadProcesses) {
    Write-Host "`nServidores detenidos." -ForegroundColor Green
} else {
    Write-Host "`nNo habia servidores de API/Web en marcha." -ForegroundColor Yellow
}

Write-Host "Docker Desktop y PostgreSQL se dejaron intactos." -ForegroundColor DarkGray
Write-Host "  API:  puerto 3000"
Write-Host "  Web:  puerto 5173"
