@echo off
echo.
echo ===================================================
echo  A.A.I.T.I v2.0.0 - Windows Installation Script
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
echo To stop: %COMPOSE_CMD% down
echo To restart: %COMPOSE_CMD% up -d
echo To view logs: %COMPOSE_CMD% logs -f
echo.
echo Press any key to open the dashboard...
pause >nul
start http://localhost:5000