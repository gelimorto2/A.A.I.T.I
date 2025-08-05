@echo off
echo.
echo ==========================================
echo  A.A.I.T.I Demo - Quick Start
echo ==========================================
echo.
echo This demo requires minimal setup and runs
echo with sample data for evaluation purposes.
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is required for the demo.
    echo Download: https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

echo [INFO] Starting demo environment...
docker-compose -f docker-compose.demo.yml down
docker-compose -f docker-compose.demo.yml up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start demo. Check Docker Desktop is running.
    pause
    exit /b 1
)

echo.
echo ====================================
echo  Demo Started Successfully!
echo ====================================
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000
echo Health Check: http://localhost:5000/api/health
echo.
echo Features in Demo:
echo - Sample trading data
echo - ML model demonstrations  
echo - Dashboard interface
echo - Basic trading simulations
echo.
echo To stop demo: docker-compose -f docker-compose.demo.yml down
echo.
echo Opening demo in browser...
timeout /t 3 >nul
start http://localhost:3000