param(
    [ValidateSet("smoke", "frontend-all", "backend-all", "list")]
    [string]$Mode = "smoke"
)

$ErrorActionPreference = "Stop"

$feProject = "75b47e1d-971e-436a-abc5-5295b9262c38"
$beProject = "1498a4f6-1f44-4f0f-8a99-bd5dc64fc1e6"
$apiUrl = "https://api-panelshowroom-3c0c.up.railway.app"

function Show-Tests {
    Write-Host "`n=== Frontend ($feProject) ===" -ForegroundColor Cyan
    testsprite test list --project $feProject
    Write-Host "`n=== Backend ($beProject) ===" -ForegroundColor Cyan
    testsprite test list --project $beProject
}

switch ($Mode) {
    "list" { Show-Tests; exit 0 }
    "smoke" {
        Write-Host "Smoke FE: login dashboard..." -ForegroundColor Yellow
        testsprite test run cd5eb38d-5123-443c-a386-21ac3c9e4d64 --wait --timeout 600
        Write-Host "Smoke BE: health..." -ForegroundColor Yellow
        testsprite test run ff91afe1-a81e-4df2-a725-7a2c74f271cf --target-url $apiUrl --wait --timeout 120
    }
    "frontend-all" {
        $tests = testsprite test list --project $feProject --output json | ConvertFrom-Json
        foreach ($t in $tests.items) {
            Write-Host "Running $($t.name)..." -ForegroundColor Yellow
            testsprite test run $t.id --wait --timeout 600
        }
    }
    "backend-all" {
        testsprite test run --all --project $beProject --target-url $apiUrl --wait --timeout 600
    }
}

Write-Host "`nDashboard FE: https://www.testsprite.com/dashboard/tests/$feProject" -ForegroundColor Green
Write-Host "Dashboard BE: https://www.testsprite.com/dashboard/tests/$beProject" -ForegroundColor Green
