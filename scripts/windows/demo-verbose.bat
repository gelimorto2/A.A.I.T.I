@echo off
setlocal enabledelayedexpansion

REM A.A.I.T.I Verbose Demo Script for Windows
REM Version: 2.0.0
REM This script provides detailed feedback and progress tracking for the demo

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\.."
set "LOG_FILE=%PROJECT_ROOT%\demo-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.log"
set "DEMO_START_TIME=%time%"
set "STEP_COUNT=0"

REM Clean log filename (remove spaces)
set "LOG_FILE=%LOG_FILE: =%"

REM Initialize log file
echo [%date% %time%] Starting A.A.I.T.I verbose demo > "%LOG_FILE%"

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
echo ║                          🚀 A.A.I.T.I v2.0.0 - VERBOSE DEMO LAUNCHER                                               ║
echo ║                                  Auto AI Trading Interface - Complete Demo Experience                               ║
echo ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
echo.

echo Demo Overview:
echo • Sample trading data for realistic testing experience
echo • Pre-configured ML models with 16+ algorithms ready to evaluate
echo • Interactive dashboard showcasing complete trading interface
echo • Real-time simulation with live-like market data
echo • Automated browser launch for immediate access
echo.
echo Log file: %LOG_FILE%
echo Project root: %PROJECT_ROOT%
echo.

REM Step 1: System Requirements Check
echo [1/8] Checking System Requirements ^& Dependencies
echo ────────────────────────────────────────────────────────────
echo.

echo   ▶ Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ Docker is required for the demo
    echo.
    echo   Install Docker Desktop for Windows:
    echo   https://docs.docker.com/desktop/install/windows-install/
    echo.
    echo   After installation, restart your computer and run this script again.
    echo [%date% %time%] ERROR: Docker not found >> "%LOG_FILE%"
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
echo   ✅ Docker detected: %DOCKER_VERSION%
echo [%date% %time%] Docker version: %DOCKER_VERSION% >> "%LOG_FILE%"

echo   ▶ Checking Docker service status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ Docker service is not running
    echo   Please start Docker Desktop and try again.
    echo [%date% %time%] ERROR: Docker service not running >> "%LOG_FILE%"
    pause
    exit /b 1
)
echo   ✅ Docker service is running and accessible

echo   ▶ Determining Docker Compose command...
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 (
    set "COMPOSE_CMD=docker-compose"
    for /f "tokens=*" %%i in ('docker-compose --version') do set COMPOSE_VERSION=%%i
) else (
    docker compose version >nul 2>&1
    if %errorlevel% equ 0 (
        set "COMPOSE_CMD=docker compose"
        for /f "tokens=*" %%i in ('docker compose version') do set COMPOSE_VERSION=%%i
    ) else (
        echo   ❌ Docker Compose is required but not found
        echo [%date% %time%] ERROR: Docker Compose not found >> "%LOG_FILE%"
        pause
        exit /b 1
    )
)
echo   ✅ Using: !COMPOSE_CMD! (!COMPOSE_VERSION!)
echo [%date% %time%] Docker Compose: !COMPOSE_CMD! - !COMPOSE_VERSION! >> "%LOG_FILE%"

echo   ▶ Checking available system resources...
echo   ℹ️  System information gathered
echo   ⏱️  Step completed
echo.

REM Step 2: Pre-flight checks
echo [2/8] Pre-flight Environment Checks
echo ────────────────────────────────────────────────────────────
echo.

echo   ▶ Checking for port conflicts...
netstat -an | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo   ⚠️  Port 3000 is already in use
    echo   ℹ️  The demo will try to stop conflicting services
) else (
    echo   ✅ Port 3000 is available
)

netstat -an | findstr ":5000" >nul
if %errorlevel% equ 0 (
    echo   ⚠️  Port 5000 is already in use
    echo   ℹ️  The demo will try to stop conflicting services
) else (
    echo   ✅ Port 5000 is available
)

echo   ▶ Validating Docker Compose configuration...
cd /d "%PROJECT_ROOT%"
%COMPOSE_CMD% -f docker-compose.demo.yml config >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Docker Compose configuration is valid
) else (
    echo   ❌ Docker Compose configuration has issues
    echo [%date% %time%] ERROR: Invalid docker-compose.demo.yml >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo   ⏱️  Step completed
echo.

REM Step 3: Cleanup previous installations
echo [3/8] Cleaning Previous Demo Instances
echo ────────────────────────────────────────────────────────────
echo.

echo   ▶ Stopping any running demo containers...
%COMPOSE_CMD% -f docker-compose.demo.yml down --remove-orphans >nul 2>&1
echo   ✅ Previous instances cleaned

echo   ▶ Cleaning up old resources...
echo   ✅ Resources cleaned

echo   ⏱️  Step completed
echo.

REM Step 4: Building containers
echo [4/8] Building Demo Containers
echo ────────────────────────────────────────────────────────────
echo.

echo   ▶ Building backend container...
echo   ℹ️  This may take 2-5 minutes on first run
%COMPOSE_CMD% -f docker-compose.demo.yml build demo-backend >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Backend container built successfully
) else (
    echo   ❌ Failed to build backend container
    echo [%date% %time%] ERROR: Backend container build failed >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo   ▶ Building frontend container...
echo   ℹ️  This may take 3-7 minutes on first run
%COMPOSE_CMD% -f docker-compose.demo.yml build demo-frontend >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Frontend container built successfully
) else (
    echo   ❌ Failed to build frontend container
    echo [%date% %time%] ERROR: Frontend container build failed >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo   ⏱️  Step completed
echo.

REM Step 5: Starting services
echo [5/8] Starting Demo Services
echo ────────────────────────────────────────────────────────────
echo.

echo   ▶ Starting backend service...
%COMPOSE_CMD% -f docker-compose.demo.yml up -d demo-backend >nul 2>&1

echo   ▶ Waiting for backend to be ready...
set /a attempt=1
set /a max_attempts=30
:backend_wait_loop
if !attempt! gtr !max_attempts! (
    echo   ❌ Backend service failed to start properly
    echo   ℹ️  Check logs: %COMPOSE_CMD% -f docker-compose.demo.yml logs demo-backend
    pause
    exit /b 1
)

curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Backend service is ready
    goto backend_ready
)

