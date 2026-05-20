# ProjectHub PowerShell startup - single window, Ctrl+C to stop
# Only kills processes on our specific ports, not other node processes
param(
    [int]$FrontendPort = 13000,
    [int]$BackendPort = 13001
)

# $PSScriptRoot is scripts folder, need to go up one level to project root
$BASE_DIR = Split-Path -Parent $PSScriptRoot
if (-not $BASE_DIR) { $BASE_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location $BASE_DIR

$env:PORT = $BackendPort

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ProjectHub - Local Development Hub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "$BASE_DIR\node_modules")) {
    Write-Host "[Info] Dependencies not found, running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[Error] npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
}

# Check if required packages exist
$requiredPackages = @("tsx", "vite")
foreach ($pkg in $requiredPackages) {
    if (-not (Test-Path "$BASE_DIR\node_modules\$pkg")) {
        Write-Host "[Info] Package '$pkg' not found, running npm install..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Error] npm install failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "[OK] Dependencies installed" -ForegroundColor Green
        break
    }
}

Write-Host "[Check] Dependencies ready" -ForegroundColor Green

# Kill only processes listening on our specific ports
$backendProc = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1
$frontendProc = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1

if ($backendProc) {
    Write-Host "[Cleanup] Stopping backend on port $BackendPort (PID $($backendProc.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $backendProc.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}
if ($frontendProc) {
    Write-Host "[Cleanup] Stopping frontend on port $FrontendPort (PID $($frontendProc.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $frontendProc.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

Write-Host "[Backend] Starting on port $BackendPort..." -ForegroundColor Yellow
$backendJob = Start-Job -Name "Backend" -ArgumentList $BackendPort, $BASE_DIR -ScriptBlock {
    param($port, $dir)
    Set-Location $dir
    $env:PORT = $port
    npm run dev:server
}

Start-Sleep -Seconds 3

$bState = (Get-Job -Name "Backend").State
if ($bState -eq "Failed") {
    Write-Host "[Error] Backend failed to start" -ForegroundColor Red
    exit 1
}

Write-Host "[Frontend] Starting on port $FrontendPort..." -ForegroundColor Yellow
$frontendJob = Start-Job -Name "Frontend" -ArgumentList $FrontendPort, $BASE_DIR -ScriptBlock {
    param($port, $dir)
    Set-Location $dir
    npm run dev -- --port=$port
}

Write-Host ""
Write-Host "ProjectHub is running:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  Backend:  http://localhost:$BackendPort" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Cyan
Write-Host ""

function Strip-Ansi($text) {
    if ($text -is [array]) {
        $text | ForEach-Object { $_ -replace "\x1b\[[0-9;]*[a-zA-Z]", "" }
    } else {
        $text -replace "\x1b\[[0-9;]*[a-zA-Z]", ""
    }
}

try {
    while ($true) {
        $bState = (Get-Job -Name "Backend").State
        $fState = (Get-Job -Name "Frontend").State

        if ($bState -eq "Failed") { Write-Host ""; Write-Host "[Error] Backend process failed" -ForegroundColor Red; break }
        if ($fState -eq "Failed") { Write-Host ""; Write-Host "[Error] Frontend process failed" -ForegroundColor Red; break }
        if ($bState -ne "Running" -and $fState -ne "Running") { break }

        $bOutput = Receive-Job -Job $backendJob
        if ($bOutput) {
            $clean = Strip-Ansi ($bOutput | Select-Object -Last 30)
            $clean | Where-Object { $_ } | ForEach-Object { Write-Host $_ }
        }

        $fOutput = Receive-Job -Job $frontendJob
        if ($fOutput) {
            $clean = Strip-Ansi ($fOutput | Select-Object -Last 30)
            $clean | Where-Object { $_ } | ForEach-Object { Write-Host $_ }
        }

        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host ""
    Write-Host "Shutting down..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    Get-NetTCPConnection -LocalPort $BackendPort, $FrontendPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Write-Host "ProjectHub stopped" -ForegroundColor Green
}