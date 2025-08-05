@echo off
setlocal enabledelayedexpansion

REM A.A.I.T.I Windows Installation Implementation
REM This script contains the Windows-specific installation logic

echo.
echo ===================================================
echo  A.A.I.T.I v2.0.0 - Windows Installation
echo ===================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo.
    echo Please install Docker Desktop for Windows:
    echo https://docs.docker.com/desktop/install/windows-install/
    echo.
    echo After installation, restart your computer and run this script again.
    pause
    exit /b 1
)

echo [INFO] Docker detected. Checking Docker service...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker service is not running.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [INFO] Docker is running. Starting A.A.I.T.I installation...
echo.

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] docker-compose not found, using docker compose plugin...
    set COMPOSE_CMD=docker compose
) else (
    set COMPOSE_CMD=docker-compose
)

REM Installation type selection
echo Choose Installation Type:
echo 1) Production (recommended for live trading)
echo 2) Development (for testing and development)
echo 3) Fast Install (skip some optimizations)
echo.
set /p INSTALL_TYPE="Enter your choice (1-3): "

if "%INSTALL_TYPE%"=="1" (
    set PROFILE=production
    echo [INFO] Production installation selected
) else if "%INSTALL_TYPE%"=="2" (
    set PROFILE=development
    echo [INFO] Development installation selected
) else if "%INSTALL_TYPE%"=="3" (
    set PROFILE=fast
    echo [INFO] Fast installation selected
) else (
    echo [ERROR] Invalid selection
    pause
    exit /b 1
)

echo [INFO] Building and starting A.A.I.T.I services...
%COMPOSE_CMD% down
%COMPOSE_CMD% build --no-cache
%COMPOSE_CMD% up -d

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services. Check the logs:
    echo %COMPOSE_CMD% logs
    pause
    exit /b 1
)

echo.
echo ========================================
echo  A.A.I.T.I Installation Complete! 
echo ========================================
echo.
echo Dashboard: http://localhost:5000
echo API Health: http://localhost:5000/api/health
echo.
echo Windows Specific Information:
echo - Use Ctrl+C to stop services
echo - Logs available in Docker Desktop
echo - Ensure Windows Defender allows Docker
echo.
echo Management Commands:
echo   Stop:     %COMPOSE_CMD% down
echo   Restart:  %COMPOSE_CMD% up -d
echo   Logs:     %COMPOSE_CMD% logs -f
echo.
echo Press any key to open the dashboard...
pause >nul
start http://localhost:5000