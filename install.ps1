# A.A.I.T.I Universal Installer for Windows (PowerShell)
# Auto AI Trading Interface - Advanced Windows Installation

param(
    [string]$Mode = "",
    [switch]$Help,
    [switch]$Check,
    [switch]$Demo,
    [switch]$Docker,
    [switch]$Npm,
    [switch]$Production,
    [switch]$Development
)

# Configuration
$ProjectName = "A.A.I.T.I"
$Version = "2.0.0"
$ComposeFile = "docker-compose.yml"

# Console colors
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    Magenta = "Magenta"
}

# Functions for colored output
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Step {
    param([string]$Message)
    Write-Host "🔧 $Message" -ForegroundColor Magenta
}

function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Blue
    Write-Host "                  🚀 A.A.I.T.I v$Version - PowerShell Installer" -ForegroundColor Blue
    Write-Host "                   Auto AI Trading Interface - Advanced Setup" -ForegroundColor Blue
    Write-Host "========================================================================" -ForegroundColor Blue
    Write-Host ""
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check Docker installation and status
function Test-Docker {
    Write-Step "Checking Docker installation..."
    
    try {
        $dockerVersion = docker --version 2>$null
        if (-not $dockerVersion) {
            Write-Error "Docker is not installed!"
            Write-Host ""
            Write-Host "Please install Docker Desktop for Windows:" -ForegroundColor Yellow
            Write-Host "https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Requirements:" -ForegroundColor Yellow
            Write-Host "- Windows 10 64-bit: Pro, Enterprise, or Education" -ForegroundColor White
            Write-Host "- Windows 11 64-bit: Home or Pro" -ForegroundColor White
            Write-Host "- WSL 2 feature enabled" -ForegroundColor White
            return $false
        }
        
        # Check if Docker is running
        $dockerInfo = docker info 2>$null
        if (-not $dockerInfo) {
            Write-Error "Docker Desktop is not running!"
            Write-Host ""
            Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
            return $false
        }
        
        Write-Success "Docker is installed and running"
        Write-Host "Version: $dockerVersion" -ForegroundColor Gray
        return $true
    }
    catch {
        Write-Error "Error checking Docker: $($_.Exception.Message)"
        return $false
    }
}

# Check Node.js installation
function Test-NodeJS {
    Write-Step "Checking Node.js installation..."
    
    try {
        $nodeVersion = node --version 2>$null
        if (-not $nodeVersion) {
            Write-Warning "Node.js is not installed"
            Write-Host ""
            Write-Host "Please install Node.js 18+ from:" -ForegroundColor Yellow
            Write-Host "https://nodejs.org/" -ForegroundColor Cyan
            return $false
        }
        
        # Parse version number
        $version = $nodeVersion -replace 'v', ''
        $majorVersion = [int]($version -split '\.')[0]
        
        if ($majorVersion -lt 18) {
            Write-Warning "Node.js version $nodeVersion is too old. Please install Node.js 18+"
            return $false
        }
        
        Write-Success "Node.js $nodeVersion is installed"
        
        # Check npm
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            Write-Success "npm $npmVersion is available"
        }
        
        return $true
    }
    catch {
        Write-Error "Error checking Node.js: $($_.Exception.Message)"
        return $false
    }
}

