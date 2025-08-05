# A.A.I.T.I v2.0.0 - Windows PowerShell Installation Script
# Requires PowerShell 5.0+ and Docker Desktop

param(
    [switch]$Dev,
    [switch]$Minimal,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
A.A.I.T.I Windows Installation Script

Usage:
    .\install.ps1          # Standard installation
    .\install.ps1 -Dev     # Development mode
    .\install.ps1 -Minimal # Minimal demo installation

Requirements:
    - Windows 10/11 or Windows Server 2019+
    - Docker Desktop for Windows
    - PowerShell 5.0+
"@
    exit 0
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  A.A.I.T.I v2.0.0 - Windows PowerShell Installer" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "[ERROR] PowerShell 5.0 or higher is required" -ForegroundColor Red
    Write-Host "Current version: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "[INFO] Docker detected: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop for Windows:" -ForegroundColor Yellow
    Write-Host "https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Blue
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Docker service is running
try {
    docker info | Out-Null
    Write-Host "[INFO] Docker service is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker service is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Determine Docker Compose command
try {
    docker-compose --version | Out-Null
    $composeCmd = "docker-compose"
    Write-Host "[INFO] Using docker-compose" -ForegroundColor Green
} catch {
    $composeCmd = "docker compose"
    Write-Host "[INFO] Using docker compose plugin" -ForegroundColor Green
}

Write-Host ""
Write-Host "[INFO] Starting A.A.I.T.I installation..." -ForegroundColor Yellow

# Stop existing services
Write-Host "[INFO] Stopping existing services..." -ForegroundColor Yellow
& $composeCmd.Split() down

if ($Minimal) {
    Write-Host "[INFO] Starting minimal demo installation..." -ForegroundColor Yellow
    # For minimal installation, we could use a simpler compose file
    $composeFile = "docker-compose.yml"
} elseif ($Dev) {
    Write-Host "[INFO] Starting development installation..." -ForegroundColor Yellow
    $composeFile = "docker-compose.yml"
} else {
    Write-Host "[INFO] Starting production installation..." -ForegroundColor Yellow
    $composeFile = "docker-compose.yml"
}

# Build and start services
Write-Host "[INFO] Building and starting services..." -ForegroundColor Yellow
& $composeCmd.Split() -f $composeFile build --no-cache
& $composeCmd.Split() -f $composeFile up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start services" -ForegroundColor Red
    Write-Host "Check the logs with: $composeCmd logs" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  A.A.I.T.I Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard: http://localhost:5000" -ForegroundColor Cyan
Write-Host "API Health: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  Stop:     $composeCmd down" -ForegroundColor White
Write-Host "  Restart:  $composeCmd up -d" -ForegroundColor White
Write-Host "  Logs:     $composeCmd logs -f" -ForegroundColor White
Write-Host ""

$openBrowser = Read-Host "Open dashboard in browser? (Y/n)"
if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
    Start-Process "http://localhost:5000"
}