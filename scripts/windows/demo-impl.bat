@echo off
setlocal enabledelayedexpansion

REM A.A.I.T.I Windows Demo Implementation  
REM This script contains the Windows-specific demo logic

echo.
echo ===================================================
echo  A.A.I.T.I v2.0.0 - Windows Demo
echo ===================================================
echo.

echo This demo provides a complete A.A.I.T.I experience
echo with sample data, perfect for evaluation and testing.
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is required for the demo.
    echo.
    echo Please install Docker Desktop for Windows:
    echo https://docs.docker.com/desktop/install/windows-install/
    echo.
    pause
    exit /b 1
)

echo [INFO] Docker Desktop detected
echo [INFO] Checking Docker service...

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not running.
    echo Please start Docker Desktop and try again.
    echo You can find it in the Start menu or system tray.
    pause
    exit /b 1
)

echo [INFO] Docker Desktop is running

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Using Docker Compose plugin...
    set COMPOSE_CMD=docker compose
) else (
    echo [INFO] Using docker-compose...
    set COMPOSE_CMD=docker-compose
)

echo.
echo [INFO] Preparing demo environment...

REM Clean up any existing containers
%COMPOSE_CMD% -f docker-compose.demo.yml down >nul 2>&1

echo [INFO] Starting demo services...
echo This may take a few minutes for the first run...

%COMPOSE_CMD% -f docker-compose.demo.yml up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start demo services.
    echo.
    echo Troubleshooting:
    echo - Ensure Docker Desktop is running
    echo - Check Windows Defender firewall settings  
    echo - Verify Docker Desktop has sufficient resources
    echo.
    echo Check logs with: %COMPOSE_CMD% -f docker-compose.demo.yml logs
    pause
    exit /b 1
)

echo.
echo [INFO] Waiting for services to start...
timeout /t 10 >nul

echo.
echo ====================================
echo  Demo Started Successfully!
echo ====================================
echo.
echo 🌐 Access Points:
echo   🎯 Main Dashboard: http://localhost:3000
echo   📊 Trading Interface: http://localhost:3000/trading
echo   🤖 ML Models: http://localhost:3000/models
echo   📈 Portfolio Analytics: http://localhost:3000/portfolio
echo   🔧 Backend API: http://localhost:5000
echo   ❤️  Health Check: http://localhost:5000/api/health
echo.
echo 🎮 Demo Features Available:
echo   • 6 months of realistic Bitcoin, Ethereum, and altcoin data
echo   • 16+ ML algorithms: ARIMA, SARIMA, Prophet, LSTM, SVM
echo   • Interactive trading simulations with paper trading
echo   • Real-time portfolio tracking and risk analysis
echo   • Performance backtesting with historical data
echo   • Market sentiment analysis and news integration
echo   • 5 pre-configured trading strategies ready to test
echo.
echo 📋 Windows Specific Tips:
echo   • Use Ctrl+click to open links in new tabs
echo   • Monitor resource usage in Docker Desktop
echo   • Demo works great with Edge, Chrome, and Firefox
echo   • Ensure Windows Defender allows Docker traffic
echo.
echo 📋 Troubleshooting:
echo   • View logs: %COMPOSE_CMD% -f docker-compose.demo.yml logs -f
echo   • Restart: %COMPOSE_CMD% -f docker-compose.demo.yml restart  
echo   • Check status: %COMPOSE_CMD% -f docker-compose.demo.yml ps
echo   • Stop demo: %COMPOSE_CMD% -f docker-compose.demo.yml down
echo.

set /p OPEN_BROWSER="Open demo in browser now? (Y/n): "
if /i not "%OPEN_BROWSER%"=="n" (
    echo Opening demo in default browser...
    timeout /t 3 >nul
    start http://localhost:3000
)

echo.
echo 🎉 Demo is ready! Happy trading!
echo.