# System requirements check
function Invoke-SystemCheck {
    Write-Header
    Write-Step "Performing comprehensive system check..."
    Write-Host ""
    
    # Windows version
    $osInfo = Get-CimInstance Win32_OperatingSystem
    Write-Host "Windows Version: $($osInfo.Caption) $($osInfo.Version)" -ForegroundColor White
    
    # Architecture
    Write-Host "Architecture: $($osInfo.OSArchitecture)" -ForegroundColor White
    
    # Memory
    $totalRAM = [math]::Round($osInfo.TotalVisibleMemorySize / 1MB, 2)
    $freeRAM = [math]::Round($osInfo.FreePhysicalMemory / 1MB, 2)
    Write-Host "RAM: $totalRAM GB total, $freeRAM GB free" -ForegroundColor White
    
    if ($totalRAM -lt 4) {
        Write-Warning "Low memory detected. 4GB+ recommended for optimal performance."
    } else {
        Write-Success "Sufficient memory available"
    }
    
    # Disk space
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 -and $_.DeviceID -eq $env:SystemDrive }
    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
    Write-Host "Free Disk Space: $freeSpaceGB GB" -ForegroundColor White
    
    if ($freeSpaceGB -lt 5) {
        Write-Warning "Low disk space. 5GB+ recommended."
    } else {
        Write-Success "Sufficient disk space available"
    }
    
    Write-Host ""
    
    # Check Docker
    $dockerOK = Test-Docker
    Write-Host ""
    
    # Check Node.js
    $nodeOK = Test-NodeJS
    Write-Host ""
    
    # PowerShell version
    Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor White
    
    # Administrator check
    if (Test-Administrator) {
        Write-Info "Running as Administrator"
    } else {
        Write-Warning "Not running as Administrator (may be required for some operations)"
    }
    
    Write-Host ""
    Write-Host "System Check Summary:" -ForegroundColor Yellow
    Write-Host "Docker: $(if ($dockerOK) { '✅ Ready' } else { '❌ Not Ready' })" -ForegroundColor $(if ($dockerOK) { 'Green' } else { 'Red' })
    Write-Host "Node.js: $(if ($nodeOK) { '✅ Ready' } else { '❌ Not Ready' })" -ForegroundColor $(if ($nodeOK) { 'Green' } else { 'Red' })
    
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Docker installation
function Invoke-DockerInstall {
    Write-Header
    
    if (-not (Test-Docker)) {
        return
    }
    
    Write-Host ""
    Write-Host "Select Docker installation type:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1) 🎯 Production (Recommended)" -ForegroundColor White
    Write-Host "2) 🔧 Development (with hot reload)" -ForegroundColor White
    Write-Host "3) 📊 Production + Monitoring (Prometheus/Grafana)" -ForegroundColor White
    Write-Host "4) 🚀 Full Stack (All services)" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-4)"
    
    $profiles = ""
    $description = ""
    
    switch ($choice) {
        "1" { 
            $profiles = ""
            $description = "Production A.A.I.T.I"
        }
        "2" { 
            $profiles = "--profile development"
            $description = "Development A.A.I.T.I"
        }
        "3" { 
            $profiles = "--profile production --profile monitoring"
            $description = "Production + Monitoring"
        }
        "4" { 
            $profiles = "--profile production --profile monitoring --profile nginx --profile redis"
            $description = "Full Stack"
        }
        default {
            Write-Error "Invalid selection"
            return
        }
    }
    
    Write-Info "Installing: $description"
    Write-Info "This may take a few minutes..."
    Write-Host ""
    
    try {
        # Build Docker images
        Write-Step "Building Docker images..."
        & docker compose build aaiti
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed"
        }
        
        # Start services
        Write-Step "Starting services..."
        if ($profiles) {
            $args = $profiles -split ' '
            & docker compose $args up -d
        } else {
            & docker compose up -d aaiti
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker start failed"
        }
        
        # Wait for services
        Write-Step "Waiting for services to be ready..."
        Start-Sleep -Seconds 10
        
        Write-Host ""
        Write-Success "🎉 A.A.I.T.I Docker installation complete!"
        Write-Host ""
        Write-Host "Access URLs:" -ForegroundColor Green
        Write-Host "📊 A.A.I.T.I Dashboard: http://localhost:5000" -ForegroundColor Cyan
        
        if ($profiles -like "*monitoring*") {
            Write-Host "📈 Prometheus: http://localhost:9090" -ForegroundColor Cyan
            Write-Host "📋 Grafana: http://localhost:3001 (admin/admin)" -ForegroundColor Cyan
        }
        
        if ($profiles -like "*nginx*") {
            Write-Host "🌐 Nginx Proxy: http://localhost" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host "Management Commands:" -ForegroundColor Blue
        Write-Host "📋 View logs: docker compose logs -f" -ForegroundColor White
        Write-Host "📊 Check status: docker compose ps" -ForegroundColor White
        Write-Host "⏹️  Stop: docker compose down" -ForegroundColor White
        Write-Host "🔄 Restart: docker compose restart" -ForegroundColor White
        
    }
    catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
    }
    
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# NPM installation
function Invoke-NpmInstall {
    Write-Header
    
    if (-not (Test-NodeJS)) {
        Write-Host ""
        Write-Host "Press any key to continue..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        return
    }
    
    Write-Host ""
    Write-Host "Select NPM installation type:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1) 🚀 Production (recommended for live trading)" -ForegroundColor White
    Write-Host "2) 🔧 Development (for testing and development)" -ForegroundColor White
    Write-Host "3) ⚡ Fast Install (skip some optimizations)" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-3)"
    
    $installCmd = ""
    $buildCmd = ""
    $startCmd = ""
    $mode = ""
    
    switch ($choice) {
        "1" {
            $installCmd = "npm run install:production"
            $buildCmd = "npm run build:production"
            $startCmd = "npm start"
            $mode = "Production"
        }
        "2" {
            $installCmd = "npm run setup:dev"
            $buildCmd = ""
            $startCmd = "npm run dev"
            $mode = "Development"
        }
        "3" {
            $installCmd = "npm run install:fast"
            $buildCmd = "npm run build"
            $startCmd = "npm start"
            $mode = "Fast"
        }
        default {
            Write-Error "Invalid selection"
            return
        }
    }
    
    Write-Info "Installing: $mode installation"
    Write-Host ""
    
    try {
        # Check for previous installation
        if ((Test-Path "node_modules") -or (Test-Path "backend/node_modules") -or (Test-Path "frontend/node_modules")) {
            Write-Host ""
            $clean = Read-Host "Previous installation detected. Clean it? (y/N)"
            if ($clean -eq "y" -or $clean -eq "Y") {
                Write-Step "Cleaning previous installation..."
                & npm run clean
            }
        }
        
        # Install dependencies
        Write-Step "Installing dependencies..."
        Invoke-Expression $installCmd
        
        if ($LASTEXITCODE -ne 0) {
            throw "Dependency installation failed"
        }
        
        # Build if needed
        if ($buildCmd) {
            Write-Step "Building application..."
            Invoke-Expression $buildCmd
            
            if ($LASTEXITCODE -ne 0) {
                throw "Build failed"
            }
        }
        
        Write-Host ""
        Write-Success "🎉 A.A.I.T.I NPM installation complete!"
        Write-Host ""
        Write-Host "To start A.A.I.T.I, run: $startCmd" -ForegroundColor Green
        Write-Host "Access URL: http://localhost:5000" -ForegroundColor Cyan
        
    }
    catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
    }
    
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Demo mode
function Invoke-Demo {
    Write-Header
    Write-Info "Starting A.A.I.T.I Demo Mode..."
    Write-Host ""
    Write-Host "This will start a demonstration of A.A.I.T.I without full installation." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # Check if backend is running
        $healthCheck = & npm run health 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Backend not running. Starting demo with Docker..."
            if (Test-Docker) {
                & docker compose up -d aaiti
                Start-Sleep -Seconds 10
            } else {
                Write-Error "Docker not available for demo mode"
                return
            }
        }
        
        Write-Success "Demo ready! Access A.A.I.T.I at: http://localhost:5000"
        Write-Host ""
        Write-Host "Opening browser..." -ForegroundColor Gray
        Start-Process "http://localhost:5000"
        
    }
    catch {
        Write-Error "Demo failed: $($_.Exception.Message)"
    }
    
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Show help
function Show-Help {
    Write-Header
    Write-Host "A.A.I.T.I v$Version - PowerShell Installer Help" -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Green
    Write-Host "  .\install.ps1 [options]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Green
    Write-Host "  -Help           Show this help message" -ForegroundColor White
    Write-Host "  -Check          Perform system requirements check" -ForegroundColor White
    Write-Host "  -Demo           Start demo mode" -ForegroundColor White
    Write-Host "  -Docker         Docker installation" -ForegroundColor White
    Write-Host "  -Npm            NPM installation" -ForegroundColor White
    Write-Host "  -Production     Production installation" -ForegroundColor White
    Write-Host "  -Development    Development installation" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\install.ps1              # Interactive menu" -ForegroundColor White
    Write-Host "  .\install.ps1 -Check       # System check only" -ForegroundColor White
    Write-Host "  .\install.ps1 -Docker      # Docker installation" -ForegroundColor White
    Write-Host "  .\install.ps1 -Demo        # Demo mode" -ForegroundColor White
    Write-Host ""
    Write-Host "System Requirements:" -ForegroundColor Green
    Write-Host "- Windows 10/11 (64-bit)" -ForegroundColor White
    Write-Host "- 4GB RAM (8GB recommended)" -ForegroundColor White
    Write-Host "- 5GB free disk space" -ForegroundColor White
    Write-Host "- Docker Desktop OR Node.js 18+" -ForegroundColor White
    Write-Host ""
    Write-Host "For more information, visit:" -ForegroundColor Green
    Write-Host "https://github.com/gelimorto2/A.A.I.T.I" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Main menu
function Show-MainMenu {
    do {
        Write-Header
        Write-Host "Select installation method:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1) 🐳 Docker Installation (Recommended)" -ForegroundColor White
        Write-Host "2) 📦 NPM Installation (Advanced users)" -ForegroundColor White
        Write-Host "3) 🎮 Demo Mode (Try before installing)" -ForegroundColor White
        Write-Host "4) 🔍 System Check" -ForegroundColor White
        Write-Host "5) 📖 Help" -ForegroundColor White
        Write-Host "6) ❌ Exit" -ForegroundColor White
        Write-Host ""
        
        $choice = Read-Host "Enter your choice (1-6)"
        
        switch ($choice) {
            "1" { Invoke-DockerInstall }
            "2" { Invoke-NpmInstall }
            "3" { Invoke-Demo }
            "4" { Invoke-SystemCheck }
            "5" { Show-Help }
            "6" { 
                Write-Host ""
                Write-Host "Thank you for using A.A.I.T.I!" -ForegroundColor Green
                Write-Host ""
                Write-Host "For support and documentation:" -ForegroundColor Yellow
                Write-Host "https://github.com/gelimorto2/A.A.I.T.I" -ForegroundColor Cyan
                Write-Host ""
                exit 0
            }
            default {
                Write-Warning "Invalid choice. Please select 1-6."
                Start-Sleep -Seconds 2
            }
        }
    } while ($true)
}

# Main execution
try {
    # Handle command line parameters
    if ($Help) {
        Show-Help
        exit 0
    }
    
    if ($Check) {
        Invoke-SystemCheck
        exit 0
    }
    
    if ($Demo) {
        Invoke-Demo
        exit 0
    }
    
    if ($Docker) {
        Invoke-DockerInstall
        exit 0
    }
    
    if ($Npm) {
        Invoke-NpmInstall
        exit 0
    }
    
    # If no parameters provided, show interactive menu
    Show-MainMenu
}
catch {
    Write-Error "An unexpected error occurred: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}