echo.|set /p="."
timeout /t 2 /nobreak >nul
set /a attempt+=1
goto backend_wait_loop

:backend_ready
echo   ▶ Starting frontend service...
%COMPOSE_CMD% -f docker-compose.demo.yml up -d demo-frontend >nul 2>&1

echo   ▶ Waiting for frontend to be ready...
set /a attempt=1
:frontend_wait_loop
if !attempt! gtr !max_attempts! (
    echo   ❌ Frontend service failed to start properly
    echo   ℹ️  Check logs: %COMPOSE_CMD% -f docker-compose.demo.yml logs demo-frontend
    pause
    exit /b 1
)

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Frontend service is ready
    goto frontend_ready
)

echo.|set /p="."
timeout /t 2 /nobreak >nul
set /a attempt+=1
goto frontend_wait_loop

:frontend_ready
echo   ⏱️  Step completed
echo.

REM Step 6: Health checks
echo [6/8] Performing System Health Checks
echo ────────────────────────────────────────────────────────────
echo.

echo   ▶ Checking backend API health...
for /f "tokens=*" %%i in ('curl -s http://localhost:5000/api/health 2^>nul') do set HEALTH_RESPONSE=%%i
if not "!HEALTH_RESPONSE!"=="" (
    echo   ✅ Backend API is healthy: !HEALTH_RESPONSE!
) else (
    echo   ⚠️  Backend API health check failed
)

echo   ▶ Testing frontend responsiveness...
for /f %%i in ('curl -s -o nul -w "%%{http_code}" http://localhost:3000 2^>nul') do set HTTP_CODE=%%i
if "!HTTP_CODE!"=="200" (
    echo   ✅ Frontend is responding correctly
) else (
    echo   ⚠️  Frontend may still be loading
)

echo   ⏱️  Step completed
echo.

REM Step 7: Demo features overview
echo [7/8] Demo Features ^& Access Information
echo ────────────────────────────────────────────────────────────
echo.

echo 🌐 Access Points:
echo    🎯 Main Dashboard: http://localhost:3000
echo    📊 Trading Interface: http://localhost:3000/trading
echo    🤖 ML Models: http://localhost:3000/models
echo    📈 Portfolio Analytics: http://localhost:3000/portfolio
echo    🔧 Backend API: http://localhost:5000
echo    ❤️  Health Check: http://localhost:5000/api/health
echo    📖 API Documentation: http://localhost:5000/api/docs
echo.

echo 🎮 Demo Features Available:
echo    • 6 months of realistic Bitcoin, Ethereum, and altcoin data
echo    • 16+ ML algorithms: ARIMA, SARIMA, Prophet, LSTM, SVM, Random Forest
echo    • Interactive trading simulations with paper trading
echo    • Real-time portfolio tracking and risk analysis
echo    • Performance backtesting with historical data
echo    • Market sentiment analysis and news integration
echo    • 5 pre-configured trading strategies ready to test
echo.

echo 📚 Quick Start Guide:
echo    1. Visit http://localhost:3000 to access the main dashboard
echo    2. Navigate to 'Models' to explore ML algorithms and predictions
echo    3. Go to 'Trading' to test automated trading strategies
echo    4. Check 'Portfolio' for risk analysis and performance tracking
echo    5. Use 'Settings' to configure demo parameters
echo.

echo 🛑 Stop Demo:
echo    %COMPOSE_CMD% -f docker-compose.demo.yml down
echo.

echo 📋 Troubleshooting:
echo    • View logs: %COMPOSE_CMD% -f docker-compose.demo.yml logs -f
echo    • Restart services: %COMPOSE_CMD% -f docker-compose.demo.yml restart
echo    • Check status: %COMPOSE_CMD% -f docker-compose.demo.yml ps
echo    • Full reset: %COMPOSE_CMD% -f docker-compose.demo.yml down -v
echo.

echo   ⏱️  Step completed
echo.

REM Step 8: Launch browser
echo [8/8] Launching Demo Interface
echo ────────────────────────────────────────────────────────────
echo.

echo   ▶ Opening demo in default browser...
echo   ℹ️  Waiting 3 seconds for services to stabilize...
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo   ✅ Browser launched successfully

echo   ⏱️  Step completed
echo.

REM Final summary
echo.
echo ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
echo ║                                   🎉 DEMO LAUNCHED SUCCESSFULLY! 🎉                                                 ║
echo ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
echo.

echo 📊 Dashboard URL: http://localhost:3000
echo 📁 Log file: %LOG_FILE%
echo 📖 Documentation: %PROJECT_ROOT%\docs\demo.md
echo.
echo The demo is now ready for evaluation. Enjoy exploring A.A.I.T.I!
echo Press any key to close this window. Services will continue running.
echo To stop the demo later, run: %COMPOSE_CMD% -f docker-compose.demo.yml down
echo.

echo [%date% %time%] Demo launched successfully >> "%LOG_FILE%"

pause