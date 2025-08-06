@echo off
REM A.A.I.T.I Windows Installation Script
REM Basic Windows support for Docker-based installation

echo ===============================================
echo  A.A.I.T.I v2.0.0 - Windows Installation
echo ===============================================
echo.

echo WARNING: This is basic Windows support.
echo For best experience, use WSL2 or Docker Desktop.
echo.

REM Check if Docker is available
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo.
    echo Please install Docker Desktop for Windows:
    echo https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo Docker found. Checking if Docker is running...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not running
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo Docker is running. Starting A.A.I.T.I installation...
echo.

REM Build and start with Docker Compose
echo Building Docker images...
docker compose build

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build Docker images
    pause
    exit /b 1
)

echo Starting services...
docker compose up -d

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

echo.
echo ===============================================
echo  Installation Complete!
echo ===============================================
echo.
echo A.A.I.T.I is now running at:
echo http://localhost:5000
echo.
echo To manage the application:
echo - Stop: docker compose down
echo - Restart: docker compose restart
echo - View logs: docker compose logs -f
echo.
echo Press any key to open the application...
pause >nul

REM Try to open browser (Windows 10/11)
start http://localhost:5000

exit /b 0