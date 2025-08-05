@echo off
setlocal enabledelayedexpansion

REM A.A.I.T.I Universal Installer for Windows
REM Auto AI Trading Interface - Windows Batch Script

title A.A.I.T.I v2.0.0 - Windows Installer

echo.
echo ========================================================================
echo                  🚀 A.A.I.T.I v2.0.0 - Windows Installer
echo                   Auto AI Trading Interface - Setup
echo ========================================================================
echo.

REM Configuration
set PROJECT_NAME=A.A.I.T.I
set VERSION=2.0.0
set COMPOSE_FILE=docker-compose.yml

REM Color codes for Windows (limited support)
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set BLUE=[94m
set NC=[0m

REM Function to print colored messages
:print_success
echo %GREEN%✅ %~1%NC%
goto :eof

:print_error
echo %RED%❌ %~1%NC%
goto :eof

:print_info
echo %BLUE%ℹ️  %~1%NC%
goto :eof

:print_warning
echo %YELLOW%⚠️  %~1%NC%
goto :eof

:print_step
echo %BLUE%🔧 %~1%NC%
goto :eof

REM Main menu
:main_menu
echo.
echo Select installation method:
echo.
echo 1) 🐳 Docker Installation (Recommended)
echo 2) 📦 NPM Installation (Advanced users)
echo 3) 🎮 Demo Mode (Try before installing)
echo 4) 🔍 System Check
echo 5) 📖 Help
echo 6) ❌ Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto docker_install
if "%choice%"=="2" goto npm_install
if "%choice%"=="3" goto demo_mode
if "%choice%"=="4" goto system_check
if "%choice%"=="5" goto help
if "%choice%"=="6" goto exit
goto main_menu

REM Docker installation
:docker_install
call :print_step "Starting Docker installation..."

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not installed!"
    echo.
    echo Please install Docker Desktop for Windows:
    echo https://docs.docker.com/desktop/install/windows-install/
    echo.
    echo Requirements:
    echo - Windows 10 64-bit: Pro, Enterprise, or Education
    echo - Windows 11 64-bit: Home or Pro
    echo - WSL 2 feature enabled
    echo.
    pause
    goto main_menu
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker Desktop is not running!"
    echo.
    echo Please start Docker Desktop and try again.
    pause
    goto main_menu
)

call :print_success "Docker is installed and running"

echo.
echo Select Docker installation type:
echo.
echo 1) 🎯 Production (Recommended)
echo 2) 🔧 Development (with hot reload)
echo 3) 📊 Production + Monitoring
echo 4) 🚀 Full Stack (All services)
echo.
set /p docker_choice="Enter your choice (1-4): "

set PROFILES=
if "%docker_choice%"=="1" set DESCRIPTION=Production A.A.I.T.I
if "%docker_choice%"=="2" (
    set PROFILES=--profile development
    set DESCRIPTION=Development A.A.I.T.I
)
if "%docker_choice%"=="3" (
    set PROFILES=--profile production --profile monitoring
    set DESCRIPTION=Production + Monitoring
)
if "%docker_choice%"=="4" (
    set PROFILES=--profile production --profile monitoring --profile nginx --profile redis
    set DESCRIPTION=Full Stack
)

call :print_info "Installing: %DESCRIPTION%"
call :print_info "This may take a few minutes..."

REM Build and start services
call :print_step "Building Docker images..."
docker compose build aaiti

call :print_step "Starting services..."
if defined PROFILES (
    docker compose %PROFILES% up -d
) else (
    docker compose up -d aaiti
)

REM Wait for services
call :print_step "Waiting for services to be ready..."
timeout /t 10 /nobreak >nul

echo.
call :print_success "🎉 A.A.I.T.I Docker installation complete!"
echo.
echo Access URLs:
echo 📊 A.A.I.T.I Dashboard: http://localhost:5000
echo.
echo Management Commands:
echo 📋 View logs: docker compose logs -f
echo 📊 Check status: docker compose ps
echo ⏹️  Stop: docker compose down
echo 🔄 Restart: docker compose restart
echo.
pause
goto main_menu

REM NPM installation
:npm_install
call :print_step "Starting NPM installation..."

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Node.js is not installed!"
    echo.
    echo Please install Node.js 18+ from: https://nodejs.org/
    pause
    goto main_menu
)

REM Check Node.js version
for /f "tokens=1 delims=v" %%a in ('node --version') do set NODE_VERSION=%%a
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a
if %NODE_MAJOR% lss 18 (
    call :print_warning "Node.js version %NODE_VERSION% is too old. Please install Node.js 18+"
    pause
    goto main_menu
)

