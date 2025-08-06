# A.A.I.T.I Windows PowerShell Installation Script
# Enhanced Windows support with proper error handling

param(
    [switch]$Production,
    [switch]$Development,
    [switch]$Demo,
    [switch]$Help
)

# Color functions
function Write-Success { param($message) Write-Host "✅ $message" -ForegroundColor Green }
function Write-Error { param($message) Write-Host "❌ $message" -ForegroundColor Red }
function Write-Warning { param($message) Write-Host "⚠️ $message" -ForegroundColor Yellow }
function Write-Info { param($message) Write-Host "ℹ️ $message" -ForegroundColor Cyan }

# Header
Write-Host ""
Write-Host "===============================================" -ForegroundColor Blue
Write-Host " A.A.I.T.I v2.0.0 - Windows PowerShell Installer" -ForegroundColor Blue
Write-Host "===============================================" -ForegroundColor Blue
Write-Host ""

if ($Help) {
    Write-Host "Usage: .\install.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Production   Install for production use"
    Write-Host "  -Development  Install for development"
    Write-Host "  -Demo         Run demo mode"
    Write-Host "  -Help         Show this help"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\install.ps1              # Interactive installation"
    Write-Host "  .\install.ps1 -Production  # Production installation"
    Write-Host "  .\install.ps1 -Demo        # Demo mode"
    exit
}

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Error "PowerShell 5.0 or later is required"
    Write-Info "Please update PowerShell: https://github.com/PowerShell/PowerShell"
    exit 1
}

Write-Success "PowerShell $($PSVersionTable.PSVersion) detected"

# Check Windows version
$osInfo = Get-WmiObject -Class Win32_OperatingSystem
$osVersion = [System.Environment]::OSVersion.Version

Write-Info "Windows $($osInfo.Caption) detected"

if ($osVersion.Major -lt 10) {
    Write-Warning "Windows 10 or later is recommended for best Docker support"
}

# Check Docker
Write-Info "Checking Docker installation..."

try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker found: $dockerVersion"
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Error "Docker is not installed or not in PATH"
    Write-Host ""
    Write-Host "Please install Docker Desktop for Windows:"
    Write-Host "https://www.docker.com/products/docker-desktop"
    Write-Host ""
    Write-Host "Requirements:"
    Write-Host "- Windows 10/11 Pro, Enterprise, or Education"
    Write-Host "- WSL2 backend enabled (recommended)"
    Write-Host "- Virtualization enabled in BIOS"
    pause
    exit 1
}

# Check if Docker is running
Write-Info "Checking if Docker is running..."

try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker is running"
    } else {
        throw "Docker not running"
    }
} catch {
    Write-Error "Docker is not running"
    Write-Info "Please start Docker Desktop and try again"
    pause
    exit 1
}

# Check Docker Compose
Write-Info "Checking Docker Compose..."

try {
    $composeVersion = docker compose version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker Compose found: $composeVersion"
        $script:ComposeCommand = "docker compose"
    } else {
        # Try legacy docker-compose
        $composeVersion = docker-compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker Compose (legacy) found: $composeVersion"
            $script:ComposeCommand = "docker-compose"
        } else {
            throw "Docker Compose not found"
        }
    }
} catch {
    Write-Error "Docker Compose is not available"
    Write-Info "Please update Docker Desktop to the latest version"
    exit 1
}

# Installation mode selection
if (-not ($Production -or $Development -or $Demo)) {
    Write-Host ""
    Write-Host "Select installation mode:" -ForegroundColor Yellow
    Write-Host "1) 🚀 Production (Recommended)"
    Write-Host "2) 🔧 Development (Hot reload)"
    Write-Host "3) 🎮 Demo (Quick test)"
    Write-Host "4) 🚪 Exit"
    Write-Host ""
    
    do {
        $choice = Read-Host "Enter your choice (1-4)"
    } while ($choice -notmatch '^[1-4]$')
    
    switch ($choice) {
        1 { $Production = $true }
        2 { $Development = $true }
        3 { $Demo = $true }
        4 { exit }
    }
}

# Set installation parameters
if ($Production) {
    $Mode = "Production"
    $ComposeProfiles = ""
} elseif ($Development) {
    $Mode = "Development"
    $ComposeProfiles = "--profile development"
} elseif ($Demo) {
    $Mode = "Demo"
    $ComposeProfiles = ""
}

Write-Info "Installing A.A.I.T.I in $Mode mode..."

# Build Docker images
Write-Info "Building Docker images (this may take several minutes)..."

try {
    & $script:ComposeCommand build 2>&1 | Tee-Object -Variable buildOutput
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Success "Docker images built successfully"
} catch {
    Write-Error "Failed to build Docker images"
    Write-Host $buildOutput
    pause
    exit 1
}

# Start services
Write-Info "Starting services..."

try {
    if ($ComposeProfiles) {
        $cmd = "$($script:ComposeCommand) $ComposeProfiles up -d"
    } else {
        $cmd = "$($script:ComposeCommand) up -d"
    }
    
    Invoke-Expression $cmd 2>&1 | Tee-Object -Variable startOutput
    if ($LASTEXITCODE -ne 0) {
        throw "Start failed"
    }
    Write-Success "Services started successfully"
} catch {
    Write-Error "Failed to start services"
    Write-Host $startOutput
    pause
    exit 1
}

# Wait for services to be ready
Write-Info "Waiting for services to be ready..."
Start-Sleep -Seconds 10

# Check service health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 30 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Success "A.A.I.T.I backend is healthy"
    }
} catch {
    Write-Warning "Health check failed, but services may still be starting up"
}

# Installation complete
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host " 🎉 Installation Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

Write-Host "A.A.I.T.I is now running at:" -ForegroundColor Yellow
Write-Host "📊 Dashboard: http://localhost:5000" -ForegroundColor Green

if ($Development) {
    Write-Host "🔧 Frontend Dev: http://localhost:3000" -ForegroundColor Green
}

Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "📋 View logs: $($script:ComposeCommand) logs -f"
Write-Host "📊 Check status: $($script:ComposeCommand) ps"
Write-Host "⏹️ Stop: $($script:ComposeCommand) down"
Write-Host "🔄 Restart: $($script:ComposeCommand) restart"
Write-Host ""

# Offer to open browser
$openBrowser = Read-Host "Would you like to open the dashboard in your browser? (y/N)"
if ($openBrowser -match '^[Yy]') {
    Write-Info "Opening dashboard..."
    Start-Process "http://localhost:5000"
}

Write-Success "A.A.I.T.I installation completed successfully!"
Write-Host ""
pause