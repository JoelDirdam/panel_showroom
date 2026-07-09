param(
    [string]$ApiService = "api",
    [string]$WebService = "web"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Desplegando API..." -ForegroundColor Cyan
Push-Location "$root\apps\api"
railway up --path-as-root --service $ApiService
Pop-Location

Write-Host "Desplegando Web..." -ForegroundColor Cyan
Push-Location "$root\apps\web"
railway up --path-as-root --service $WebService
Pop-Location

Write-Host "Deploy completado." -ForegroundColor Green