call :print_success "Node.js %NODE_VERSION% is installed"

echo.
echo Select NPM installation type:
echo.
echo 1) 🚀 Production (recommended)
echo 2) 🔧 Development
echo 3) ⚡ Fast Install
echo.
set /p npm_choice="Enter your choice (1-3): "

if "%npm_choice%"=="1" (
    set INSTALL_CMD=npm run install:production
    set BUILD_CMD=npm run build:production
    set START_CMD=npm start
    set MODE=Production
)
if "%npm_choice%"=="2" (
    set INSTALL_CMD=npm run setup:dev
    set BUILD_CMD=
    set START_CMD=npm run dev
    set MODE=Development
)
if "%npm_choice%"=="3" (
    set INSTALL_CMD=npm run install:fast
    set BUILD_CMD=npm run build
    set START_CMD=npm start
    set MODE=Fast
)

call :print_info "Installing: %MODE% installation"

REM Install dependencies
call :print_step "Installing dependencies..."
%INSTALL_CMD%

REM Build if needed
if defined BUILD_CMD (
    call :print_step "Building application..."
    %BUILD_CMD%
)

echo.
call :print_success "🎉 A.A.I.T.I NPM installation complete!"
echo.
echo To start A.A.I.T.I, run: %START_CMD%
echo Access URL: http://localhost:5000
echo.
pause
goto main_menu

REM Demo mode
:demo_mode
call :print_info "Starting A.A.I.T.I Demo Mode..."
echo.
echo This will start a demonstration of A.A.I.T.I without full installation.
echo.
pause

npm run health 2>nul
if errorlevel 1 (
    call :print_warning "Backend not running. Starting demo with Docker..."
    docker compose up -d aaiti
    timeout /t 10 /nobreak >nul
)

call :print_success "Demo ready! Access A.A.I.T.I at: http://localhost:5000"
echo.
echo Press any key to return to menu...
pause >nul
goto main_menu

REM System check
:system_check
call :print_step "Checking system requirements..."
echo.

REM Check Windows version
for /f "tokens=4-7 delims=[.] " %%i in ('ver') do (
    if %%i==Version set VERSION=%%j.%%k
)
echo Windows Version: %VERSION%

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker: Not installed
) else (
    for /f "tokens=3" %%a in ('docker --version') do echo ✅ Docker: %%a
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js: Not installed
) else (
    for /f %%a in ('node --version') do echo ✅ Node.js: %%a
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm: Not installed
) else (
    for /f %%a in ('npm --version') do echo ✅ npm: %%a
)

REM Check available disk space
for /f "tokens=3" %%a in ('dir /-c ^| find "bytes free"') do set FREE_SPACE=%%a
echo ✅ Free Disk Space: %FREE_SPACE% bytes

REM Check memory (approximate)
wmic computersystem get TotalPhysicalMemory /value | find "=" >temp.txt
for /f "tokens=2 delims==" %%a in (temp.txt) do set TOTAL_RAM=%%a
del temp.txt
set /a RAM_GB=%TOTAL_RAM%/1073741824
echo ✅ Total RAM: %RAM_GB% GB

echo.
echo System check complete!
pause
goto main_menu

REM Help
:help
echo.
echo A.A.I.T.I v2.0.0 - Windows Installer Help
echo ========================================
echo.
echo Installation Options:
echo.
echo 1. Docker Installation (Recommended)
echo    - Requires Docker Desktop for Windows
echo    - Easiest setup with containerized environment
echo    - Production-ready configuration
echo.
echo 2. NPM Installation (Advanced)
echo    - Requires Node.js 18+ and npm
echo    - Direct installation on Windows
echo    - More control over configuration
echo.
echo 3. Demo Mode
echo    - Quick evaluation without full setup
echo    - Uses Docker for demonstration
echo.
echo System Requirements:
echo - Windows 10/11 (64-bit)
echo - 4GB RAM (8GB recommended)
echo - 5GB free disk space
echo - Docker Desktop OR Node.js 18+
echo.
echo For more help, visit: https://github.com/gelimorto2/A.A.I.T.I
echo.
pause
goto main_menu

REM Exit
:exit
echo.
echo Thank you for using A.A.I.T.I!
echo.
echo For support and documentation:
echo https://github.com/gelimorto2/A.A.I.T.I
echo.
pause
exit /b 0